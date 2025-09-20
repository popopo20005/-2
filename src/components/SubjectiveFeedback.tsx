import { useState } from 'react';
import type { SubjectiveFeedbackData } from '../types';

interface SubjectiveFeedbackProps {
  onSubmit: (feedback: SubjectiveFeedbackData) => void;
  onSkip: () => void;
  isEnabled: boolean;
  language?: 'ja' | 'en';
}

export function SubjectiveFeedback({ onSubmit, onSkip, isEnabled, language = 'ja' }: SubjectiveFeedbackProps) {
  const [understood, setUnderstood] = useState<boolean | null>(null); // null = 未選択

  // 翻訳テキスト
  const t = {
    ja: {
      title: '📝 学習効果測定',
      description: 'この問題を理解できましたか？',
      autoAdvance: '選択すると自動で次に進みます',
      understandingLabel: '🧠 理解度',
      understood: '✅ 理解できた',
      notUnderstood: '❌ 理解できなかった',
      skip: 'スキップ',
      disclaimer: 'この情報は学習効果の分析に使用されます'
    },
    en: {
      title: '📝 Learning Assessment',
      description: 'Did you understand this problem?',
      autoAdvance: 'Selection will automatically advance to next',
      understandingLabel: '🧠 Understanding Level',
      understood: '✅ Understood',
      notUnderstood: '❌ Did not understand',
      skip: 'Skip',
      disclaimer: 'This information is used for learning effectiveness analysis'
    }
  };

  const currentLang = language;

  console.log('SubjectiveFeedback render:', {
    isEnabled,
    typeof_isEnabled: typeof isEnabled,
    onSubmit: typeof onSubmit,
    onSkip: typeof onSkip
  });

  if (!isEnabled) {
    console.log('SubjectiveFeedback not enabled, returning null');
    return null;
  }

  console.log('SubjectiveFeedback enabled, rendering modal');

  const handleUnderstandingSelect = (understanding: boolean) => {
    console.log('Understanding selected:', understanding);
    setUnderstood(understanding);
    // 即座に送信
    onSubmit({
      understood: understanding
    });
  };


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] pointer-events-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-600 pointer-events-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t[currentLang].title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t[currentLang].description}<br/>
            {t[currentLang].autoAdvance}
          </p>
        </div>

        <div className="space-y-4">
          {/* 理解度選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
              {t[currentLang].understandingLabel} {understood !== null && (understood ? `(${t[currentLang].understood.replace('✅ ', '')})` : `(${t[currentLang].notUnderstood.replace('❌ ', '')})`)}
            </label>
            <div className="space-y-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Understood button clicked: true');
                  handleUnderstandingSelect(true);
                }}
                style={{
                  padding: '15px',
                  border: '3px solid black',
                  backgroundColor: understood === true ? 'lightgreen' : 'white',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                {t[currentLang].understood}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Not understood button clicked: false');
                  handleUnderstandingSelect(false);
                }}
                style={{
                  padding: '15px',
                  border: '3px solid black',
                  backgroundColor: understood === false ? 'lightcoral' : 'white',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                {t[currentLang].notUnderstood}
              </button>
            </div>
          </div>
        </div>

        {/* スキップボタンのみ残す */}
        <div className="mt-6">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Skip button clicked');
              onSkip();
            }}
            style={{
              padding: '10px',
              border: '2px solid gray',
              backgroundColor: 'lightgray',
              cursor: 'pointer',
              width: '100%',
              fontSize: '14px'
            }}
          >
            {t[currentLang].skip}
          </button>
        </div>

        <div className="text-center mt-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t[currentLang].disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}