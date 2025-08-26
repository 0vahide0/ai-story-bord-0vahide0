import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { defaultPrompts, Prompts, PromptCategory } from './prompts';

type Language = 'en' | 'fa';

interface SystemPromptsContextType {
  prompts: Prompts;
  updatePrompt: (category: PromptCategory, value: string) => void;
  setPromptsLanguage: (language: Language) => void;
  resetPrompts: () => void;
}

const SystemPromptsContext = createContext<SystemPromptsContextType | undefined>(undefined);

export const SystemPromptsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [prompts, setPrompts] = useState<Prompts>(defaultPrompts.en);

  useEffect(() => {
    setPrompts(defaultPrompts[language]);
  }, [language]);

  const setPromptsLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
  }, []);
  
  const updatePrompt = useCallback((category: PromptCategory, value: string) => {
    setPrompts(prev => ({ ...prev, [category]: value }));
  }, []);

  const resetPrompts = useCallback(() => {
    setPrompts(defaultPrompts[language]);
  }, [language]);

  return (
    <SystemPromptsContext.Provider value={{ prompts, updatePrompt, setPromptsLanguage, resetPrompts }}>
      {children}
    </SystemPromptsContext.Provider>
  );
};

export const useSystemPrompts = () => {
  const context = useContext(SystemPromptsContext);
  if (context === undefined) {
    throw new Error('useSystemPrompts must be used within a SystemPromptsProvider');
  }
  return context;
};