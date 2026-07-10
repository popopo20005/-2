/**
 * BadgeUnlockToast - Notification toast for badge unlock events
 * Phase 4: Gamification
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, X } from 'lucide-react';
import { TIER_COLORS, type BadgeDefinition } from '../../types/gamification';
import confetti from 'canvas-confetti';

interface BadgeUnlockToastProps {
  badge: BadgeDefinition;
  onClose: () => void;
  language?: 'ja' | 'en';
}

export function BadgeUnlockToast({ badge, onClose, language = 'ja' }: BadgeUnlockToastProps) {
  useEffect(() => {
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.7 },
      colors: ['#a855f7', '#f59e0b', '#3b82f6'],
    });

    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = TIER_COLORS[badge.tier];

  return (
    <motion.div
      initial={{ x: 300, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 300, opacity: 0, scale: 0.8 }}
      className="fixed top-20 right-4 z-[100] max-w-sm"
    >
      <div
        className={`p-4 rounded-xl shadow-2xl border-2 ${colors.bg} ${colors.bgDark} ${colors.border} ${colors.borderDark}`}
        style={{ boxShadow: `0 0 30px ${colors.glow}, 0 10px 25px rgba(0,0,0,0.15)` }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6 }}
            className={`w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg`}
          >
            <Award className="w-7 h-7 text-white" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {language === 'ja' ? 'バッジ獲得！' : 'Badge Unlocked!'}
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {language === 'ja' ? badge.name : badge.nameEn}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
              {language === 'ja' ? badge.description : badge.descriptionEn}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
              +{badge.xpReward} XP
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
