import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts';
import { ROUTES } from '../config/constants';

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
    <section className="card auth-only">
      <form onSubmit={handleSubmit}>
        <h2>Вход</h2>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">Войти</button>
        <p className="form-status" style={{ color: isError ? '#dc2626' : '#475569' }}>
          {status}
        </p>
        <p className="hint">
          Нет аккаунта?<span> </span>
          <Link to={ROUTES.REGISTER}>Зарегистрируйтесь</Link>
        </p>
      </form>
    </section>
  );
};

