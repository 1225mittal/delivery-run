import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { DeliveryBoy } from '@/types';

export type StoredAgent = Omit<DeliveryBoy, 'pin'>;

interface AuthContextValue {
  agent: StoredAgent | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'delivery_run_agent';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<StoredAgent | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) as StoredAgent : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (phone: string, pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('delivery_boys')
        .select('id, name, phone, pin, is_active, created_at')
        .eq('phone', phone)
        .eq('pin', pin)
        .eq('is_active', true)
        .maybeSingle();

      if (queryError) throw queryError;
      if (!data) {
        setError('Invalid phone number or PIN. Please try again.');
        return;
      }

      const { pin: _pin, ...agentData } = data;
      void _pin;
      const stored: StoredAgent = agentData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setAgent(stored);
    } catch {
      setError('Unable to sign in. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAgent(null);
  }, []);

  return (
    <AuthContext.Provider value={{ agent, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
