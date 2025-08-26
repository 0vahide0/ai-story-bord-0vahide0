import React, { useState, useContext } from 'react';
import { StoryStructure, Scene } from '../types';
import { SparklesIcon } from './common/Icons';
import { rewriteText, expandText, shrinkText, changeTone } from '../services/geminiService';
import AiWriterAssistant from './AiWriterAssistant';
import { useTranslations, LanguageContext } from '../lib/i18n';
import { useSystemPrompts } from '../lib/SystemPromptsContext';

interface StructureEditorProps {
  initialStructure: StoryStructure;
  onConfirm: (structure: StoryStructure) => void;
  onBack: () => void;
}

const StructureEditor: React.FC<StructureEditorProps> = ({ initialStructure, onConfirm, onBack }) => {
  const { t } = useTranslations();
  const { prompts } = useSystemPrompts();
  const [structure, setStructure] = useState<StoryStructure>(initialStructure);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState<boolean>(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStructure(prev => ({ ...prev, title: e.target.value }));
  };

  const handleLoglineChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStructure(prev => ({ ...prev, logline: e.target.value }));
  };

  const handleSceneChange = (index: number, value: string) => {
    const newScenes = [...structure.scenes];
    newScenes[index] = { ...newScenes[index], description: value };
    setStructure(prev => ({ ...prev, scenes: newScenes }));
  };
  
  const handleAddScene = () => {
    const newScene: Scene = { title: `${t('scene')} ${structure.scenes.length + 1}`, description: '' };
    setStructure(prev => ({ ...prev, scenes: [...prev.scenes, newScene] }));
  };

  const handleRemoveScene = (index: number) => {
    const newScenes = structure.scenes.filter((_, i) => i !== index);
    setStructure(prev => ({ ...prev, scenes: newScenes }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(structure);
  };
  
  const handleAiAction = async (action: (text: string, ...args: any[]) => Promise<string>, promptTemplate: string, tone?: string) => {
    if (selectedSceneIndex === null) return;
    setIsAssistantLoading(true);
    try {
      const currentText = structure.scenes[selectedSceneIndex].description;
      if (!currentText.trim()) return; // Don't run on empty text
      
      let newText;
      if (tone) {
        newText = await (action as typeof changeTone)(currentText, tone, promptTemplate);
      } else {
        newText = await (action as typeof rewriteText)(currentText, promptTemplate);
      }
      
      handleSceneChange(selectedSceneIndex, newText);
    } catch (err) {
      console.error("AI Assistant action failed:", err);
      // Optionally, show an error message to the user
    } finally {
      setIsAssistantLoading(false);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">{t('structureEditorTitle')}</h2>
        <p className="text-gray-400 mt-2">{t('structureEditorSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <aside className="lg:col-span-1 lg:sticky lg:top-28 h-fit">
          {selectedSceneIndex !== null ? (
            <AiWriterAssistant
              isLoading={isAssistantLoading}
              onRewrite={() => handleAiAction(rewriteText, prompts.rewrite)}
              onExpand={() => handleAiAction(expandText, prompts.expand)}
              onShrink={() => handleAiAction(shrinkText, prompts.shrink)}
              onChangeTone={(tone) => handleAiAction(changeTone, prompts.changeTone, tone)}
            />
          ) : (
            <div className="bg-gray-800/50 rounded-lg p-6 text-center text-gray-400 border-2 border-dashed border-gray-700 h-full flex flex-col justify-center">
                <p className="font-semibold">{t('aiAssistant')}</p>
                <p className="text-sm mt-1">{t('aiAssistantHint')}</p>
            </div>
          )}
        </aside>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-gray-800/50 p-6 rounded-lg">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300">{t('title')}</label>
                <input
                  type="text"
                  id="title"
                  value={structure.title}
                  onChange={handleTitleChange}
                  className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="mt-4">
                <label htmlFor="logline" className="block text-sm font-medium text-gray-300">{t('logline')}</label>
                <textarea
                  id="logline"
                  value={structure.logline}
                  onChange={handleLoglineChange}
                  rows={2}
                  className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">{t('scenes')}</h3>
              {structure.scenes.map((scene, index) => (
                <div key={index} className="bg-gray-800/50 p-4 rounded-lg flex items-start gap-4">
                  <span className="text-lg font-bold text-indigo-400 mt-2">{index + 1}</span>
                  <textarea
                    value={scene.description}
                    onFocus={() => setSelectedSceneIndex(index)}
                    onChange={(e) => handleSceneChange(index, e.target.value)}
                    rows={4}
                    placeholder={t('scenePlaceholder')}
                    className={`flex-grow bg-gray-900 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm resize-y transition-all ${selectedSceneIndex === index ? 'border-indigo-500' : 'border-gray-700'}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveScene(index)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-2 mt-1"
                    aria-label={t('removeScene')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddScene}
                className="w-full border-2 border-dashed border-gray-600 hover:border-indigo-500 text-gray-400 hover:text-indigo-400 font-semibold py-2 px-4 rounded-md transition-colors"
              >
                + {t('addScene')}
              </button>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                {t('back')}
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md flex items-center justify-center transition-all duration-200"
              >
                <SparklesIcon />
                {t('createStoryboard')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StructureEditor;