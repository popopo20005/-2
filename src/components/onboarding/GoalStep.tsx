import { useState } from 'react';
import { Target, Flame, Trophy, Zap, ArrowRight, ArrowLeft } from 'lucide-react';

interface GoalStepProps {
  onNext: (goal: string) => void;
  onBack: () => void;
  language?: 'ja' | 'en';
}

type GoalOption = {
  id: string;
  icon: typeof Target;
  label: string;
  description: string;
  color: string;
  bgColor: string;
};

/**
 * オンボーディング: 学習目標設定画面
 *
 * ユーザーの学習目標を選択
 */
export function GoalStep({ onNext, onBack, language = 'ja' }: GoalStepProps) {
  const [selectedGoal, setSelectedGoal] = useState<string>('');

  const content = {
    ja: {
      step: 'ステップ 3 / 5',
      title: '学習目標を選んでください',
      subtitle: 'あなたの目標に合わせて最適な学習プランを提供します',
      goals: [
        {
          id: 'exam',
          icon: Trophy,
          label: '試験合格',
          description: '国家試験や資格試験に向けて集中的に学習',
          color: '#f59e0b',
          bgColor: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        },
        {
          id: 'daily',
          icon: Flame,
          label: '毎日学習',
          description: '継続的な学習習慣を身につける',
          color: '#f97316',
          bgColor: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
        },
        {
          id: 'skill',
          icon: Zap,
          label: 'スキルアップ',
          description: '特定分野の知識を深める',
          color: '#3b82f6',
          bgColor: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
        },
        {
          id: 'review',
          icon: Target,
          label: '復習中心',
          description: '既存の知識を確実に定着させる',
          color: '#8b5cf6',
          bgColor: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
        },
      ] as GoalOption[],
      nextButton: '次へ',
      backButton: '戻る',
    },
    en: {
      step: 'Step 3 / 5',
      title: 'Choose Your Learning Goal',
      subtitle: 'We will provide the optimal learning plan for your goal',
      goals: [
        {
          id: 'exam',
          icon: Trophy,
          label: 'Pass Exam',
          description: 'Intensive study for national or certification exams',
          color: '#f59e0b',
          bgColor: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        },
        {
          id: 'daily',
          icon: Flame,
          label: 'Daily Learning',
          description: 'Build a consistent learning habit',
          color: '#f97316',
          bgColor: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
        },
        {
          id: 'skill',
          icon: Zap,
          label: 'Skill Up',
          description: 'Deepen knowledge in specific areas',
          color: '#3b82f6',
          bgColor: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
        },
        {
          id: 'review',
          icon: Target,
          label: 'Review Focus',
          description: 'Solidify existing knowledge',
          color: '#8b5cf6',
          bgColor: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
        },
      ] as GoalOption[],
      nextButton: 'Next',
      backButton: 'Back',
    },
  };

  const t = content[language];

  const handleGoalClick = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  const handleNext = () => {
    if (selectedGoal) {
      // 目標をlocalStorageに保存
      localStorage.setItem('learningGoal', selectedGoal);
      onNext(selectedGoal);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(to bottom right, #eff6ff, #ffffff, #faf5ff)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* プログレスバー - 最上部に固定 */}
      <div style={{
        width: '100%',
        padding: '16px 16px 0 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ maxWidth: '448px', margin: '0 auto', paddingBottom: '16px' }}>
          <p style={{
            textAlign: 'center',
            fontWeight: '600',
            marginBottom: '12px',
            fontSize: '14px',
            color: '#374151'
          }}>
            {t.step}
          </p>
          <div
            style={{
              height: '8px',
              borderRadius: '9999px',
              overflow: 'hidden',
              background: '#e5e7eb',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div
              style={{
                height: '100%',
                width: '60%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.6)',
                borderRadius: '9999px',
                transition: 'all 0.7s ease-out'
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto flex flex-col items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* タイトル */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
              {t.title}
            </h1>
            <p className="text-sm" style={{ color: '#4b5563' }}>
              {t.subtitle}
            </p>
          </div>

          {/* 目標選択カード */}
          <div className="grid gap-4 md:grid-cols-2">
            {t.goals.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoal === goal.id;

              return (
                <div
                  key={goal.id}
                  onClick={() => handleGoalClick(goal.id)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    border: isSelected ? '3px solid #3b82f6' : '2px solid rgba(0,0,0,0.1)',
                    borderRadius: '16px',
                    background: '#ffffff',
                    boxShadow: isSelected ? '0 12px 24px rgba(59, 130, 246, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                    padding: '24px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      style={{
                        flexShrink: 0,
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: goal.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 6px 16px ${goal.color}40`
                      }}
                    >
                      <Icon style={{ width: '28px', height: '28px', color: '#ffffff' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1" style={{ color: '#111827' }}>
                        {goal.label}
                      </h3>
                      <p className="text-sm" style={{ color: '#4b5563' }}>
                        {goal.description}
                      </p>
                    </div>
                    {/* 選択インジケーター */}
                    {isSelected && (
                      <div style={{
                        flexShrink: 0,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg
                          style={{ width: '18px', height: '18px', color: '#ffffff' }}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ナビゲーションボタン */}
          <div className="flex justify-between pt-4 gap-4">
            <button
              onClick={onBack}
              className="font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
              style={{
                background: '#ffffff',
                border: '2px solid #d1d5db',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                padding: '16px 32px',
                fontSize: '16px',
                color: '#374151'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              <ArrowLeft className="size-5" />
              {t.backButton}
            </button>
            <button
              onClick={handleNext}
              disabled={!selectedGoal}
              className="font-bold rounded-3xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-4"
              style={{
                background: selectedGoal ? '#1f2937' : '#9ca3af',
                boxShadow: selectedGoal ? '0 12px 40px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '20px 48px',
                fontSize: '22px',
                color: '#ffffff',
                cursor: selectedGoal ? 'pointer' : 'not-allowed',
                opacity: selectedGoal ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (selectedGoal) {
                  e.currentTarget.style.boxShadow = '0 16px 50px rgba(0, 0, 0, 0.4)';
                  e.currentTarget.style.background = '#111827';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedGoal) {
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.background = '#1f2937';
                }
              }}
            >
              <span style={{ color: '#ffffff' }}>{t.nextButton}</span>
              <ArrowRight className="size-8" style={{ color: '#ffffff' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
