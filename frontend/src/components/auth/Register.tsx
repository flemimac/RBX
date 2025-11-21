import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { ROUTES } from '../../config/constants';
import './Register.css';

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
    <div className="auth-container">
      <section className="auth-card">
        <form onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </label>
          <label>
            <span>Логин</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Логин"
            />
          </label>
          <label>
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              required
              minLength={6}
            />
          </label>
          <button type="submit">Зарегистрироваться</button>
          {status && (
            <p className={`auth-status ${isError ? 'error' : 'success'}`}>
              {status}
            </p>
          )}
          <p className="auth-hint">
            Уже есть аккаунт? <Link to={ROUTES.LOGIN}>Войти</Link>
          </p>
        </form>
      </section>
    </div>
  );
};

