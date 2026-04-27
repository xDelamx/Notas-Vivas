import posthog from 'posthog-js';

// Inicialização segura apenas se houver uma chave
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;

export const initAnalytics = () => {
  if (POSTHOG_KEY && typeof window !== 'undefined') {
    posthog.init(POSTHOG_KEY, {
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      autocapture: false, // Nós decidiremos manual quais cliques trackear para mais controle
      capture_pageview: true,
      capture_pageleave: true,
    });
  }
};

export const identifyUser = (userId: string, email?: string) => {
  if (POSTHOG_KEY) {
    posthog.identify(userId, {
      email,
    });
  }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (POSTHOG_KEY) {
    posthog.capture(eventName, properties);
  } else {
    // Log para desenvolvimento
    console.debug(`[Analytics] ${eventName}`, properties);
  }
};
