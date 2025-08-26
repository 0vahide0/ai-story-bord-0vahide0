import React from 'react';
import { AppStep } from '../types';
import { EditIcon, FilmIcon, BrainIcon, ClapperboardIcon } from './common/Icons';
import { useTranslations } from '../lib/i18n';

interface StepperProps {
  currentStep: AppStep;
  highestStep: AppStep;
  onStepClick: (step: AppStep) => void;
}

const stepsConfig = [
    { id: AppStep.IDEA_INPUT, nameKey: 'stepBrainstorm', icon: <BrainIcon /> },
    { id: AppStep.STRUCTURE_EDITOR, nameKey: 'stepEdit', icon: <EditIcon /> },
    { id: AppStep.STORYBOARD_VIEW, nameKey: 'stepCreate', icon: <FilmIcon /> },
    { id: AppStep.PRODUCTION_STUDIO, nameKey: 'stepProduce', icon: <ClapperboardIcon /> },
];
const stepsOrder = stepsConfig.map(s => s.id);


const Stepper: React.FC<StepperProps> = ({ currentStep, highestStep, onStepClick }) => {
  const { t } = useTranslations();

  const currentStepIndex = stepsOrder.indexOf(currentStep);
  const highestStepIndex = stepsOrder.indexOf(highestStep);

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {stepsConfig.map((step, stepIdx) => {
          const isCompleted = stepIdx < currentStepIndex;
          const isCurrent = stepIdx === currentStepIndex;
          const isClickable = stepIdx <= highestStepIndex;
          const status = isCompleted ? 'complete' : isCurrent ? 'current' : 'upcoming';

          return (
            <li key={step.id} className={`relative ${stepIdx !== stepsConfig.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
              {/* Connector line */}
              {stepIdx < stepsConfig.length - 1 && (
                 <div className="absolute inset-0 flex items-center" aria-hidden="true">
                   <div className={`h-0.5 w-full ${stepIdx < currentStepIndex ? 'bg-indigo-600' : 'bg-gray-700'}`} />
                 </div>
              )}

              <button
                onClick={() => onStepClick(step.id)}
                disabled={!isClickable}
                className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors
                  ${status === 'complete' && 'bg-indigo-600 hover:bg-indigo-500'}
                  ${status === 'current' && 'bg-gray-800 border-2 border-indigo-500'}
                  ${status === 'upcoming' && 'bg-gray-800 border-2 border-gray-600 cursor-default'}
                  ${isClickable && status !== 'current' && 'cursor-pointer'}
                `}
                aria-current={isCurrent ? 'step' : undefined}
              >
                  <div className={`h-6 w-6 
                      ${status === 'complete' && 'text-white'}
                      ${status === 'current' && 'text-indigo-400'}
                      ${status === 'upcoming' && 'text-gray-500'}
                  `}>
                      {step.icon}
                  </div>
              </button>
              
              {isCurrent && (
                  <span className="absolute -bottom-6 text-xs text-center w-20 left-1/2 -translate-x-1/2 text-indigo-400 font-semibold">
                      {t(step.nameKey as any)}
                  </span>
              )}

            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Stepper;