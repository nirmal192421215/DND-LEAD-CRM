// eslint-disable-next-line react/only-export-components -- context files intentionally export hooks
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';
import type { User } from '@bind-build/shared';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPrincipal: boolean;
  isSales: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    try {
      const r = await api.get('/auth/me');
      setUser(r.data.data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { await api.post('/auth/logout', { refreshToken }); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const refreshUser = async () => {
    const r = await api.get('/auth/me');
    setUser(r.data.data);
  };

  const isPrincipal = user?.role === 'PRINCIPAL';
  const isSales = user?.role === 'SALES';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, isPrincipal, isSales, isAdmin, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
