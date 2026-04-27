import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Terms } from './pages/Terms.tsx';
import { Privacy } from './pages/Privacy.tsx';
import { SharedNoteView } from './pages/SharedNoteView.tsx';
import { initAnalytics } from './utils/analytics.ts';
import './i18n'; // Inicializa i18n (tarefa 3.6.1)
import * as Sentry from "@sentry/react";

// Inicializa Sentry (tarefa 3.5.3)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Inicializa rastreamento global de analytics
initAnalytics();

// AuthProvider envolve todo o app — disponibiliza useAuth() em qualquer componente
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/shared/:token" element={<SharedNoteView />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
