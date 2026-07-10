/**
 * Quick 5 Button
 * One-tap button that starts a 5-question mini quiz
 * sourced from: SM-2 due cards > weakness areas > random problems
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { spacedRepetitionService, problemService } from '../lib/database';
import { detectTopWeaknesses } from '../services/weaknessDetectionService';

interface Quick5ButtonProps {
  onStart: (problemIds: number[]) => void;
  language: 'ja' | 'en';
}

export function Quick5Button({ onStart, language }: Quick5ButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const TARGET = 5;
      const selectedIds: number[] = [];

      // Step 1: SM-2 due cards (highest priority)
      try {
        const allCards = await spacedRepetitionService.getAllCards();
        const now = new Date();
        const dueCards = allCards
          .filter(card => card.nextReviewDate <= now && !card.isNew)
          .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());

        for (const card of dueCards) {
          if (selectedIds.length >= TARGET) break;
          if (!selectedIds.includes(card.problemId)) {
            selectedIds.push(card.problemId);
          }
        }
      } catch (e) {
        console.warn('Quick5: SM-2 card fetch failed:', e);
      }

      // Step 2: Weakness area problems
      if (selectedIds.length < TARGET) {
        try {
          const weaknesses = await detectTopWeaknesses(3);
          const allProblems = await problemService.getAll();

          for (const weakness of weaknesses) {
            if (selectedIds.length >= TARGET) break;
            const categoryProblems = allProblems
              .filter(p => p.category === weakness.category && p.id != null && !selectedIds.includes(p.id!));
            const shuffled = categoryProblems.sort(() => Math.random() - 0.5);
            for (const p of shuffled) {
              if (selectedIds.length >= TARGET) break;
              selectedIds.push(p.id!);
            }
          }
        } catch (e) {
          console.warn('Quick5: Weakness detection failed:', e);
        }
      }

      // Step 3: Random fill if still under target
      if (selectedIds.length < TARGET) {
        try {
          const allProblems = await problemService.getAll();
          const remaining = allProblems
            .filter(p => p.id != null && !selectedIds.includes(p.id!))
            .sort(() => Math.random() - 0.5);
          for (const p of remaining) {
            if (selectedIds.length >= TARGET) break;
            selectedIds.push(p.id!);
          }
        } catch (e) {
          console.warn('Quick5: Random fill failed:', e);
        }
      }

      if (selectedIds.length > 0) {
        onStart(selectedIds);
      }
    } catch (error) {
      console.error('Quick 5 load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handlePress}
      disabled={isLoading}
      className="relative w-full py-5 px-6 rounded-2xl
                 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500
                 text-white font-bold text-lg
                 shadow-lg shadow-orange-500/30
                 hover:shadow-xl hover:shadow-orange-500/40
                 disabled:opacity-70
                 transition-shadow min-h-[64px]
                 flex items-center justify-center gap-3
                 overflow-hidden"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      aria-busy={isLoading}
    >
      {/* Shimmer effect */}
      {!isLoading && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            animation: 'quick5-shimmer 2.5s infinite',
          }}
        />
      )}

      <div className="relative flex items-center gap-3">
        {isLoading ? (
          <div className="size-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <Zap className="size-6" fill="currentColor" />
        )}
        <span>
          {isLoading
            ? (language === 'ja' ? '準備中...' : 'Loading...')
            : (language === 'ja' ? 'クイック5' : 'Quick 5')}
        </span>
      </div>

      {/* Subtitle */}
      {!isLoading && (
        <span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/70 font-normal">
          {language === 'ja' ? '5問だけ、今すぐ復習' : '5 questions, right now'}
        </span>
      )}
    </motion.button>
  );
}
