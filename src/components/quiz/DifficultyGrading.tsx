/**
 * Difficulty Grading (Anki-style)
 * After a correct answer, show 3 buttons: Easy / Good / Hard
 * Affects SM-2 interval calculation.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ThumbsUp, Brain } from 'lucide-react';

export type DifficultyGrade = 'easy' | 'good' | 'hard';

interface DifficultyGradingProps {
  isVisible: boolean;
  onGrade: (grade: DifficultyGrade) => void;
  language: 'ja' | 'en';
}

/**
 * Convert difficulty grade to SM-2 quality score
 * easy = 5 (perfect, long interval)
 * good = 4 (correct with hesitation, normal interval)
 * hard = 3 (correct with difficulty, shorter interval)
 */
export function gradeToQuality(grade: DifficultyGrade): number {
  switch (grade) {
    case 'easy': return 5;
    case 'good': return 4;
    case 'hard': return 3;
  }
}

export function DifficultyGrading({ isVisible, onGrade, language }: DifficultyGradingProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="mt-4"
        >
          <p className="text-xs text-gray-400 text-center mb-2">
            {language === 'ja' ? 'この問題の手応えは？' : 'How did this feel?'}
          </p>
          <div className="flex gap-2">
            {/* Hard */}
            <motion.button
              onClick={() => onGrade('hard')}
              className="flex-1 py-3 px-3 rounded-xl
                         bg-red-500/10 border border-red-500/20
                         text-red-300 text-sm font-medium
                         hover:bg-red-500/20 transition-colors
                         flex flex-col items-center gap-1 min-h-[60px]"
              whileTap={{ scale: 0.95 }}
            >
              <Brain className="size-4" />
              <span className="text-xs">
                {language === 'ja' ? '難しい' : 'Hard'}
              </span>
            </motion.button>

            {/* Good */}
            <motion.button
              onClick={() => onGrade('good')}
              className="flex-1 py-3 px-3 rounded-xl
                         bg-blue-500/10 border border-blue-500/20
                         text-blue-300 text-sm font-medium
                         hover:bg-blue-500/20 transition-colors
                         flex flex-col items-center gap-1 min-h-[60px]"
              whileTap={{ scale: 0.95 }}
            >
              <ThumbsUp className="size-4" />
              <span className="text-xs">
                {language === 'ja' ? '普通' : 'Good'}
              </span>
            </motion.button>

            {/* Easy */}
            <motion.button
              onClick={() => onGrade('easy')}
              className="flex-1 py-3 px-3 rounded-xl
                         bg-green-500/10 border border-green-500/20
                         text-green-300 text-sm font-medium
                         hover:bg-green-500/20 transition-colors
                         flex flex-col items-center gap-1 min-h-[60px]"
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="size-4" />
              <span className="text-xs">
                {language === 'ja' ? '簡単' : 'Easy'}
              </span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
