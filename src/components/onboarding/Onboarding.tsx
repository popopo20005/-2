import { useState } from 'react';
import { WelcomeStep } from './WelcomeStep';
import { NameStep } from './NameStep';
import { GoalStep } from './GoalStep';
import { ImportStep } from './ImportStep';
import { TourStep } from './TourStep';

interface OnboardingProps {
  onComplete: () => void;
  language?: 'ja' | 'en';
}

type OnboardingStep = 'welcome' | 'name' | 'goal' | 'import' | 'tour';

/**
 * オンボーディングフローのメインコーディネーター
 *
 * 5つのステップを順番に表示:
 * 1. Welcome - ようこそ画面
 * 2. Name - ユーザー名設定
 * 3. Goal - 学習目標設定
 * 4. Import - データインポート
 * 5. Tour - アプリツアー
 */
export function Onboarding({ onComplete, language = 'ja' }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [userName, setUserName] = useState<string>('');
  const [selectedGoal, setSelectedGoal] = useState<string>('');

  const handleWelcomeNext = () => {
    setCurrentStep('name');
  };

  const handleNameNext = (name: string) => {
    setUserName(name);
    setCurrentStep('goal');
  };

  const handleNameBack = () => {
    setCurrentStep('welcome');
  };

  const handleGoalNext = (goal: string) => {
    setSelectedGoal(goal);
    setCurrentStep('import');
  };

  const handleGoalBack = () => {
    setCurrentStep('name');
  };

  const handleImportNext = () => {
    setCurrentStep('tour');
  };

  const handleImportBack = () => {
    setCurrentStep('goal');
  };

  const handleTourComplete = () => {
    // オンボーディング完了時にユーザー名と選択した目標を保存
    if (userName) {
      localStorage.setItem('userName', userName);
      import('../../services/syncService').then(({ syncService }) => {
        syncService.syncUserName(userName).catch(() => {});
      });
    }
    if (selectedGoal) {
      localStorage.setItem('learningGoal', selectedGoal);
    }
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
  };

  const handleTourBack = () => {
    setCurrentStep('import');
  };

  // 現在のステップに応じたコンポーネントをレンダリング
  console.log('Onboarding currentStep:', currentStep);
  switch (currentStep) {
    case 'welcome':
      console.log('WelcomeStepをレンダリングします');
      return <WelcomeStep onNext={handleWelcomeNext} language={language} />;

    case 'name':
      return (
        <NameStep
          onNext={handleNameNext}
          onBack={handleNameBack}
          language={language}
        />
      );

    case 'goal':
      return (
        <GoalStep
          onNext={handleGoalNext}
          onBack={handleGoalBack}
          language={language}
        />
      );

    case 'import':
      return (
        <ImportStep
          onNext={handleImportNext}
          onBack={handleImportBack}
          language={language}
          selectedGoal={selectedGoal}
        />
      );

    case 'tour':
      return (
        <TourStep
          onComplete={handleTourComplete}
          onBack={handleTourBack}
          language={language}
          selectedGoal={selectedGoal}
        />
      );

    default:
      return null;
  }
}
