import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, clearSession, saveSession, authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) setUser(session.user);
    setLoading(false);

    const interval = setInterval(() => {
      if (!getSession() && user) { setUser(null); window.location.href = '/login'; }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback((token, userData) => { saveSession(token, userData); setUser(userData); }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(prev => {
      const next = { ...prev, ...updated };
      const session = getSession();
      if (session) saveSession(session.token, next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
