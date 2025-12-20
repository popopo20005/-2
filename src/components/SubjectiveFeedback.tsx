import { useState } from 'react';
import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-auto"
      style={{
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-w-md w-full mx-4 pointer-events-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-block text-6xl mb-4"
          >
            📝
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
            {t[currentLang].title}
          </h3>
          <p className="text-white/90 text-sm leading-relaxed">
            {t[currentLang].description}
          </p>
          <p className="text-white/70 text-xs mt-2">
            {t[currentLang].autoAdvance}
          </p>
        </div>

        {/* Understanding Label */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
            <span className="text-lg">🧠</span>
            <span className="text-sm font-semibold text-white">
              {t[currentLang].understandingLabel.replace('🧠 ', '')}
            </span>
          </div>
        </div>

        {/* Answer Buttons */}
        <div className="space-y-4 mb-6">
          {/* Understood Button */}
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Understood button clicked: true');
              handleUnderstandingSelect(true);
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-2xl p-5 font-bold text-lg transition-all relative overflow-hidden"
            style={{
              background: understood === true
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
              color: understood === true ? '#ffffff' : '#1F2937',
              boxShadow: understood === true
                ? '0 0 30px rgba(16, 185, 129, 0.5), 0 8px 24px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                : '0 8px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.3) inset',
              border: understood === true ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid transparent',
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{understood === true ? '✅' : '✓'}</span>
              <span>{t[currentLang].understood.replace('✅ ', '')}</span>
            </div>
          </motion.button>

          {/* Not Understood Button */}
          <motion.button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Not understood button clicked: false');
              handleUnderstandingSelect(false);
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-2xl p-5 font-bold text-lg transition-all relative overflow-hidden"
            style={{
              background: understood === false
                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
              color: understood === false ? '#ffffff' : '#1F2937',
              boxShadow: understood === false
                ? '0 0 30px rgba(239, 68, 68, 0.5), 0 8px 24px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                : '0 8px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.3) inset',
              border: understood === false ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid transparent',
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{understood === false ? '❌' : '✗'}</span>
              <span>{t[currentLang].notUnderstood.replace('❌ ', '')}</span>
            </div>
          </motion.button>
        </div>

        {/* Skip Button */}
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Skip button clicked');
            onSkip();
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-xl p-3 font-medium text-sm transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          {t[currentLang].skip}
        </motion.button>

        {/* Disclaimer */}
        <div className="text-center mt-4">
          <p className="text-xs text-white/70">
            {t[currentLang].disclaimer}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}