import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem('pocketbook_token')) {
        await api.post('/auth/logout');
      }
    } catch {
      // Token may already be expired; clear local state anyway.
    }
    localStorage.removeItem('pocketbook_token');
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    const token = localStorage.getItem('pocketbook_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('pocketbook_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('pocketbook_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('pocketbook_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
