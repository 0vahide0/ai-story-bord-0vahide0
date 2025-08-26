import React, { useState } from 'react';
import { MagicWandIcon, RefreshIcon, ExpandIcon, ShrinkIcon } from './common/Icons';
import { useTranslations } from '../lib/i18n';

interface AiWriterAssistantProps {
  isLoading: boolean;
  onRewrite: () => void;
  onExpand: () => void;
  onShrink: () => void;
  onChangeTone: (tone: string) => void;
}

const AiWriterAssistant: React.FC<AiWriterAssistantProps> = ({
  isLoading,
  onRewrite,
  onExpand,
  onShrink,
  onChangeTone
}) => {
  const { t } = useTranslations();
  const [tone, setTone] = useState(t('toneDefault'));

  const handleToneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tone.trim()) {
      onChangeTone(tone.trim());
    }
  };

  const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; disabled: boolean }> = ({ onClick, children, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed rounded-md transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 relative animate-fade-in-fast">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
          <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <MagicWandIcon />
        <h3 className="text-xl font-bold">{t('aiAssistant')}</h3>
      </div>
      <div className="space-y-3">
        <ActionButton onClick={onRewrite} disabled={isLoading}>
          <RefreshIcon /> {t('rewrite')}
        </ActionButton>
        <ActionButton onClick={onExpand} disabled={isLoading}>
          <ExpandIcon /> {t('expand')}
        </ActionButton>
        <ActionButton onClick={onShrink} disabled={isLoading}>
          <ShrinkIcon /> {t('shrink')}
        </ActionButton>

        <form onSubmit={handleToneSubmit} className="pt-2">
            <label htmlFor="tone" className="block text-sm font-medium text-gray-300 mb-1">{t('changeTone')}</label>
            <div className="flex gap-2">
                 <input
                    id="tone"
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    disabled={isLoading}
                    placeholder={t('tonePlaceholder')}
                    className="flex-grow bg-gray-900 border border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                 />
                 <button
                    type="submit"
                    disabled={isLoading || !tone.trim()}
                    className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed rounded-md transition-colors"
                 >
                    {t('apply')}
                 </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AiWriterAssistant;