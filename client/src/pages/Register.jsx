import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const next = {};
    if (!name.trim()) next.name = 'Enter your name.';
    if (!email.trim()) next.email = 'Enter your email.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/');
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      setServerError(err.response?.data?.message || 'Could not create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card stack">
        <div>
          <div className="brand">Pocketbook</div>
          <h1 style={{ fontSize: 'var(--text-xl)', marginTop: '8px' }}>Create account</h1>
        </div>
        {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="reg-name">Name</label>
            <input id="reg-name" className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="reg-password">Password (min 8 characters)</label>
            <input id="reg-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-muted" style={{ margin: 0 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
