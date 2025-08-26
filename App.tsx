import React, { useState, useCallback, useContext, useEffect } from 'react';
import { AppStep, StoryStructure, StoryboardPanelData } from './types';
import { generateStoryStructure } from './services/geminiService';
import Stepper from './components/Stepper';
import IdeaInput from './components/IdeaInput';
import StoryboardView from './components/StoryboardView';
import StructureEditor from './components/StructureEditor';
import ProductionStudio from './components/ProductionStudio';
import { LogoIcon, CogIcon } from './components/common/Icons';
import { LanguageProvider, LanguageContext, useTranslations } from './lib/i18n';
import LanguageSwitcher from './components/LanguageSwitcher';
import { SystemPromptsProvider, useSystemPrompts } from './lib/SystemPromptsContext';
import SystemPromptsSidebar from './components/SystemPromptsSidebar';

const stepsOrder: AppStep[] = [AppStep.IDEA_INPUT, AppStep.STRUCTURE_EDITOR, AppStep.STORYBOARD_VIEW, AppStep.PRODUCTION_STUDIO];

const AppContent: React.FC = () => {
  const { language } = useContext(LanguageContext);
  const { t } = useTranslations();
  const { prompts, setPromptsLanguage } = useSystemPrompts();
  
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.IDEA_INPUT);
  const [highestStep, setHighestStep] = useState<AppStep>(AppStep.IDEA_INPUT);
  const [storyStructure, setStoryStructure] = useState<StoryStructure | null>(null);
  const [storyboardPanels, setStoryboardPanels] = useState<StoryboardPanelData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPromptsSidebarOpen, setIsPromptsSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    setPromptsLanguage(language);
    if (language === 'fa') {
        document.body.classList.add('font-persian');
    } else {
        document.body.classList.remove('font-persian');
    }
  }, [language, setPromptsLanguage]);

  const handleIdeaSubmit = useCallback(async (idea: string) => {
    if (!idea.trim()) {
      setError(t('errorEnterIdea'));
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const structure = await generateStoryStructure(idea, prompts.storyStructure);
      if (!structure || !Array.isArray(structure.scenes) || structure.scenes.length === 0) {
        throw new Error(t('errorInvalidStructure'));
      }
      setStoryStructure(structure);
      setCurrentStep(AppStep.STRUCTURE_EDITOR);
      setHighestStep(AppStep.STRUCTURE_EDITOR);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : t('errorUnknown');
      setError(`${t('errorFailedStructure')} ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [prompts.storyStructure, t]);

  const handleStructureConfirm = useCallback((finalStructure: StoryStructure) => {
    setStoryStructure(finalStructure);
    const initialPanels: StoryboardPanelData[] = finalStructure.scenes.map((scene, index) => ({
      id: `scene-${index}`,
      sceneNumber: index + 1,
      sceneDescription: scene?.description || t('noDescription'),
      status: 'pending',
    }));
    setStoryboardPanels(initialPanels);
    setCurrentStep(AppStep.STORYBOARD_VIEW);
    setHighestStep(AppStep.STORYBOARD_VIEW);
  }, [t]);
  
  const handleProceedToProduction = useCallback(() => {
    setCurrentStep(AppStep.PRODUCTION_STUDIO);
    setHighestStep(AppStep.PRODUCTION_STUDIO);
  }, []);

  const handleBackToIdea = () => {
    setCurrentStep(AppStep.IDEA_INPUT);
    setStoryStructure(null);
    setError(null);
  };
  
  const handleReset = () => {
    setCurrentStep(AppStep.IDEA_INPUT);
    setHighestStep(AppStep.IDEA_INPUT);
    setStoryStructure(null);
    setStoryboardPanels([]);
    setError(null);
    setIsLoading(false);
  };
  
  const handleStepClick = (step: AppStep) => {
    const highestStepIndex = stepsOrder.indexOf(highestStep);
    const targetStepIndex = stepsOrder.indexOf(step);
    if (targetStepIndex <= highestStepIndex) {
        setCurrentStep(step);
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case AppStep.IDEA_INPUT:
        return (
          <IdeaInput
            onSubmit={handleIdeaSubmit}
            isLoading={isLoading}
            error={error}
          />
        );
      case AppStep.STRUCTURE_EDITOR:
        return storyStructure ? (
          <StructureEditor
            initialStructure={storyStructure}
            onConfirm={handleStructureConfirm}
            onBack={handleBackToIdea}
          />
        ) : null;
      case AppStep.STORYBOARD_VIEW:
        return (
          <StoryboardView
            initialPanels={storyboardPanels}
            storyTitle={storyStructure?.title || t('myStoryboard')}
            storyLogline={storyStructure?.logline || ''}
            onReset={handleReset}
            onProceed={handleProceedToProduction}
          />
        );
      case AppStep.PRODUCTION_STUDIO:
        return (
            <ProductionStudio
                initialPanels={storyboardPanels}
                onPanelsUpdate={setStoryboardPanels}
                onBack={() => setCurrentStep(AppStep.STORYBOARD_VIEW)}
                storyTitle={storyStructure?.title || t('myStoryboard')}
            />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans antialiased">
      <header className="py-4 px-6 md:px-8 border-b border-gray-700/50 sticky top-0 bg-gray-900/80 backdrop-blur-sm z-20">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LogoIcon />
            <h1 className="text-2xl font-bold tracking-tighter text-white">{t('appTitle')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Stepper 
                currentStep={currentStep} 
                highestStep={highestStep}
                onStepClick={handleStepClick}
            />
            <LanguageSwitcher />
            <button
                onClick={() => setIsPromptsSidebarOpen(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                aria-label={t('systemPromptsTitle')}
            >
                <CogIcon />
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      <SystemPromptsSidebar
        isOpen={isPromptsSidebarOpen}
        onClose={() => setIsPromptsSidebarOpen(false)}
      />
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <SystemPromptsProvider>
        <AppContent />
    </SystemPromptsProvider>
  </LanguageProvider>
);

export default App;