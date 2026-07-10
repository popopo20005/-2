/**
 * Daily Review Interstitial
 * Duolingo-inspired full-screen prompt shown once per day
 * when SM-2 review cards are due.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, X } from 'lucide-react';
import { spacedRepetitionService } from '../lib/database';

interface DailyReviewInterstitialProps {
  onStartReview: (problemIds: number[]) => void;
  onSkip: () => void;
  language: 'ja' | 'en';
}

export function DailyReviewInterstitial({
  onStartReview,
  onSkip,
  language,
}: DailyReviewInterstitialProps) {
  const [dueCards, setDueCards] = useState<number[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDueCards();
  }, []);

  const loadDueCards = async () => {
    try {
      const allCards = await spacedRepetitionService.getAllCards();
      const now = new Date();
      const due = allCards
        .filter(card => card.nextReviewDate <= now && !card.isNew)
        .map(card => card.problemId);
      setDueCards(due);

      // No due cards -> auto-skip
      if (due.length === 0) {
        onSkip();
      }
    } catch (error) {
      console.error('Failed to load due cards:', error);
      onSkip();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip();
  };

  const handleStartReview = () => {
    setIsVisible(false);
    onStartReview(dueCards);
  };

  if (isLoading || dueCards.length === 0) return null;

  const estimatedMinutes = Math.max(1, Math.ceil(dueCards.length * 1.5));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          role="dialog"
          aria-modal="true"
          aria-label={language === 'ja' ? '復習のお知らせ' : 'Review reminder'}
        >
          {/* Skip button (top-right) */}
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 p-3 rounded-full
                       text-gray-400 hover:text-gray-200 hover:bg-gray-800
                       transition-colors min-w-[44px] min-h-[44px]
                       flex items-center justify-center z-10"
            aria-label={language === 'ja' ? 'スキップ' : 'Skip'}
          >
            <X className="size-6" />
          </button>

          <motion.div
            className="text-center px-6 max-w-md w-full"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          >
            {/* Animated icon */}
            <motion.div
              className="mx-auto mb-8 size-24 rounded-3xl
                         bg-gradient-to-br from-purple-500 to-indigo-600
                         flex items-center justify-center
                         shadow-[0_0_60px_rgba(139,92,246,0.4)]"
              animate={{
                boxShadow: [
                  '0 0 40px rgba(139,92,246,0.3)',
                  '0 0 80px rgba(139,92,246,0.5)',
                  '0 0 40px rgba(139,92,246,0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Brain className="size-12 text-white" />
            </motion.div>

            {/* Due card count */}
            <motion.div
              className="text-6xl font-bold
                         bg-gradient-to-r from-purple-400 to-indigo-400
                         bg-clip-text text-transparent mb-3"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
            >
              {dueCards.length}
            </motion.div>

            <p className="text-xl font-semibold text-gray-100 mb-2">
              {language === 'ja'
                ? '復習カードが待っています'
                : 'Review cards are waiting'}
            </p>
            <p className="text-sm text-gray-400 mb-8">
              {language === 'ja'
                ? `約${estimatedMinutes}分で完了できます`
                : `Complete in about ${estimatedMinutes} minutes`}
            </p>

            {/* Primary CTA */}
            <motion.button
              onClick={handleStartReview}
              className="w-full py-4 px-8 rounded-2xl
                         bg-gradient-to-r from-purple-500 to-indigo-600
                         text-white font-bold text-lg
                         shadow-lg shadow-purple-500/30
                         hover:shadow-xl hover:shadow-purple-500/40
                         transition-shadow min-h-[56px]
                         flex items-center justify-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {language === 'ja' ? '復習を始める' : 'Start Review'}
              <ChevronRight className="size-5" />
            </motion.button>

            {/* Secondary skip */}
            <button
              onClick={handleSkip}
              className="mt-4 text-sm text-gray-500 hover:text-gray-300
                         transition-colors py-2 min-h-[44px] w-full"
            >
              {language === 'ja' ? 'あとで復習する' : 'Review later'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
