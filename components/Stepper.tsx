import React from 'react';
import { AppStep } from '../types';
import { EditIcon, FilmIcon, BrainIcon, ClapperboardIcon } from './common/Icons';
import { useTranslations } from '../lib/i18n';

interface StepperProps {
  currentStep: AppStep;
}

const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const { t } = useTranslations();

  const steps = [
    { id: AppStep.IDEA_INPUT, name: t('stepBrainstorm'), icon: <BrainIcon /> },
    { id: AppStep.STRUCTURE_EDITOR, name: t('stepEdit'), icon: <EditIcon /> },
    { id: AppStep.STORYBOARD_VIEW, name: t('stepCreate'), icon: <FilmIcon /> },
    { id: AppStep.PRODUCTION_STUDIO, name: t('stepProduce'), icon: <ClapperboardIcon /> },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {stepIdx < currentStepIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-indigo-600" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center bg-indigo-600 rounded-full">
                   <div className="h-6 w-6 text-white">{step.icon}</div>
                </div>
              </>
            ) : stepIdx === currentStepIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-700" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center bg-gray-800 border-2 border-indigo-500 rounded-full">
                  <div className="h-6 w-6 text-indigo-400">{step.icon}</div>
                </div>
                <span className="absolute -bottom-6 text-xs text-center w-20 left-1/2 -translate-x-1/2 text-indigo-400 font-semibold">{step.name}</span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-700" />
                </div>
                <div className="group relative flex h-8 w-8 items-center justify-center bg-gray-800 border-2 border-gray-600 rounded-full">
                  <div className="h-6 w-6 text-gray-500">{step.icon}</div>
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Stepper;