import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authService, AuthUser } from '../services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  adminLogin: (email: string, password: string, companyCode: string) => Promise<AuthUser>;
  register: (data: {
    email: string;
    nom_complet: string;
    numero_telephone: string;
    password: string;
    date_naissance: string;
  }) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.currentUser());
  const [loading, setLoading] = useState<boolean>(authService.isAuthenticated() && !user);

  // Si on a un token mais pas d'info user en cache, on tente /auth/me au mount.
  useEffect(() => {
    let cancelled = false;
    if (authService.isAuthenticated() && !user) {
      setLoading(true);
      authService.me()
        .then(u => { if (!cancelled) setUser(u); })
        .catch(() => { authService.logout(); if (!cancelled) setUser(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await authService.login(username, password);
    setUser(u);
    return u;
  }, []);

  const adminLogin = useCallback(async (email: string, password: string, companyCode: string) => {
    const u = await authService.adminLogin(email, password, companyCode);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data: any) => {
    const u = await authService.register(data);
    return u;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!authService.isAuthenticated()) return;
    const u = await authService.me();
    setUser(u);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    adminLogin,
    register,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
