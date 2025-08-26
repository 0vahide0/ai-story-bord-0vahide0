import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { GenerateVideosOperation } from '@google/genai';
import { StoryboardPanelData, ImageData } from '../types';
import { useTranslations } from '../lib/i18n';
import { useSystemPrompts } from '../lib/SystemPromptsContext';
import { startVideoGeneration, checkVideoStatus } from '../services/geminiService';
import { LyriaMusicSessionManager } from '../lib/LyriaMusicSession';
import { VIDEO_GENERATION_MESSAGES, VIDEO_MODELS, VIDEO_MODEL } from '../constants';
import { FilmIcon, RefreshIcon, MusicIcon, UploadIcon, PlayIcon, PauseIcon, StopIcon } from './common/Icons';

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
    const [musicStatus, setMusicStatus] = useState<'idle' | 'playing' | 'paused' | 'stopping' | 'error'>('idle');

    const lyriaSession = useRef<LyriaMusicSessionManager | null>(null);

    useEffect(() => {
        setMusicPrompt(panel.musicPrompt || '');
        // When the panel changes, ensure we clean up any existing session
        return () => {
            lyriaSession.current?.close();
            lyriaSession.current = null;
        };
    }, [panel.id]);

    const handlePlayPause = async () => {
        if (!lyriaSession.current) {
            lyriaSession.current = new LyriaMusicSessionManager();
            await lyriaSession.current.connect();
        }

        if (musicStatus === 'playing') {
            await lyriaSession.current.pause();
            setMusicStatus('paused');
        } else {
            await lyriaSession.current.setPrompts([{ text: musicPrompt, weight: 1.0 }]);
            await lyriaSession.current.play();
            setMusicStatus('playing');
            updatePanel(panel.id, { status: 'music-generating', musicUrl: undefined });
        }
    };

    const handleStop = async () => {
        if (!lyriaSession.current) return;
        setMusicStatus('stopping');
        try {
            const musicUrl = await lyriaSession.current.stop();
            updatePanel(panel.id, { status: 'complete', musicUrl: musicUrl, musicPrompt: musicPrompt });
            setMusicStatus('idle');
        } catch (err) {
            console.error("Music generation failed", err);
            updatePanel(panel.id, { status: 'error', errorMessage: t('errorGenerateMusic') });
            setMusicStatus('error');
        } finally {
            lyriaSession.current.close();
            lyriaSession.current = null;
        }
    };

    const isMusicActionInProgress = musicStatus === 'playing' || musicStatus === 'stopping';

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 sticky top-28">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MusicIcon /> {t('musicAssistant')}</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="music-prompt" className="block text-sm font-medium text-gray-300 mb-1">{t('musicPrompt')}</label>
                    <textarea
                        id="music-prompt"
                        value={musicPrompt}
                        onChange={e => setMusicPrompt(e.target.value)}
                        onBlur={() => updatePanel(panel.id, { musicPrompt: musicPrompt })}
                        rows={4}
                        disabled={isDisabled || isMusicActionInProgress}
                        placeholder={t('musicPromptPlaceholder')}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePlayPause}
                        disabled={isDisabled || !musicPrompt || musicStatus === 'stopping'}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-md transition-colors disabled:bg-pink-900 disabled:text-gray-400"
                    >
                        {musicStatus === 'playing' ? <PauseIcon /> : <PlayIcon />}
                        {musicStatus === 'playing' ? t('pauseMusic') : t('playMusic')}
                    </button>
                    <button
                        onClick={handleStop}
                        disabled={isDisabled || musicStatus === 'idle' || musicStatus === 'stopping'}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-md transition-colors disabled:bg-gray-800"
                    >
                        <StopIcon />
                        {t('stopMusic')}
                    </button>
                </div>

                {panel.musicUrl && musicStatus === 'idle' && (
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
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>(VIDEO_MODEL);
  const [uploadedImageData, setUploadedImageData] = useState<ImageData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const selectedPanel = panels.find(p => p.id === selectedPanelId);

  useEffect(() => {
    if (selectedPanel) {
      setEditableVideoPrompt(selectedPanel.imagePrompt || '');
      setIsGenerating(selectedPanel.status === 'video-generating');
    }
  }, [selectedPanel]);

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

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            setUploadedImageData({
                imageBytes: base64String,
                mimeType: file.type,
            });
        };
        reader.readAsDataURL(file);
    }
  };

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
      let operation = await startVideoGeneration(editableVideoPrompt, prompts.video, selectedVideoModel, uploadedImageData || undefined);
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
  }, [selectedPanelId, editableVideoPrompt, updatePanel, prompts.video, t, selectedVideoModel, uploadedImageData]);

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
                           ) : uploadedImageData ? (
                                <img src={`data:${uploadedImageData.mimeType};base64,${uploadedImageData.imageBytes}`} alt="Uploaded preview" className="w-full h-full object-cover" />
                           ) : (
                             <img src={selectedPanel.imageUrl} alt={`Scene ${selectedPanel.sceneNumber}`} className="w-full h-full object-cover" />
                           )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isGenerating}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-md transition-colors disabled:bg-gray-800"
                            >
                                <UploadIcon /> {t('uploadImage')}
                            </button>
                            {uploadedImageData && (
                                <button
                                    onClick={() => setUploadedImageData(null)}
                                    disabled={isGenerating}
                                    className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors"
                                >
                                    {t('clearImage')}
                                </button>
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

                        <div className="space-y-2">
                            <label htmlFor="video-model-select" className="block text-sm font-medium text-gray-300">{t('videoModel')}</label>
                            <select
                                id="video-model-select"
                                value={selectedVideoModel}
                                onChange={(e) => setSelectedVideoModel(e.target.value)}
                                disabled={isGenerating}
                                className="w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                {VIDEO_MODELS.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        </div>
                        
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