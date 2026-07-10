/**
 * Onboarding Progress Bar
 * Shared progress indicator for all onboarding steps.
 * Duolingo-inspired with step counter and animated bar.
 */
import { motion } from 'framer-motion';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  language: 'ja' | 'en';
}

export function OnboardingProgress({ currentStep, totalSteps, language }: OnboardingProgressProps) {
  const progress = ((currentStep) / totalSteps) * 100;

  return (
    <div className="w-full px-4 pt-4 pb-3">
      <div className="max-w-md mx-auto">
        <p className="text-center text-xs font-medium text-gray-400 mb-2">
          {language === 'ja'
            ? `ステップ ${currentStep} / ${totalSteps}`
            : `Step ${currentStep} / ${totalSteps}`}
        </p>
        <div className="h-2 rounded-full overflow-hidden bg-gray-700">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
