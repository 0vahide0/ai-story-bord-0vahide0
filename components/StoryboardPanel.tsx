import React, { useEffect, useCallback, useState, useRef, useContext } from 'react';
import { StoryboardPanelData, ImageAspectRatio } from '../types';
import { generateScriptStream, generateImagePrompt, generateImage, generateTTS } from '../services/geminiService';
import { WandIcon, RefreshIcon, MicrophoneIcon } from './common/Icons';
import { useTranslations, LanguageContext } from '../lib/i18n';
import { useSystemPrompts } from '../lib/SystemPromptsContext';
import { TTS_VOICES } from '../constants';

interface StoryboardPanelProps {
  panelData: StoryboardPanelData;
  updatePanel: (panelId: string, updates: Partial<StoryboardPanelData>) => void;
  aspectRatio: ImageAspectRatio;
  globalImagePrompt: string;
}

const StatusIndicator: React.FC<{ status: StoryboardPanelData['status'] }> = ({ status }) => {
  const { t } = useTranslations();
  const statusConfig = {
    pending: { text: t('statusReady'), color: 'bg-gray-500' },
    scripting: { text: t('statusScripting'), color: 'bg-blue-500 animate-pulse' },
    prompting: { text: t('statusPrompting'), color: 'bg-purple-500 animate-pulse' },
    imaging: { text: t('statusImaging'), color: 'bg-teal-500 animate-pulse' },
    'video-generating': { text: t('statusVideo'), color: 'bg-orange-500 animate-pulse' },
    'tts-generating': { text: t('statusTtsGenerating'), color: 'bg-cyan-500 animate-pulse' },
    'music-generating': { text: t('statusMusicGenerating'), color: 'bg-pink-500 animate-pulse' },
    complete: { text: t('statusComplete'), color: 'bg-green-600' },
    error: { text: t('statusError'), color: 'bg-red-500' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className="absolute top-3 right-3 text-xs font-bold text-white px-2 py-1 rounded-full flex items-center gap-1.5" style={{ backgroundColor: config.color.split(' ')[0] }}>
      <span className={`h-2 w-2 rounded-full ${config.color}`}></span>
      {config.text}
    </div>
  );
};

const StoryboardPanel: React.FC<StoryboardPanelProps> = ({ panelData, updatePanel, aspectRatio, globalImagePrompt }) => {
  const { id, sceneNumber, sceneDescription, script, imageUrl, status, videoUrl, errorMessage, imagePrompt, ttsScript, audioUrl } = panelData;
  const { t } = useTranslations();
  const { language } = useContext(LanguageContext);
  const { prompts } = useSystemPrompts();

  const [isGenerating, setIsGenerating] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState(imagePrompt || '');
  const [editableTtsScript, setEditableTtsScript] = useState(ttsScript || script || '');
  const [selectedVoice, setSelectedVoice] = useState(panelData.ttsVoice || 'Puck');
  const [isTtsGenerating, setIsTtsGenerating] = useState(false);
  
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    setEditablePrompt(imagePrompt || '');
  }, [imagePrompt]);

  useEffect(() => {
    setEditableTtsScript(ttsScript || script || '');
  }, [ttsScript, script]);

  const safeUpdatePanel = useCallback((...args: Parameters<typeof updatePanel>) => {
    if (isMounted.current) {
      updatePanel(...args);
    }
  }, [updatePanel]);

  const runGeneration = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Step 1: Generate Script
      updatePanel(id, { status: 'scripting', errorMessage: undefined });
      let fullScript = '';
      await generateScriptStream(sceneDescription, prompts.script, (chunk) => {
        fullScript += chunk;
        safeUpdatePanel(id, { script: fullScript });
      });
      safeUpdatePanel(id, { script: fullScript, ttsScript: fullScript });
      setEditableTtsScript(fullScript);

      // Step 2: Generate Image Prompt
      safeUpdatePanel(id, { status: 'prompting' });
      const prompt = await generateImagePrompt(fullScript, globalImagePrompt, prompts.imagePrompt);
      safeUpdatePanel(id, { imagePrompt: prompt });
      setEditablePrompt(prompt); // Set editable prompt for the first time

      // Step 3: Generate Image
      safeUpdatePanel(id, { status: 'imaging' });
      const generatedImageUrl = await generateImage(prompt, aspectRatio);
      safeUpdatePanel(id, { imageUrl: generatedImageUrl, status: 'complete' });

    } catch (err) {
      console.error(`Error generating panel ${id}:`, err);
      safeUpdatePanel(id, { status: 'error', errorMessage: t('errorDuringGeneration') });
    } finally {
        if(isMounted.current) setIsGenerating(false);
    }
  }, [id, sceneDescription, safeUpdatePanel, globalImagePrompt, aspectRatio, prompts, t]);
  
  const handleRegenerateImage = useCallback(async () => {
    if (!editablePrompt) return;
    setIsGenerating(true);
    safeUpdatePanel(id, { status: 'imaging', errorMessage: undefined });
    try {
        const generatedImageUrl = await generateImage(editablePrompt, aspectRatio);
        safeUpdatePanel(id, { imageUrl: generatedImageUrl, status: 'complete' });
    } catch (err) {
        console.error(`Error regenerating image for panel ${id}:`, err);
        safeUpdatePanel(id, { status: 'error', errorMessage: t('errorRegenerateImage') });
    } finally {
        if(isMounted.current) setIsGenerating(false);
    }
  }, [id, editablePrompt, aspectRatio, safeUpdatePanel, t]);

  const handleGenerateAudio = useCallback(async () => {
    if (!editableTtsScript) return;
    setIsTtsGenerating(true);
    safeUpdatePanel(id, { status: 'tts-generating', errorMessage: undefined, audioUrl: undefined });
    try {
        const generatedAudioUrl = await generateTTS(editableTtsScript, selectedVoice, prompts.tts);
        safeUpdatePanel(id, { audioUrl: generatedAudioUrl, status: 'complete', ttsVoice: selectedVoice });
    } catch (err) {
        console.error(`Error generating audio for panel ${id}:`, err);
        safeUpdatePanel(id, { status: 'error', errorMessage: t('errorGenerateAudio') });
    } finally {
        if(isMounted.current) setIsTtsGenerating(false);
    }
  }, [id, editableTtsScript, selectedVoice, safeUpdatePanel, prompts.tts, t]);


  return (
    <div className="bg-gray-800/50 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-indigo-500/20 hover:ring-1 hover:ring-indigo-500/50">
      <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={`Scene ${sceneNumber}`} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-500 flex flex-col items-center">
            {isGenerating && status !== 'pending' ? (
              <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
             <button
                onClick={runGeneration}
                disabled={isGenerating || status !== 'pending'}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md flex items-center gap-2 transition-all duration-200"
              >
                <WandIcon />
                {t('generateScene')}
              </button>
            )}
          </div>
        )}
        <div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full border-2 border-white/50">{sceneNumber}</div>
        <StatusIndicator status={status} />
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-bold text-lg text-white mb-2">{t('sceneDescription')}</h3>
        <p className="text-sm text-gray-400 mb-4 flex-shrink-0">{sceneDescription}</p>
        
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg text-white">{t('script')}</h3>
        </div>
        <div className="prose prose-sm prose-invert text-gray-300 bg-black/20 p-3 rounded-md flex-grow min-h-[100px] overflow-y-auto">
          <p className="whitespace-pre-wrap font-mono">{script || t('scriptPlaceholder')}</p>
        </div>

        {script && (
            <div className="mt-4">
                <h3 className="font-bold text-lg text-white mb-2">{t('speech')}</h3>
                <div className="space-y-2">
                    <textarea
                        value={editableTtsScript}
                        onChange={(e) => setEditableTtsScript(e.target.value)}
                        onBlur={() => safeUpdatePanel(id, { ttsScript: editableTtsScript })}
                        rows={4}
                        placeholder={t('speechPlaceholder')}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
                    />
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-shrink-0">
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="appearance-none w-full bg-gray-700 border border-gray-600 rounded-md pl-3 pr-8 py-1.5 text-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
                                aria-label={t('selectVoice')}
                                disabled={isTtsGenerating}
                            >
                                {TTS_VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                            </select>
                             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerateAudio} 
                            disabled={!editableTtsScript || isTtsGenerating || isGenerating} 
                            className="flex-grow flex items-center justify-center gap-2 py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed"
                            aria-label={audioUrl ? t('regenerateAudio') : t('generateAudio')}
                        >
                            {isTtsGenerating ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <MicrophoneIcon />
                            )}
                            <span className="text-sm font-semibold">{audioUrl ? t('regenerateAudio') : t('generateAudio')}</span>
                        </button>
                    </div>
                     {audioUrl && (
                        <div className="mt-2">
                            <audio key={audioUrl} controls src={audioUrl} className="w-full h-10">
                                {t('audioPlayerNotSupported')}
                            </audio>
                        </div>
                    )}
                </div>
            </div>
        )}

        {imagePrompt && (
            <div className="mt-4">
                <label htmlFor={`prompt-${id}`} className="block text-lg font-bold text-white mb-2">{t('imagePrompt')}</label>
                <div className="flex gap-2">
                    <textarea
                        id={`prompt-${id}`}
                        value={editablePrompt}
                        onChange={(e) => setEditablePrompt(e.target.value)}
                        rows={3}
                        className="flex-grow bg-gray-900 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
                    />
                    <button onClick={handleRegenerateImage} disabled={isGenerating} className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-indigo-900 h-fit">
                        <RefreshIcon className="h-5 w-5 text-white" />
                    </button>
                </div>
            </div>
        )}

        {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
      </div>
      
       {videoUrl && (
         <div className="p-4 border-t border-gray-700">
           <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="w-full block text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">{t('viewVideo')}</a>
         </div>
       )}
    </div>
  );
};

export default StoryboardPanel;