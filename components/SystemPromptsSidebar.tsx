import React from 'react';
import { useSystemPrompts } from '../lib/SystemPromptsContext';
import { useTranslations } from '../lib/i18n';
import { PromptCategory } from '../lib/prompts';

interface SystemPromptsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const promptLabels: Record<PromptCategory, string> = {
    storyStructure: 'promptStoryStructure',
    script: 'promptScript',
    imagePrompt: 'promptImage',
    video: 'promptVideo',
    tts: 'promptTts',
    music: 'promptMusic',
    rewrite: 'promptRewrite',
    expand: 'promptExpand',
    shrink: 'promptShrink',
    changeTone: 'promptChangeTone',
};

const SystemPromptsSidebar: React.FC<SystemPromptsSidebarProps> = ({ isOpen, onClose }) => {
  const { prompts, updatePrompt, resetPrompts } = useSystemPrompts();
  const { t } = useTranslations();
  
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-40 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
    >
        <div 
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-gray-900 text-white shadow-2xl flex flex-col transform transition-transform"
            onClick={e => e.stopPropagation()}
        >
            <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold">{t('systemPromptsTitle')}</h2>
                    <p className="text-sm text-gray-400">{t('systemPromptsSubtitle')}</p>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>
            
            <div className="flex-grow p-6 overflow-y-auto space-y-6">
                {(Object.keys(prompts) as Array<PromptCategory>).map(key => (
                    <div key={key}>
                        <label htmlFor={key} className="block text-sm font-semibold text-indigo-400 mb-1">
                            {t(promptLabels[key] as any)}
                        </label>
                        <textarea
                            id={key}
                            value={prompts[key]}
                            onChange={e => updatePrompt(key, e.target.value)}
                            rows={4}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
                        />
                    </div>
                ))}
            </div>

            <footer className="p-4 border-t border-gray-700 flex-shrink-0">
                <button
                    onClick={resetPrompts}
                    className="w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-2 rounded-md"
                >
                    {t('startNewStory')}
                </button>
            </footer>
        </div>
    </div>
  );
};

export default SystemPromptsSidebar;