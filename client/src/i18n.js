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
          sos: {
            name: 'Name',
            phone: 'Phone Number',
            relationship: 'Relationship',
            save: 'Save Contact',
            cancel: 'Cancel',
            message: 'Emergency Message (Optional)',
            placeholder_name: 'e.g. Govind Kumar',
            placeholder_phone: 'e.g. 7836928539',
            placeholder_message: 'Describe your emergency...'
          },
          profile: {
            email_optional: 'Email (Optional)',
            type: 'Type',
            add_contact: 'Add Contact',
            update_contact: 'Update Contact',
            save_contact: 'Save Contact'
          }
        }
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
