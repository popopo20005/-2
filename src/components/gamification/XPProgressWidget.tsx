/**
 * XPProgressWidget - Shows current level, XP progress bar, streak
 * Phase 4: Gamification
 */

import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp, Flame, Trophy } from 'lucide-react';
import { getUserProgress } from '../../services/gamificationService';
import { getXPProgress } from '../../types/gamification';
import type { UserProgress } from '../../types/gamification';

interface XPProgressWidgetProps {
  language?: 'ja' | 'en';
  onBadgesClick?: () => void;
}

const t = {
  ja: {
    level: 'レベル',
    totalXP: '合計XP',
    nextLevel: (xp: number) => `あと ${xp} XP でレベルアップ`,
    streak: '連続',
    days: '日',
    longestStreak: '最長',
    badges: 'バッジ',
  },
  en: {
    level: 'Level',
    totalXP: 'Total XP',
    nextLevel: (xp: number) => `${xp} XP to next level`,
    streak: 'Streak',
    days: ' days',
    longestStreak: 'Best',
    badges: 'Badges',
  },
};

export function XPProgressWidget({ language = 'ja', onBadgesClick }: XPProgressWidgetProps) {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const animatedProgress = useMotionValue(0);
  const progressWidth = useTransform(animatedProgress, v => `${v}%`);
  const labels = t[language];

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const data = await getUserProgress();
    setProgress(data);

    const xpInfo = getXPProgress(data.totalXP);
    animate(animatedProgress, xpInfo.percentage, { duration: 1.2, ease: 'easeOut' });
  };

  if (!progress) return null;

  const xpInfo = getXPProgress(progress.totalXP);
  const remaining = xpInfo.nextLevelXP - xpInfo.currentLevelXP;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-700/50">
      <div className="flex items-center justify-between mb-3">
        {/* Level badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-lg font-bold text-white">{xpInfo.level}</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{labels.level}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {progress.totalXP.toLocaleString()} XP
            </p>
          </div>
        </div>

        {/* Streak + Badges */}
        <div className="flex items-center gap-3">
          {progress.currentStreak > 0 && (
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-bold">
                {progress.currentStreak}{labels.days}
              </span>
            </div>
          )}
          {onBadgesClick && (
            <button
              onClick={onBadgesClick}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{labels.badges}</span>
            </button>
          )}
        </div>
      </div>

      {/* XP Progress bar */}
      <div className="mb-1.5">
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{xpInfo.currentLevelXP} / {xpInfo.nextLevelXP} XP</span>
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {labels.nextLevel(remaining)}
        </span>
      </div>
    </div>
  );
}
