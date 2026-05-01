import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../lib/api';

// Função utilitária para converter a chave VAPID public de Base64 para Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Verifica se já existe uma subscription ativa
  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error('Erro ao verificar subscription:', e);
    }
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [checkSubscription]);

  const subscribeUser = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Notificações não são suportadas neste navegador.');
    }

    try {
      setIsSubscribing(true);
      
      // Pedir permissão explicitamente
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        throw new Error('Permissão de notificação negada.');
      }

      // Garante que o SW está registrado e pronto
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      
      await navigator.serviceWorker.ready;

      // Pegar a chave pública do .env
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error('Chave VAPID pública não configurada no cliente.');
      }
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // Enviar para o nosso servidor usando o helper autenticado authFetch
      const response = await authFetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar inscrição no servidor.');
      }

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Erro ao subscrever:', error);
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  return {
    permission,
    isSubscribing,
    isSubscribed,
    subscribeUser,
    checkSubscription
  };
}
