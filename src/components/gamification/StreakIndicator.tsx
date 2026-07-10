/**
 * Streak Indicator
 * Persistent streak display for header/nav bar
 * Shows fire emoji + day count with animation states
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getUserProgress } from '../../services/gamificationService';

interface StreakIndicatorProps {
  compact?: boolean;
}

export function StreakIndicator({ compact = false }: StreakIndicatorProps) {
  const [streak, setStreak] = useState(0);
  const [hasStudiedToday, setHasStudiedToday] = useState(false);

  const loadStreak = useCallback(async () => {
    try {
      const progress = await getUserProgress();
      setStreak(progress.currentStreak);

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setHasStudiedToday(progress.lastStudyDate === todayStr);
    } catch (e) {
      console.warn('StreakIndicator: failed to load:', e);
    }
  }, []);

  useEffect(() => {
    loadStreak();

    // Refresh every 30 seconds to catch updates
    const interval = setInterval(loadStreak, 30000);

    // Also listen for custom streak-update events
    const handleStreakUpdate = () => loadStreak();
    window.addEventListener('streak-updated', handleStreakUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('streak-updated', handleStreakUpdate);
    };
  }, [loadStreak]);

  const isActive = streak > 0 && hasStudiedToday;
  const isAtRisk = streak > 0 && !hasStudiedToday;

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 relative"
        role="status"
        aria-label={`${streak}${isAtRisk ? ' (at risk)' : ''}`}
      >
        <motion.span
          className={`text-base leading-none ${isActive ? '' : 'grayscale opacity-50'}`}
          animate={isActive ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span role="img" aria-hidden="true">{'\uD83D\uDD25'}</span>
        </motion.span>
        <span className={`text-xs font-bold tabular-nums leading-none
          ${isActive
            ? 'text-orange-400'
            : isAtRisk
              ? 'text-orange-300/50'
              : 'text-gray-500'}`}
        >
          {streak}
        </span>

        {/* At-risk warning dot */}
        {isAtRisk && (
          <motion.div
            className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    );
  }

  // Full-size variant (for dashboard header)
  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        ${isActive
          ? 'bg-orange-500/15 border border-orange-500/30'
          : isAtRisk
            ? 'bg-orange-500/5 border border-orange-500/10'
            : 'bg-gray-800/50 border border-gray-700'}`}
      role="status"
      aria-label={`${streak} day streak${isAtRisk ? ', at risk' : ''}`}
    >
      <motion.span
        className={`text-lg leading-none ${!isActive && !isAtRisk ? 'grayscale opacity-40' : ''}`}
        animate={isActive ? {
          scale: [1, 1.15, 1],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span role="img" aria-hidden="true">{'\uD83D\uDD25'}</span>
      </motion.span>
      <span className={`font-bold tabular-nums
        ${isActive ? 'text-orange-400' : isAtRisk ? 'text-orange-300/40' : 'text-gray-600'}`}>
        {streak}
      </span>
    </motion.div>
  );
}
