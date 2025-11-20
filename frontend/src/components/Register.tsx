import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts';
import { ROUTES } from '../config/constants';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('Регистрирую...');
    setIsError(false);

    try {
      await register({
        email,
        password,
        full_name: fullName || undefined,
      });
      setStatus('Успешно! Перенаправляю...');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось зарегистрироваться';
      if (message.includes('fetch') || message.includes('Ошибка')) {
        setStatus('Сервер недоступен. Проверьте запуск backend.');
      } else {
        setStatus(message);
      }
      setIsError(true);
    }
  };

  return (
    <section className="card auth-only">
      <form onSubmit={handleSubmit}>
        <h2>Создать аккаунт</h2>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Введите email"
          />
        </label>
        <label>
          Логин
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Введите логин"
          />
        </label>
        <label>
          Пароль (мин. 6 символов)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Введите пароль"
          />
        </label>
        <button type="submit">Зарегистрироваться</button>
        <p className="form-status" style={{ color: isError ? '#dc2626' : '#475569' }}>
          {status}
        </p>
        <p className="hint">
          Уже есть аккаунт? <span> </span>
          <Link to={ROUTES.LOGIN}>Войти</Link>
        </p>
      </form>
    </section>
  );
};

