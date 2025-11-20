import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import { apiService } from '../services';
import type { Item } from '../types';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState('Загрузка...');
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setStatus('Получаю элементы...');

    try {
      const data = await apiService.getItems();
      setItems(data);
      setStatus(`Получено элементов: ${data.length}`);
    } catch (error) {
      console.error(error);
      setStatus('Не удалось загрузить данные. Проверьте соединение или авторизацию.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <>
      <section className="card">
        <div className="home-header">
          <div>
            <p className="eyebrow">Добро пожаловать</p>
            <h2>{user?.full_name || user?.email || 'Пользователь'}</h2>
          </div>
          <button onClick={fetchItems} className="secondary" disabled={loading}>
            Обновить данные
          </button>
        </div>
        <div id="items-section">
          <h3>Данные из бекенда</h3>
          <p id="status">{status}</p>
          <ul id="items-list">
            {items.length === 0 ? (
              <li>Пусто</li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  {item.id}: {item.name ?? 'Без названия'}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </>
  );
};

