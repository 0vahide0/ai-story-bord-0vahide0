import React, { useState, useCallback, useMemo } from 'react';
import { StoryboardPanelData, ImageAspectRatio } from '../types';
import StoryboardPanel from './StoryboardPanel';
import { ResetIcon, WandIcon, FilmIcon } from './common/Icons';
import { useTranslations } from '../lib/i18n';

interface StoryboardViewProps {
  initialPanels: StoryboardPanelData[];
  storyTitle: string;
  storyLogline: string;
  onReset: () => void;
  onProceed: () => void;
}

const StoryboardView: React.FC<StoryboardViewProps> = ({ initialPanels, storyTitle, storyLogline, onReset, onProceed }) => {
  const { t } = useTranslations();
  const [panels, setPanels] = useState<StoryboardPanelData[]>(initialPanels);
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("16:9");

  const stylePresets = [
    { name: t('styleCinematic'), prompt: "cinematic, 8k, photorealistic, dramatic lighting, epic composition" },
    { name: t('styleAnime'), prompt: "anime style, key visual, vibrant colors, detailed background, by Makoto Shinkai" },
    { name: t('styleClaymation'), prompt: "claymation style, stop-motion, detailed textures, miniature set, by Aardman Animations" },
    { name: t('styleVintageComic'), prompt: "vintage comic book art, halftone dots, bold lines, limited color palette, 1960s style" },
  ];
  
  const [globalImagePrompt, setGlobalImagePrompt] = useState<string>(stylePresets[0].prompt);
  
  const areAllPanelsComplete = useMemo(() => panels.every(p => p.status === 'complete'), [panels]);

  const updatePanel = useCallback((panelId: string, updates: Partial<StoryboardPanelData>) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, ...updates } : p));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">{storyTitle}</h2>
        <p className="mt-2 max-w-3xl mx-auto text-md md:text-lg text-gray-400">{storyLogline}</p>
      </div>

      <div className="mb-8 p-6 bg-gray-800/50 rounded-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-300 mb-2">{t('aspectRatio')}</label>
                <select
                    id="aspect-ratio"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="16:9">16:9 ({t('aspectRatioWidescreen')})</option>
                    <option value="1:1">1:1 ({t('aspectRatioSquare')})</option>
                    <option value="9:16">9:16 ({t('aspectRatioVertical')})</option>
                    <option value="4:3">4:3 ({t('aspectRatioClassic')})</option>
                    <option value="3:4">3:4 ({t('aspectRatioPortrait')})</option>
                </select>
            </div>
             <div className="flex items-center justify-center md:justify-end mt-2 md:mt-0 gap-4">
                <button
                  onClick={onReset}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                >
                  <ResetIcon />
                  {t('startNewStory')}
                </button>
                <button
                    onClick={onProceed}
                    disabled={!areAllPanelsComplete}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                    title={areAllPanelsComplete ? t('proceedToProduction') : t('completeAllScenes')}
                >
                    {t('proceedToProduction')}
                    <FilmIcon />
                </button>
            </div>
        </div>
         <div>
            <label htmlFor="global-prompt" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <WandIcon /> {t('globalImageStyle')}
            </label>
            <textarea
                id="global-prompt"
                value={globalImagePrompt}
                onChange={(e) => setGlobalImagePrompt(e.target.value)}
                rows={2}
                placeholder={t('globalImageStylePlaceholder')}
                className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
            />
            <div className="mt-2 flex flex-wrap gap-2">
                {stylePresets.map(preset => (
                    <button
                        key={preset.name}
                        onClick={() => setGlobalImagePrompt(preset.prompt)}
                        className="px-3 py-1 text-xs font-medium bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white rounded-full transition-colors"
                    >
                        {preset.name}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
        {panels.map((panel) => (
          <StoryboardPanel
            key={panel.id}
            panelData={panel}
            updatePanel={updatePanel}
            aspectRatio={aspectRatio}
            globalImagePrompt={globalImagePrompt}
          />
        ))}
      </div>
    </div>
  );
};

export default StoryboardView;