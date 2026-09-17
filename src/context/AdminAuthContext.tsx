import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { StoredAdmin } from '@/types';

interface AdminAuthContextValue {
  admin: StoredAdmin | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'delivery_run_admin';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<StoredAdmin | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) as StoredAdmin : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('admins')
        .select('id, username, password, display_name, created_at')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (queryError) throw queryError;
      if (!data) {
        setError('Invalid username or password.');
        return;
      }

      const { password: _pw, ...adminData } = data;
      void _pw;
      const stored: StoredAdmin = adminData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setAdmin(stored);
    } catch {
      setError('Unable to sign in. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, error, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
