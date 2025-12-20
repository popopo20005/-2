import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { NeumorphicButton } from './ui/NeumorphicButton';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  totalQuestions: number;
  language: 'ja' | 'en';
}

export function LevelUpModal({ isOpen, onClose, score, totalQuestions, language }: LevelUpModalProps) {
  const accuracy = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

  // レベル判定
  const getLevel = () => {
    if (accuracy >= 90) return { level: 'S', color: 'from-yellow-400 to-orange-500', emoji: '🏆', text: 'text-yellow-500' };
    if (accuracy >= 80) return { level: 'A', color: 'from-green-400 to-emerald-500', emoji: '⭐', text: 'text-green-500' };
    if (accuracy >= 70) return { level: 'B', color: 'from-blue-400 to-cyan-500', emoji: '👍', text: 'text-blue-500' };
    if (accuracy >= 60) return { level: 'C', color: 'from-purple-400 to-pink-500', emoji: '💪', text: 'text-purple-500' };
    return { level: 'D', color: 'from-gray-400 to-gray-500', emoji: '📚', text: 'text-gray-500' };
  };

  const levelInfo = getLevel();

  const translations = {
    ja: {
      title: 'クイズ完了！',
      level: 'ランク',
      score: '正解数',
      accuracy: '正答率',
      message: {
        S: '完璧です！素晴らしい！',
        A: 'とても良くできました！',
        B: '良い結果です！',
        C: 'もう少し頑張りましょう！',
        D: '復習して再挑戦しましょう！',
      },
      close: '閉じる',
    },
    en: {
      title: 'Quiz Complete!',
      level: 'Rank',
      score: 'Correct',
      accuracy: 'Accuracy',
      message: {
        S: 'Perfect! Excellent!',
        A: 'Very well done!',
        B: 'Good job!',
        C: 'Keep trying!',
        D: 'Review and try again!',
      },
      close: 'Close',
    },
  };

  const t = translations[language];

  // モーダルが開いたときにconfetti発射
  useEffect(() => {
    if (isOpen && accuracy >= 70) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [isOpen, accuracy]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <GlassCard variant="default" className="p-8 text-center border-2 border-white/20">
              {/* タイトル */}
              <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
                {t.title}
              </h2>

              {/* ランク表示 */}
              <div className="flex flex-col items-center mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className={`w-32 h-32 rounded-full bg-gradient-to-br ${levelInfo.color} flex items-center justify-center shadow-lg mb-4 ring-4 ring-white/30`}
                >
                  <span className="text-6xl font-bold text-white drop-shadow-lg">
                    {levelInfo.level}
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-5xl mb-2"
                >
                  {levelInfo.emoji}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-xl font-semibold text-gray-700 dark:text-gray-300"
                >
                  {t.message[levelInfo.level as keyof typeof t.message]}
                </motion.p>
              </div>

              {/* 統計情報 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3 mb-8"
              >
                <div className="flex justify-between items-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{t.score}</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {score} / {totalQuestions}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{t.accuracy}</span>
                  <span className={`text-xl font-bold ${levelInfo.text}`}>
                    {accuracy.toFixed(1)}%
                  </span>
                </div>
              </motion.div>

              {/* 閉じるボタン */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <NeumorphicButton
                  onClick={onClose}
                  variant="primary"
                  className="w-full py-3 text-lg"
                >
                  {t.close}
                </NeumorphicButton>
              </motion.div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
