import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { GenerateVideosOperation } from '@google/genai';
import { StoryboardPanelData } from '../types';
import { useTranslations } from '../lib/i18n';
import { useSystemPrompts } from '../lib/SystemPromptsContext';
import { startVideoGeneration, checkVideoStatus, generateMusic } from '../services/geminiService';
import { VIDEO_GENERATION_MESSAGES } from '../constants';
import { FilmIcon, RefreshIcon, MusicIcon } from './common/Icons';

interface ProductionStudioProps {
  initialPanels: StoryboardPanelData[];
  onPanelsUpdate: (updatedPanels: StoryboardPanelData[]) => void;
  onBack: () => void;
  storyTitle: string;
}

const MusicAssistant: React.FC<{
  panel: StoryboardPanelData;
  updatePanel: (id: string, updates: Partial<StoryboardPanelData>) => void;
  isDisabled: boolean;
}> = ({ panel, updatePanel, isDisabled }) => {
    const { t } = useTranslations();
    const { prompts } = useSystemPrompts();
    const [musicPrompt, setMusicPrompt] = useState(panel.musicPrompt || '');
    const [isMusicGenerating, setIsMusicGenerating] = useState(false);

    useEffect(() => {
        setMusicPrompt(panel.musicPrompt || '');
    }, [panel.id, panel.musicPrompt]);

    const handleGenerateMusic = async () => {
        if (!musicPrompt) return;
        setIsMusicGenerating(true);
        updatePanel(panel.id, { status: 'music-generating', musicUrl: undefined });
        try {
            const musicUrl = await generateMusic(musicPrompt, prompts.music);
            updatePanel(panel.id, { status: 'complete', musicUrl: musicUrl, musicPrompt: musicPrompt });
        } catch (err) {
            console.error("Music generation failed", err);
            updatePanel(panel.id, { status: 'error', errorMessage: t('errorGenerateMusic') });
        } finally {
            setIsMusicGenerating(false);
        }
    };

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 sticky top-28">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><MusicIcon /> {t('musicAssistant')}</h3>
                <span className="text-xs bg-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">{t('previewFeature')}</span>
            </div>
            <div className="space-y-4">
                <div>
                    <label htmlFor="music-prompt" className="block text-sm font-medium text-gray-300 mb-1">{t('musicPrompt')}</label>
                    <textarea
                        id="music-prompt"
                        value={musicPrompt}
                        onChange={e => setMusicPrompt(e.target.value)}
                        onBlur={() => updatePanel(panel.id, { musicPrompt: musicPrompt })}
                        rows={4}
                        disabled={isDisabled || isMusicGenerating}
                        placeholder={t('musicPromptPlaceholder')}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
                    />
                </div>
                <button
                    onClick={handleGenerateMusic}
                    disabled={isDisabled || isMusicGenerating || !musicPrompt}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-md transition-colors disabled:bg-pink-900 disabled:text-gray-400"
                >
                    {isMusicGenerating ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    ) : (
                        panel.musicUrl ? <RefreshIcon className="h-5 w-5" /> : <MusicIcon className="h-5 w-5" />
                    )}
                    {panel.musicUrl ? t('regenerateMusic') : t('generateMusic')}
                </button>
                {panel.musicUrl && !isMusicGenerating && (
                    <div className="mt-2">
                        <audio key={panel.musicUrl} controls src={panel.musicUrl} className="w-full h-10">
                            {t('audioPlayerNotSupported')}
                        </audio>
                    </div>
                )}
            </div>
        </div>
    );
};


const ProductionStudio: React.FC<ProductionStudioProps> = ({ initialPanels, onPanelsUpdate, onBack, storyTitle }) => {
  const { t } = useTranslations();
  const { prompts } = useSystemPrompts();
  const [panels, setPanels] = useState(initialPanels);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(initialPanels.find(p => p.imageUrl)?.id || null);
  const [editableVideoPrompt, setEditableVideoPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const selectedPanel = panels.find(p => p.id === selectedPanelId);

  useEffect(() => {
    if (selectedPanel) {
      const initialVideoPrompt = prompts.video.replace('{{prompt}}', selectedPanel.imagePrompt || '');
      setEditableVideoPrompt(initialVideoPrompt);
      setIsGenerating(selectedPanel.status === 'video-generating');
    }
  }, [selectedPanel, prompts.video]);

  const updatePanel = (panelId: string, updates: Partial<StoryboardPanelData>) => {
    const updatedPanels = panels.map(p => p.id === panelId ? { ...p, ...updates } : p);
    setPanels(updatedPanels);
    onPanelsUpdate(updatedPanels);
  };
  
  const cleanupIntervals = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    pollIntervalRef.current = null;
    messageIntervalRef.current = null;
  };
  
  useEffect(() => {
    return cleanupIntervals;
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (!selectedPanelId || !editableVideoPrompt) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStatus(VIDEO_GENERATION_MESSAGES[0]);
    updatePanel(selectedPanelId, { status: 'video-generating', videoUrl: undefined, errorMessage: undefined });
    
    let messageIndex = 0;
    messageIntervalRef.current = setInterval(() => {
        messageIndex = (messageIndex + 1) % VIDEO_GENERATION_MESSAGES.length;
        setGenerationStatus(VIDEO_GENERATION_MESSAGES[messageIndex]);
    }, 4000);

    try {
      let operation = await startVideoGeneration(editableVideoPrompt);
      updatePanel(selectedPanelId, { videoOperation: operation });

      const poll = async () => {
        try {
          operation = await checkVideoStatus(operation);
          if (operation.done) {
            cleanupIntervals();
            setIsGenerating(false);

            if (operation.error) {
              const errorMessage = typeof operation.error.message === 'string'
                ? operation.error.message
                : t('errorGenerateVideo');
              throw new Error(errorMessage);
            }

            const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (uri) {
                const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : (window as any).GEMINI_API_KEY;
                const downloadLink = `${uri}&key=${apiKey}`;
                updatePanel(selectedPanelId, { videoUrl: downloadLink, status: 'complete' });
                setGenerationStatus(t('success'));
            } else {
              throw new Error("Generation finished but no video URL was returned.");
            }
          }
        } catch (err) {
            cleanupIntervals();
            setIsGenerating(false);
            const errorMsg = err instanceof Error ? err.message : t('errorGenerateVideo');
            setGenerationError(errorMsg);
            updatePanel(selectedPanelId, { status: 'error', errorMessage: errorMsg });
        }
      };
      
      pollIntervalRef.current = setInterval(poll, 10000);
      poll();

    } catch (err) {
        cleanupIntervals();
        setIsGenerating(false);
        const errorMsg = err instanceof Error ? err.message : t('errorGenerateVideo');
        setGenerationError(errorMsg);
        updatePanel(selectedPanelId, { status: 'error', errorMessage: errorMsg });
    }
  }, [selectedPanelId, editableVideoPrompt, updatePanel, t]);

  return (
    <div className="animate-fade-in">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight">{t('productionStudioTitle')}</h2>
            <p className="text-gray-400 mt-2 max-w-2xl mx-auto">{t('productionStudioSubtitle')}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-screen-2xl mx-auto">
            {/* Scene Selector */}
            <aside className="lg:col-span-3">
                <div className="bg-gray-800/50 rounded-lg p-4 sticky top-28">
                    <h3 className="font-bold text-lg mb-4">{t('scenes')}</h3>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {panels.map(panel => (
                            <button key={panel.id} onClick={() => setSelectedPanelId(panel.id)} className={`w-full text-left p-2 rounded-md flex items-center gap-4 transition-colors ${selectedPanelId === panel.id ? 'bg-indigo-600/30 ring-2 ring-indigo-500' : 'hover:bg-gray-700/50'}`}>
                                <img src={panel.imageUrl} alt={`Scene ${panel.sceneNumber}`} className="w-16 h-9 object-cover rounded flex-shrink-0" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{t('scene')} {panel.sceneNumber}</p>
                                    <p className="text-xs text-gray-400 truncate">{panel.sceneDescription}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-6">
                {selectedPanel ? (
                    <div className="bg-gray-800/50 rounded-lg p-6 space-y-6">
                        <div className="aspect-video bg-gray-900 rounded-md flex items-center justify-center relative overflow-hidden">
                           {selectedPanel.videoUrl ? (
                                <video key={selectedPanel.videoUrl} src={selectedPanel.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                           ) : isGenerating ? (
                                <div className="text-center p-4">
                                    <svg className="animate-spin h-10 w-10 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-4 font-semibold">{t('videoGenerationStatus')}</p>
                                    <p className="text-gray-400 text-sm">{generationStatus}</p>
                                </div>
                           ) : (
                             <img src={selectedPanel.imageUrl} alt={`Scene ${selectedPanel.sceneNumber}`} className="w-full h-full object-cover" />
                           )}
                        </div>
                        
                        <div>
                            <label htmlFor="video-prompt" className="block text-lg font-bold text-white mb-2">{t('videoPrompt')}</label>
                            <textarea
                                id="video-prompt"
                                value={editableVideoPrompt}
                                onChange={e => setEditableVideoPrompt(e.target.value)}
                                rows={4}
                                disabled={isGenerating}
                                placeholder={t('videoPromptPlaceholder')}
                                className="w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
                            />
                        </div>

                        {generationError && (
                            <div className="bg-red-900/50 text-red-300 p-3 rounded-md text-sm">
                                <p className="font-bold">{t('videoGenerationError')}</p>
                                <p>{generationError}</p>
                            </div>
                        )}
                        
                        <button onClick={handleGenerateVideo} disabled={isGenerating || !editableVideoPrompt} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-md transition-colors disabled:bg-orange-900 disabled:text-gray-400">
                           {selectedPanel.videoUrl ? <RefreshIcon className="h-5 w-5" /> : <FilmIcon />}
                           {selectedPanel.videoUrl ? t('regenerateVideo') : t('generateVideo')}
                        </button>
                    </div>
                ) : (
                    <div className="bg-gray-800/50 rounded-lg p-6 flex items-center justify-center h-96">
                        <p className="text-gray-400">{t('selectScenePrompt')}</p>
                    </div>
                )}
            </main>
            
            {/* Music Assistant */}
            <aside className="lg:col-span-3">
              {selectedPanel ? (
                <MusicAssistant panel={selectedPanel} updatePanel={updatePanel} isDisabled={isGenerating} />
              ) : (
                <div className="bg-gray-800/50 rounded-lg p-4 sticky top-28 h-96 flex items-center justify-center">
                    <p className="text-gray-400 text-center">{t('selectSceneForMusic')}</p>
                </div>
              )}
            </aside>
        </div>
    </div>
  );
};

export default ProductionStudio;