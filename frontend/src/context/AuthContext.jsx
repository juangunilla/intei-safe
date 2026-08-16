import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    authService.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const { data } = await authService.getMe();
        if (!active) return;
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        if (active) logout();
      }
    };
    restoreSession().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [logout]);

  const login = async (email, password) => {
    const { data } = await authService.login(email, password);
    localStorage.removeItem('token');
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await authService.register(name, email, password);
    localStorage.removeItem('token');
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const isAdmin = useCallback(() => user?.role?.name === 'admin', [user]);
  const value = useMemo(() => ({ user, loading, login, register, logout, isAdmin }), [user, loading, logout, isAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
