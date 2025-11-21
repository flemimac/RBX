import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { ROUTES } from '../../config/constants';
import './Login.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('Выполняю вход...');
    setIsError(false);

    try {
      await login({ email, password });
      setStatus('Успешно!');
      setEmail('');
      setPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неверные данные';
      if (message.includes('fetch') || message.includes('Ошибка')) {
        setStatus('Сервер недоступен. Убедитесь, что backend запущен.');
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
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              required
            />
          </label>
          <button type="submit">Войти</button>
          {status && (
            <p className={`auth-status ${isError ? 'error' : 'success'}`}>
              {status}
            </p>
          )}
          <p className="auth-hint">
            Нет аккаунта? <Link to={ROUTES.REGISTER}>Зарегистрируйтесь</Link>
          </p>
        </form>
      </section>
    </div>
  );
};

