import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  totalQuestions: number;
  language: 'ja' | 'en';
}

export function LevelUpModal({ isOpen, onClose, score, totalQuestions, language }: LevelUpModalProps) {
  const accuracy = (score / totalQuestions) * 100;

  // レベル判定
  const getLevel = () => {
    if (accuracy >= 90) return { level: 'S', color: 'from-yellow-400 to-orange-500', emoji: '🏆' };
    if (accuracy >= 80) return { level: 'A', color: 'from-green-400 to-emerald-500', emoji: '⭐' };
    if (accuracy >= 70) return { level: 'B', color: 'from-blue-400 to-cyan-500', emoji: '👍' };
    if (accuracy >= 60) return { level: 'C', color: 'from-purple-400 to-pink-500', emoji: '💪' };
    return { level: 'D', color: 'from-gray-400 to-gray-500', emoji: '📚' };
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
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* タイトル */}
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
              {t.title}
            </h2>

            {/* ランク表示 */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={`w-32 h-32 rounded-full bg-gradient-to-br ${levelInfo.color} flex items-center justify-center shadow-lg mb-4`}
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
                className="text-xl font-semibold text-center text-gray-700 dark:text-gray-300"
              >
                {t.message[levelInfo.level as keyof typeof t.message]}
              </motion.p>
            </div>

            {/* 統計情報 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-3 mb-6"
            >
              <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{t.score}</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {score} / {totalQuestions}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{t.accuracy}</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {accuracy.toFixed(1)}%
                </span>
              </div>
            </motion.div>

            {/* 閉じるボタン */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              {t.close}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
