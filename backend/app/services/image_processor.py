import numpy as np
import cv2
from io import BytesIO
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image
import onnxruntime as ort


class ImageProcessor:
    """Класс для обработки изображений через ONNX модель"""
    
    def __init__(self, model_path: Optional[Path] = None):
        """
        Инициализация процессора изображений
        
        Args:
            model_path: Путь к ONNX модели. Если None, используется путь по умолчанию.
        """
        if model_path is None:
            # Путь к модели относительно корня проекта
            root_dir = Path(__file__).parent.parent.parent.parent
            model_path = root_dir / "ai" / "best.onnx"
        
        if not model_path.exists():
            raise FileNotFoundError(f"Модель не найдена: {model_path}")
        
        # Определяем провайдер (CUDA если доступно, иначе CPU)
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        try:
            self.session = ort.InferenceSession(str(model_path), providers=providers)
        except Exception as e:
            # Если CUDA недоступен, используем только CPU
            self.session = ort.InferenceSession(str(model_path), providers=['CPUExecutionProvider'])
        
        # Получаем размер входного изображения из модели
        input_shape = self.session.get_inputs()[0].shape
        self.input_height = input_shape[2] if len(input_shape) > 2 else 640
        self.input_width = input_shape[3] if len(input_shape) > 3 else 640
    
    def preprocess_image(self, image: Image.Image) -> Tuple[np.ndarray, Tuple[int, int], float, Tuple[int, int, int, int]]:
        """
        Предобработка изображения для модели
        
        Args:
            image: PIL изображение
            
        Returns:
            Tuple содержащий:
            - preprocessed: предобработанное изображение (numpy array)
            - orig_size: оригинальный размер (width, height)
            - scale: коэффициент масштабирования
            - padding: (left, top, right, bottom)
        """
        orig_size = image.size  # (width, height)
        img_w, img_h = orig_size
        
        # Вычисляем масштаб для сохранения пропорций
        scale = min(self.input_width / img_w, self.input_height / img_h)
        new_w = int(img_w * scale)
        new_h = int(img_h * scale)
        
        # Изменяем размер изображения
        resized = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Создаем новое изображение с padding (серый фон)
        padded = Image.new('RGB', (self.input_width, self.input_height), (128, 128, 128))
        
        # Вычисляем отступы для центрирования
        left_pad = (self.input_width - new_w) // 2
        top_pad = (self.input_height - new_h) // 2
        right_pad = self.input_width - new_w - left_pad
        bottom_pad = self.input_height - new_h - top_pad
        
        # Вставляем изображение в центр
        padded.paste(resized, (left_pad, top_pad))
        
        # Конвертируем в numpy array и нормализуем
        img_array = np.array(padded, dtype=np.float32)
        img_array = img_array / 255.0  # Нормализация в диапазон [0, 1]
        
        # Транспонируем в формат CHW (channels, height, width)
        img_array = np.transpose(img_array, (2, 0, 1))
        
        # Добавляем batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array, orig_size, scale, (left_pad, top_pad, right_pad, bottom_pad)
    
    def process_image(self, image_bytes: bytes) -> dict:
        """
        Обрабатывает изображение через ONNX модель и рисует детекции
        
        Args:
            image_bytes: Байты изображения
            
        Returns:
            bytes: Байты обработанного изображения с нарисованными детекциями
        """
        # Загружаем изображение
        image = Image.open(BytesIO(image_bytes))
        original_size = image.size  # (width, height)
        
        # Предобрабатываем изображение
        preprocessed, orig_size, scale, padding = self.preprocess_image(image)
        
        # Запускаем инференс
        input_name = self.session.get_inputs()[0].name
        outputs = self.session.run(None, {input_name: preprocessed})
        
        # Конвертируем изображение в OpenCV формат для рисования
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        img_w, img_h = original_size
        
        # YOLO ONNX модели возвращают raw predictions
        predictions = outputs[0] if len(outputs) > 0 else None
        
        batch_detections = []
        
        if predictions is not None and len(predictions.shape) == 3:
            # Формат: (batch, num_features, num_anchors)
            batch_size, num_features, num_anchors = predictions.shape
            
            # Извлекаем batch (обычно batch=1)
            pred = predictions[0]  # Форма: (num_features, num_anchors)
            
            # Разделяем на bbox координаты и классы
            bbox_coords = pred[:4]  # Форма: (4, num_anchors)
            class_scores = pred[4:]  # Форма: (num_classes, num_anchors)
            
            # Преобразуем в формат (num_anchors, 4) и (num_anchors, num_classes)
            bbox_coords = bbox_coords.transpose(1, 0)  # (num_anchors, 4)
            class_scores = class_scores.transpose(1, 0)  # (num_anchors, num_classes)
            
            # Находим лучший класс для каждого якоря
            class_ids = np.argmax(class_scores, axis=1)  # (num_anchors,)
            confidences = np.max(class_scores, axis=1)  # (num_anchors,)
            
            # Фильтруем по порогу уверенности (conf=0.25)
            conf_threshold = 0.25
            valid_mask = confidences > conf_threshold
            valid_indices = np.where(valid_mask)[0]
            
            if len(valid_indices) > 0:
                # Берем только валидные детекции
                valid_bboxes = bbox_coords[valid_indices]  # (N, 4)
                valid_class_ids = class_ids[valid_indices]  # (N,)
                valid_confidences = confidences[valid_indices]  # (N,)
                
                # Определяем, нормализованы ли координаты
                max_coord = np.max(np.abs(valid_bboxes))
                is_normalized = max_coord <= 1.0
                
                if is_normalized:
                    # Координаты нормализованные (0-1), умножаем на размер изображения
                    x_center = valid_bboxes[:, 0] * self.input_width
                    y_center = valid_bboxes[:, 1] * self.input_height
                    width = valid_bboxes[:, 2] * self.input_width
                    height = valid_bboxes[:, 3] * self.input_height
                else:
                    # Координаты уже абсолютные
                    x_center = valid_bboxes[:, 0]
                    y_center = valid_bboxes[:, 1]
                    width = valid_bboxes[:, 2]
                    height = valid_bboxes[:, 3]
                
                # Преобразуем из [center_x, center_y, width, height] в [x1, y1, x2, y2]
                x1 = x_center - width / 2
                y1 = y_center - height / 2
                x2 = x_center + width / 2
                y2 = y_center + height / 2
                
                # Формируем массив для NMS
                boxes = np.column_stack([x1, y1, x2, y2]).astype(np.float32)
                scores = valid_confidences.astype(np.float32)
                
                # Применяем NMS (iou=0.45)
                try:
                    indices = cv2.dnn.NMSBoxes(
                        boxes.tolist(),
                        scores.tolist(),
                        score_threshold=conf_threshold,
                        nms_threshold=0.45
                    )
                    
                    if indices is not None and len(indices) > 0:
                        # NMS может вернуть tuple или numpy array
                        if isinstance(indices, tuple):
                            indices = indices[0]
                        indices = indices.flatten()
                        
                        # Обрабатываем детекции после NMS
                        left_pad, top_pad, right_pad, bottom_pad = padding
                        
                        for idx in indices:
                            idx = int(idx)
                            if 0 <= idx < len(boxes):
                                # Координаты на изображении 640x640 (до обрезки)
                                x1_640_raw, y1_640_raw, x2_640_raw, y2_640_raw = boxes[idx]
                                
                                # Область изображения на 640x640 (без padding)
                                img_x1 = left_pad
                                img_y1 = top_pad
                                img_x2 = self.input_width - right_pad
                                img_y2 = self.input_height - bottom_pad
                                
                                # Проверяем, пересекается ли детекция с областью изображения
                                if x2_640_raw < img_x1 or x1_640_raw > img_x2 or y2_640_raw < img_y1 or y1_640_raw > img_y2:
                                    continue
                                
                                # Обрезаем координаты до области изображения
                                x1_640 = max(img_x1, x1_640_raw)
                                y1_640 = max(img_y1, y1_640_raw)
                                x2_640 = min(img_x2, x2_640_raw)
                                y2_640 = min(img_y2, y2_640_raw)
                                
                                # Проверяем, что после обрезки детекция валидна
                                if x2_640 <= x1_640 or y2_640 <= y1_640:
                                    continue
                                
                                # Убираем padding
                                x1_640 -= left_pad
                                y1_640 -= top_pad
                                x2_640 -= left_pad
                                y2_640 -= top_pad
                                
                                # Проверяем, что координаты валидны после удаления padding
                                if x2_640 <= x1_640 or y2_640 <= y1_640:
                                    continue
                                
                                # Масштабируем обратно на оригинальный размер
                                x1_orig = x1_640 / scale
                                y1_orig = y1_640 / scale
                                x2_orig = x2_640 / scale
                                y2_orig = y2_640 / scale
                                
                                # Проверяем финальные координаты
                                if x2_orig <= x1_orig or y2_orig <= y1_orig:
                                    continue
                                
                                batch_detections.append({
                                    'bbox': [x1_orig, y1_orig, x2_orig, y2_orig],
                                    'conf': float(scores[idx]),
                                    'class_id': int(valid_class_ids[idx])
                                })
                except Exception as e:
                    print(f"❌ Ошибка в NMS: {e}")
        
        # Названия классов
        class_names = {
            0: "vibration_damper",
            1: "festoon_insulators",
            2: "traverse",
            3: "nest",
            4: "safety_sign+",
            5: "bad_insulator",
            6: "damaged_insulator",
            7: "polymer_insulators"
        }
        
        # Отрисовываем детекции на оригинальном изображении
        for detection in batch_detections:
            bbox = detection['bbox']
            conf = detection['conf']
            class_id = detection['class_id']
            
            x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
            
            # Ограничиваем координаты границами изображения
            x1 = max(0, min(int(x1), img_w - 1))
            y1 = max(0, min(int(y1), img_h - 1))
            x2 = max(0, min(int(x2), img_w - 1))
            y2 = max(0, min(int(y2), img_h - 1))
            
            # Пропускаем если прямоугольник слишком маленький или некорректный
            if x2 <= x1 or y2 <= y1:
                continue
            
            # Проверяем минимальный размер детекции (хотя бы 5 пикселей)
            if (x2 - x1) < 5 or (y2 - y1) < 5:
                continue
            
            # Выбираем цвет в зависимости от класса (красный для повреждений)
            if class_id in [5, 6]:  # bad_insulator, damaged_insulator
                color = (0, 0, 255)  # Красный
                thickness = 3
            else:
                color = (0, 255, 0)  # Зеленый
                thickness = 2
            
            # Рисуем прямоугольник
            cv2.rectangle(img_cv, (int(x1), int(y1)), (int(x2), int(y2)), color, thickness)
            
            # Добавляем текст с классом и уверенностью
            class_name = class_names.get(class_id, f"Class {class_id}")
            label = f"{class_name}: {conf:.2f}"
            
            # Размер шрифта адаптивный к размеру изображения
            font_scale = max(0.5, min(img_w / 1000, 1.0))
            thickness_text = max(1, int(font_scale * 2))
            
            # Фон для текста
            (text_width, text_height), baseline = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness_text
            )
            
            # Убеждаемся, что текст не выходит за границы изображения
            text_y = max(text_height + baseline + 5, int(y1))
            text_x = int(x1)
            
            cv2.rectangle(
                img_cv,
                (text_x, text_y - text_height - baseline - 5),
                (text_x + text_width, text_y),
                color,
                -1
            )
            cv2.putText(
                img_cv, label, (text_x, text_y - baseline - 3),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), thickness_text
            )
        
        # Конвертируем обратно в PIL и затем в байты
        img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        processed_image = Image.fromarray(img_rgb)
        
        # Подсчитываем дефекты (классы 5 и 6: bad_insulator, damaged_insulator) - красные детекции
        red_detections = [det for det in batch_detections if det['class_id'] in [5, 6]]
        red_count = len(red_detections)
        has_red_detections = red_count > 0
        
        # Подсчитываем зеленые детекции (все остальные классы: 0-4, 7)
        green_detections = [det for det in batch_detections if det['class_id'] not in [5, 6]]
        green_count = len(green_detections)
        has_green_detections = green_count > 0
        
        # Сохраняем в байты
        output_buffer = BytesIO()
        processed_image.save(output_buffer, format='JPEG', quality=95)
        
        # Возвращаем обработанное изображение и статистику
        return {
            'image_bytes': output_buffer.getvalue(),
            'red_detection_count': red_count,
            'green_detection_count': green_count,
            'has_red_detections': has_red_detections,
            'has_green_detections': has_green_detections,
            'total_detections': len(batch_detections)
        }
    
    def is_image_file(self, filename: str) -> bool:
        """Проверяет, является ли файл изображением"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'}
        return any(filename.lower().endswith(ext) for ext in image_extensions)


# Глобальный экземпляр процессора (singleton)
_image_processor: Optional[ImageProcessor] = None
_processor_error: Optional[str] = None


def get_image_processor() -> ImageProcessor:
    """Получить глобальный экземпляр процессора изображений"""
    global _image_processor, _processor_error
    
    if _image_processor is None and _processor_error is None:
        try:
            _image_processor = ImageProcessor()
        except Exception as e:
            _processor_error = str(e)
            raise RuntimeError(f"Не удалось инициализировать процессор изображений: {e}")
    
    if _processor_error:
        raise RuntimeError(f"Ошибка процессора изображений: {_processor_error}")
    
    return _image_processor

