import React, { useContext } from 'react';
import { LanguageContext } from '../lib/i18n';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useContext(LanguageContext);

  const buttonStyle = (lang: 'en' | 'fa') => 
    `px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
      language === lang 
        ? 'bg-indigo-600 text-white' 
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;

  return (
    <div className="flex items-center bg-gray-800 rounded-lg p-1">
      <button onClick={() => setLanguage('en')} className={buttonStyle('en')}>
        EN
      </button>
      <button onClick={() => setLanguage('fa')} className={buttonStyle('fa')}>
        FA
      </button>
    </div>
  );
};

export default LanguageSwitcher;