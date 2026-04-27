import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export interface UserSettings {
  whatsapp_number: string;
  onboarded: boolean;
  vivas_plan: 'free' | 'pro';
  language: string;
}

export function useSettings() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({ whatsapp_number: '', onboarded: false, vivas_plan: 'free', language: 'pt-BR' });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const res = await authFetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          whatsapp_number: data.whatsapp_number || '',
          onboarded: data.onboarded || false,
          vivas_plan: data.vivas_plan || 'free',
          language: data.language || 'pt-BR',
          stripe_customer_id: data.stripe_customer_id || undefined
        } as any);
      }
    } catch (err) {
      console.error('Erro ao carregar settings:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      setSettings(prev => ({ ...prev, ...newSettings }));
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações');
    } catch (err) {
      console.error('Erro ao salvar settings:', err);
      fetchSettings(); // reverte
    }
  };

  return { settings, loading, updateSettings };
}
