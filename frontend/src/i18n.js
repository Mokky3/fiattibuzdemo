import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          title: 'AKFA MEDLINE',
          subtitle: 'Patient Portal',
          signIn: 'Sign In',
          signUp: 'Patient Sign Up'
        },
      },
      uz: {
        translation: {
          title: 'AKFA MEDLINE',
          subtitle: 'Bemor Portali',
          signIn: 'Kirish',
          signUp: "Bemor Ro'yxatdan O'tish"
        },
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
