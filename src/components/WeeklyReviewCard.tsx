/**
 * Weekly PDCA Review Card
 * Appears on dashboard once per week to walk user through results review.
 * Multi-step inline card: Results → Goals → Adjustments → Commit
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ChevronRight, ChevronLeft, X, CheckCircle2, RefreshCw, BarChart3 } from 'lucide-react';
import { historyService } from '../lib/database';
import { getUserProgress } from '../services/gamificationService';

interface WeeklyReviewCardProps {
  language: 'ja' | 'en';
  onDismiss: () => void;
  onNavigate?: (view: string) => void;
}

interface WeeklyStats {
  problemsSolved: number;
  accuracy: number;
  prevAccuracy: number;
  streak: number;
  studyDays: number;
}

export function WeeklyReviewCard({ language, onDismiss, onNavigate }: WeeklyReviewCardProps) {
  const [step, setStep] = useState(0);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkShouldShow();
  }, []);

  const checkShouldShow = async () => {
    // Show once per week
    const lastShown = localStorage.getItem('weeklyReviewLastShown');
    const now = new Date();
    if (lastShown) {
      const lastDate = new Date(lastShown);
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < 7) return; // Not yet a week
    }

    // Need at least some activity to show review
    const allHistory = await historyService.getAll();
    if (allHistory.length < 5) return;

    await loadStats();
    setIsVisible(true);
  };

  const loadStats = async () => {
    const allHistory = await historyService.getAll();
    const progress = await getUserProgress();

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeek = allHistory.filter(h => new Date(h.timestamp) >= weekAgo);
    const lastWeek = allHistory.filter(h => {
      const d = new Date(h.timestamp);
      return d >= twoWeeksAgo && d < weekAgo;
    });

    const thisWeekAccuracy = thisWeek.length > 0
      ? Math.round((thisWeek.filter(h => h.isCorrect).length / thisWeek.length) * 100)
      : 0;
    const lastWeekAccuracy = lastWeek.length > 0
      ? Math.round((lastWeek.filter(h => h.isCorrect).length / lastWeek.length) * 100)
      : 0;

    // Count unique study days this week
    const studyDays = new Set(
      thisWeek.map(h => new Date(h.timestamp).toDateString())
    ).size;

    setStats({
      problemsSolved: thisWeek.length,
      accuracy: thisWeekAccuracy,
      prevAccuracy: lastWeekAccuracy,
      streak: progress.currentStreak,
      studyDays,
    });
  };

  const handleDismiss = () => {
    localStorage.setItem('weeklyReviewLastShown', new Date().toISOString());
    setIsVisible(false);
    onDismiss();
  };

  const handleCommit = () => {
    localStorage.setItem('weeklyReviewLastShown', new Date().toISOString());
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible || !stats) return null;

  const accuracyTrend = stats.accuracy - stats.prevAccuracy;
  const TrendIcon = accuracyTrend > 0 ? TrendingUp : accuracyTrend < 0 ? TrendingDown : Minus;
  const trendColor = accuracyTrend > 0 ? 'text-green-400' : accuracyTrend < 0 ? 'text-red-400' : 'text-gray-400';

  const steps = [
    // Step 0: This week's results
    {
      title: language === 'ja' ? '今週の結果' : "This Week's Results",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-xs text-gray-400">{language === 'ja' ? '問題数' : 'Problems'}</p>
              <p className="text-lg font-bold text-white">{stats.problemsSolved}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-xs text-gray-400">{language === 'ja' ? '正答率' : 'Accuracy'}</p>
              <div className="flex items-center gap-1">
                <p className="text-lg font-bold text-white">{stats.accuracy}%</p>
                <TrendIcon className={`size-4 ${trendColor}`} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-xs text-gray-400">{language === 'ja' ? '学習日数' : 'Study days'}</p>
              <p className="text-lg font-bold text-white">{stats.studyDays}/7</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-xs text-gray-400">{language === 'ja' ? 'ストリーク' : 'Streak'}</p>
              <p className="text-lg font-bold text-white">🔥 {stats.streak}</p>
            </div>
          </div>
        </div>
      ),
    },
    // Step 1: Assessment
    {
      title: language === 'ja' ? '振り返り' : 'Assessment',
      content: (
        <div className="space-y-3">
          {accuracyTrend > 0 && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-300">
                {language === 'ja'
                  ? `✅ 正答率が先週比+${accuracyTrend}%上昇しました!`
                  : `✅ Accuracy improved by +${accuracyTrend}% from last week!`}
              </p>
            </div>
          )}
          {accuracyTrend < 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-300">
                {language === 'ja'
                  ? `⚠️ 正答率が先週比${accuracyTrend}%下がりました。弱点分野を見直しましょう。`
                  : `⚠️ Accuracy dropped by ${accuracyTrend}%. Consider reviewing weak areas.`}
              </p>
            </div>
          )}
          {accuracyTrend === 0 && stats.prevAccuracy > 0 && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-300">
                {language === 'ja'
                  ? '📊 正答率は先週と同水準です。安定した学習ペースです。'
                  : '📊 Accuracy stayed consistent. Stable learning pace.'}
              </p>
            </div>
          )}
          {stats.studyDays < 4 && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-purple-300">
                {language === 'ja'
                  ? `💡 今週は${stats.studyDays}日学習しました。毎日少しずつ続けると効果的です。`
                  : `💡 You studied ${stats.studyDays} days. Daily practice is more effective.`}
              </p>
            </div>
          )}
        </div>
      ),
    },
    // Step 2: Next week commitment
    {
      title: language === 'ja' ? '来週の方針' : 'Next Week',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            {language === 'ja'
              ? '来週も同じペースで続けますか？'
              : 'Continue at the same pace next week?'}
          </p>
          <div className="space-y-2">
            <motion.button
              onClick={handleCommit}
              className="w-full p-3 rounded-xl bg-green-500/15 border border-green-500/30
                         text-green-300 text-sm font-medium text-left
                         hover:bg-green-500/25 transition-colors flex items-center gap-3"
              whileTap={{ scale: 0.98 }}
            >
              <CheckCircle2 className="size-5 flex-shrink-0" />
              {language === 'ja' ? '現在のプランを維持' : 'Keep current plan'}
            </motion.button>
            <motion.button
              onClick={() => { handleCommit(); onNavigate?.('studyPlanDashboard'); }}
              className="w-full p-3 rounded-xl bg-purple-500/15 border border-purple-500/30
                         text-purple-300 text-sm font-medium text-left
                         hover:bg-purple-500/25 transition-colors flex items-center gap-3"
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="size-5 flex-shrink-0" />
              {language === 'ja' ? 'プランを調整する' : 'Adjust plan'}
            </motion.button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="rounded-2xl overflow-hidden border border-indigo-500/20
                 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent
                 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <BarChart3 className="size-3.5 text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold text-white">
            {language === 'ja' ? '週次レビュー' : 'Weekly Review'}
          </h3>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 px-4 pb-3">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300
              ${i === step ? 'w-6 bg-indigo-400' : i < step ? 'w-2 bg-indigo-400/50' : 'w-2 bg-gray-600'}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              {steps[step].title}
            </h4>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {step < steps.length - 1 && (
        <div className="flex justify-between items-center px-4 pb-4">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors py-2"
            >
              <ChevronLeft className="size-3" />
              {language === 'ja' ? '戻る' : 'Back'}
            </button>
          ) : (
            <div />
          )}
          <motion.button
            onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl
                       bg-indigo-500/20 text-indigo-300 text-xs font-medium
                       hover:bg-indigo-500/30 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            {language === 'ja' ? '次へ' : 'Next'}
            <ChevronRight className="size-3" />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
