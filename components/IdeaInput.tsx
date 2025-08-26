import React, { useState } from 'react';
import { SparklesIcon } from './common/Icons';
import { useTranslations } from '../lib/i18n';

interface IdeaInputProps {
  onSubmit: (idea: string) => void;
  isLoading: boolean;
  error: string | null;
}

const IdeaInput: React.FC<IdeaInputProps> = ({ onSubmit, isLoading, error }) => {
  const [idea, setIdea] = useState('');
  const { t } = useTranslations();
  const sampleIdeas = t('sampleIdeas');

  const handleSampleClick = () => {
    const randomIdea = sampleIdeas[Math.floor(Math.random() * sampleIdeas.length)];
    setIdea(randomIdea);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(idea);
  };

  return (
    <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
      <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl mb-4">
        {t('ideaInputTitle')}
      </h2>
      <p className="text-lg text-gray-400 mb-8 max-w-2xl">
        {t('ideaInputSubtitle')}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow duration-200">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={t('ideaInputPlaceholder')}
            className="w-full h-28 p-3 bg-transparent text-lg text-gray-200 resize-none focus:outline-none placeholder-gray-500"
            disabled={isLoading}
          />
          <div className="flex justify-between items-center p-2">
             <button
              type="button"
              onClick={handleSampleClick}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
            >
              {t('trySampleIdea')}
            </button>
             <button
              type="submit"
              disabled={isLoading || !idea.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-md flex items-center justify-center transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('generating')}...
                </>
              ) : (
                <>
                  <SparklesIcon />
                  {t('generateStory')}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      {error && <p className="mt-4 text-red-400">{error}</p>}
    </div>
  );
};

export default IdeaInput;