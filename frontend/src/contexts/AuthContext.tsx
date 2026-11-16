import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthUser } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('si_user');
      if (!stored || stored === 'undefined' || stored === 'null') {
        localStorage.removeItem('si_user');
        return null;
      }
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        if (parsed.role) {
          parsed.role = parsed.role.replace(/^ROLE_/, '');
        }
        return parsed;
      }
      return null;
    } catch {
      localStorage.removeItem('si_user');
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('si_token');
    if (!stored || stored === 'undefined' || stored === 'null') {
      localStorage.removeItem('si_token');
      return null;
    }
    return stored;
  });

  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login({ username, password });
      if (res?.accessToken && res?.user) {
        localStorage.setItem('si_token', res.accessToken);
        localStorage.setItem('si_user', JSON.stringify(res.user));
        setToken(res.accessToken);
        setUser(res.user);
      } else {
        throw new Error('Respon login tidak valid dari server.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('si_token');
      localStorage.removeItem('si_user');
      setToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
