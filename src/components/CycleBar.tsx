/**
 * CycleBar - a-PDCAサイクルの可視化バー
 * Claude Design モック 4b 準拠
 * 6ステップ: つくる→取り込む→診断→プラン→学習→見直し
 */
import { CYCLE_STEPS, getCycleState, type CycleStep } from '../services/featureUnlockService';

interface CycleBarProps {
  language: 'ja' | 'en';
}

export function CycleBar({ language }: CycleBarProps) {
  const cycleState = getCycleState();

  const getStepStyle = (stepId: CycleStep, index: number) => {
    const currentIndex = CYCLE_STEPS.findIndex(s => s.id === cycleState.currentStep);
    const isCompleted = cycleState.completedSteps.includes(stepId);
    const isCurrent = stepId === cycleState.currentStep;
    const isFuture = index > currentIndex && !isCompleted;

    if (isCompleted) {
      return {
        bg: 'rgba(16,185,129,0.2)',
        border: '#10B981',
        fg: '#34D399',
        glow: '0 0 10px rgba(16,185,129,0.5)',
        labelColor: '#34D399',
      };
    }
    if (isCurrent) {
      return {
        bg: 'rgba(99,102,241,0.25)',
        border: '#6366F1',
        fg: '#C7D2FE',
        glow: '0 0 14px rgba(99,102,241,0.7)',
        labelColor: '#C7D2FE',
      };
    }
    return {
      bg: isFuture ? 'rgba(30,41,59,0.7)' : 'rgba(30,41,59,0.5)',
      border: 'rgba(255,255,255,0.15)',
      fg: '#64748B',
      glow: 'none',
      labelColor: '#64748B',
    };
  };

  return (
    <div
      className="rounded-2xl px-[18px] py-4"
      style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-[12px] font-bold text-[#94A3B8]">
          {language === 'ja' ? '学習サイクル' : 'Learning Cycle'} ─ {cycleState.cycleCount}
          {language === 'ja' ? '周目' : 'st cycle'}
        </span>
        <span className="text-[11px] text-[#64748B]">
          {language === 'ja' ? 'サイクルとは?' : "What's this?"}
        </span>
      </div>
      <div className="flex items-center">
        {CYCLE_STEPS.map((step, index) => {
          const style = getStepStyle(step.id, index);
          const isCompleted = cycleState.completedSteps.includes(step.id);
          return (
            <div key={step.id} className="flex-1 flex flex-col items-center gap-[5px]">
              <div
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: style.bg,
                  border: `2px solid ${style.border}`,
                  color: style.fg,
                  boxShadow: style.glow,
                }}
              >
                {isCompleted ? '✓' : step.icon}
              </div>
              <span
                className="text-[9px] font-semibold whitespace-nowrap"
                style={{ color: style.labelColor }}
              >
                {language === 'ja' ? step.label : step.labelEn}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
