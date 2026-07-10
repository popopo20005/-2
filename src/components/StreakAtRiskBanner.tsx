/**
 * Streak At Risk Banner
 * In-app banner shown when user has an active streak but hasn't studied today.
 * Slides down from top with action button to start quick study.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Zap } from 'lucide-react';
import { getUserProgress } from '../services/gamificationService';

interface StreakAtRiskBannerProps {
  onStartQuick: () => void;
  language: 'ja' | 'en';
}

export function StreakAtRiskBanner({
  onStartQuick,
  language,
}: StreakAtRiskBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // Check if already dismissed today
    const dismissed = sessionStorage.getItem('streakBannerDismissed');
    if (dismissed === new Date().toDateString()) return;

    checkStreakRisk();
  }, []);

  const checkStreakRisk = async () => {
    try {
      const progress = await getUserProgress();
      if (progress.currentStreak === 0) return;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const hasStudiedToday = progress.lastStudyDate === todayStr;

      if (!hasStudiedToday) {
        setStreak(progress.currentStreak);
        setIsVisible(true);
      }
    } catch (e) {
      console.warn('StreakAtRiskBanner: check failed:', e);
    }
  };

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('streakBannerDismissed', new Date().toDateString());
  };

  const handleStudy = () => {
    dismiss();
    onStartQuick();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50"
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          role="alert"
          aria-live="assertive"
        >
          <div className="mx-3 mt-3 md:mx-auto md:max-w-lg
                          rounded-2xl overflow-hidden
                          bg-gradient-to-r from-orange-500/90 to-red-500/90
                          backdrop-blur-lg
                          shadow-lg shadow-orange-500/20
                          border border-orange-400/30">
            <div className="flex items-center gap-3 p-3.5">
              {/* Warning icon with pulse */}
              <motion.div
                className="flex-shrink-0 size-10 rounded-full
                           bg-white/20 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <AlertTriangle className="size-5 text-white" />
              </motion.div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">
                  {language === 'ja'
                    ? `${streak}日連続ストリークが途切れそう!`
                    : `Your ${streak}-day streak is at risk!`}
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  {language === 'ja'
                    ? '今日まだ学習していません'
                    : "You haven't studied today"}
                </p>
              </div>

              {/* Quick action */}
              <button
                onClick={handleStudy}
                className="flex-shrink-0 px-3.5 py-2 rounded-xl
                           bg-white text-orange-600 font-bold text-sm
                           hover:bg-orange-50 transition-colors
                           min-w-[44px] min-h-[44px]
                           flex items-center gap-1.5"
              >
                <Zap className="size-4" />
                {language === 'ja' ? '学習' : 'Study'}
              </button>

              {/* Dismiss */}
              <button
                onClick={dismiss}
                className="flex-shrink-0 p-2 rounded-full
                           text-white/60 hover:text-white hover:bg-white/10
                           transition-colors min-w-[44px] min-h-[44px]
                           flex items-center justify-center"
                aria-label={language === 'ja' ? '閉じる' : 'Dismiss'}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
