import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const next = {};
    if (!email.trim()) next.email = 'Enter your email.';
    if (!password) next.password = 'Enter your password.';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      setServerError(err.response?.data?.message || 'Could not log in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card stack">
        <div>
          <div className="brand">Pocketbook</div>
          <h1 style={{ fontSize: 'var(--text-xl)', marginTop: '8px' }}>Log in</h1>
        </div>
        {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="text-muted" style={{ margin: 0 }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
