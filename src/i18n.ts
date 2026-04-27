import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import datasets diretamente para evitar problemas de fetch em ambientes de dev/prod iniciais
// Em apps maiores, usamos i18next-http-backend
import pt from '../public/locales/pt/translation.json';
import en from '../public/locales/en/translation.json';
import es from '../public/locales/es/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es }
    },
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false // react já protege contra xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
