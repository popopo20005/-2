/**
 * TodayTasksCard - 今日の学習タスク表示カード
 *
 * アクティブな学習プランから今日の学習目標を集計して表示します。
 * 緊急度に応じたグラデーション、カテゴリー別内訳、SM-2復習期限切れ
 * カード数などの詳細情報を含みます。
 */

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, AlertCircle, BookOpen, RefreshCw, ChevronDown, ChevronUp, Play, Moon, SkipForward } from 'lucide-react';
import { getTodayTasksDetailed, getRecommendedProblemsForToday } from '../services/studyPlanGenerator';
import type { TodayTasksDetail, TodayRecommendedProblems } from '../types/studyPlan';
import { EmptyState } from './ui/EmptyState';
import { Badge } from './ui/Badge';
import { quizSessionService, historyService, studyPlanService, problemService, spacedRepetitionService } from '../lib/database';

// ============================================================
// Types
// ============================================================

interface TodayTasksCardProps {
  /** 学習開始ボタンのクリックハンドラー（セッションIDを渡す） */
  onStartStudy?: (sessionId: string) => void;
  /** プラン再作成（レベルチェック付き）への導線 */
  onRecreatePlan?: () => void;
  /** 強制再読み込みトリガー（変更時にキャッシュを無視して再取得） */
  refreshKey?: number;
}

interface ActivePlanInfo {
  name: string;
  examDate: Date;
  targetScore?: number;
  categories: string[];
  averageAccuracy: number;
  progressPercentage: number;
  timeWarning?: string;
}

interface TodayTasksState {
  data: TodayTasksDetail | null;
  recommendedProblems: TodayRecommendedProblems | null;
  activePlans: ActivePlanInfo[];
  hasStudyHistory: boolean | null;
  loading: boolean;
  error: Error | null;
  lastFetchTime: number;
  showProblemList: boolean;
}

// ============================================================
// Constants
// ============================================================

/** キャッシュ有効期限（5分） */
const CACHE_DURATION = 5 * 60 * 1000;

/** 緊急度別グラデーション */
const URGENCY_GRADIENTS = {
  high: 'bg-gradient-to-r from-red-500 to-orange-500 dark:from-red-600 dark:to-orange-600',
  medium: 'bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-600 dark:to-orange-600',
  low: 'bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700',
} as const;

/** SM-2期限切れアラート色 */
const SM2_ALERT_SEVERITY = {
  low: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  medium: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
  high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
} as const;

// ============================================================
// Animation Variants
// ============================================================

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

const buttonVariants = {
  hover: { scale: 1.02, boxShadow: '0 10px 30px rgba(147, 51, 234, 0.3)' },
  tap: { scale: 0.98 },
} as const;

// ============================================================
// Helper Functions
// ============================================================

/**
 * SM-2期限切れ数から重要度を取得
 */
function getSM2AlertSeverity(count: number): 'low' | 'medium' | 'high' {
  if (count >= 31) return 'high';
  if (count >= 11) return 'medium';
  return 'low';
}

/**
 * 推定時間のフォーマット（分 → 時間分）
 */
function formatEstimatedTime(minutes: number): string {
  if (minutes === 0) return '0分';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
}

/**
 * 推定時間の警告メッセージ
 */
function getTimeWarning(minutes: number): string | null {
  if (minutes > 180) return '⚠️ 分割学習を推奨';
  if (minutes > 90) return '⚠️ 長時間の学習です';
  return null;
}

// ============================================================
// Sub Components
// ============================================================

/**
 * StatBox - 統計表示ボックス
 */
const StatBox = memo(({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) => (
  <motion.div
    variants={itemVariants}
    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
  >
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  </motion.div>
));

StatBox.displayName = 'StatBox';

/**
 * CategoryItem - カテゴリー表示アイテム
 */
const CategoryItem = memo(({ name, count }: {
  name: string;
  count: number;
}) => (
  <motion.div
    variants={itemVariants}
    className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
  >
    <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{name}</span>
    <Badge variant="info">{count}問</Badge>
  </motion.div>
));

CategoryItem.displayName = 'CategoryItem';

/**
 * ProblemItem - 個別問題表示アイテム
 */
const ProblemItem = memo(({ title, category, priority }: {
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}) => {
  const priorityColor = {
    high: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    low: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  };

  return (
    <div className={`px-3 py-2 rounded-md border ${priorityColor[priority]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{category}</p>
        </div>
        <Badge variant={priority === 'high' ? 'error' : priority === 'medium' ? 'warning' : 'success'}>
          {priority === 'high' ? '優先' : priority === 'medium' ? '中' : '低'}
        </Badge>
      </div>
    </div>
  );
});

ProblemItem.displayName = 'ProblemItem';

/**
 * ProblemListSection - 問題リストセクション（展開可能）
 */
const ProblemListSection = memo(({ title, icon: Icon, count, color, problems }: {
  title: string;
  icon: any;
  count: number;
  color: string;
  problems: Array<{ title: string; category: string; priority: 'high' | 'medium' | 'low' }>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (count === 0) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{count}問</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2 bg-white dark:bg-gray-800">
              {problems.slice(0, 10).map((problem, index) => (
                <ProblemItem
                  key={index}
                  title={problem.title}
                  category={problem.category}
                  priority={problem.priority}
                />
              ))}
              {problems.length > 10 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  他 {problems.length - 10}問
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ProblemListSection.displayName = 'ProblemListSection';

// ============================================================
// Main Component
// ============================================================

/**
 * TodayTasksCard - メインコンポーネント
 */
export const TodayTasksCard = memo(({ onStartStudy, onRecreatePlan, refreshKey }: TodayTasksCardProps) => {
  // ============================================================
  // State
  // ============================================================

  const [state, setState] = useState<TodayTasksState>({
    data: null,
    recommendedProblems: null,
    activePlans: [],
    hasStudyHistory: null,
    loading: true,
    error: null,
    lastFetchTime: 0,
    showProblemList: false,
  });

  // ============================================================
  // Callbacks
  // ============================================================

  const loadTasks = useCallback(async () => {
    try {
      console.log('[TodayTasksCard] タスクを読み込み中...');
      setState((prev) => ({ ...prev, loading: true }));

      // 並列でタスク詳細・推奨問題・学習履歴・全プランを取得
      const [data, recommendedProblems, history, allPlans] = await Promise.all([
        getTodayTasksDetailed(),
        getRecommendedProblemsForToday(),
        historyService.getAll(),
        studyPlanService.getAll(),
      ]);

      // アクティブプラン情報を整形（isActive=true かつ isCompleted=false かつ 試験日が未来）
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const activePlans: ActivePlanInfo[] = allPlans
        .filter(p => {
          if (!p.isActive || p.isCompleted) return false;
          // 試験日が過去のプランは除外
          const examDate = new Date(p.examDate);
          examDate.setHours(23, 59, 59, 999);
          return examDate >= now;
        })
        .map(p => ({
          name: p.name,
          examDate: p.examDate,
          targetScore: p.targetScore,
          categories: p.targetCategories || [],
          averageAccuracy: p.progress?.averageAccuracy ?? 0,
          progressPercentage: p.progress?.progressPercentage ?? 0,
          timeWarning: p.timeWarning,
        }));

      console.log('[TodayTasksCard] データ取得完了:', {
        totalProblems: data.totalProblems,
        estimatedTime: data.estimatedTime,
        categoryCount: data.categoryBreakdown.size,
        sm2DueCount: data.sm2DueCount,
        urgencyLevel: data.urgencyLevel,
        recommendedProblemsCount: recommendedProblems.totalCount,
        newProblems: recommendedProblems.newProblems.length,
        reviewProblems: recommendedProblems.reviewProblems.length,
        weaknessProblems: recommendedProblems.weaknessProblems.length,
        historyCount: history.length,
        activePlansCount: activePlans.length,
      });

      setState({
        data,
        recommendedProblems,
        activePlans,
        hasStudyHistory: history.length > 0,
        loading: false,
        error: null,
        lastFetchTime: Date.now(),
        showProblemList: false,
      });
    } catch (error) {
      console.error('[TodayTasksCard] データ取得エラー:', error);
      setState({
        data: null,
        recommendedProblems: null,
        activePlans: [],
        hasStudyHistory: null,
        loading: false,
        error: error as Error,
        lastFetchTime: Date.now(),
        showProblemList: false,
      });
    }
  }, []);

  const loadTasksWithCache = useCallback(async () => {
    const now = Date.now();
    // キャッシュが有効な場合はスキップ
    if (state.data && now - state.lastFetchTime < CACHE_DURATION) {
      return;
    }
    await loadTasks();
  }, [state.data, state.lastFetchTime, loadTasks]);

  const handleStartStudy = useCallback(async () => {
    const hasGoals = state.data && state.data.goals.length > 0;

    let orderedProblems: any[] = [];
    let sessionCategory = '今日の学習プラン';

    if (hasGoals) {
      // ===== 日次目標ベース: プランのカテゴリから問題を取得（SM-2優先度順） =====
      try {
        const allProblems = await problemService.getAll();
        const goalCategories = new Set<string>();

        let totalRemaining = 0;
        for (const goal of state.data!.goals) {
          for (const cat of goal.categories) {
            goalCategories.add(cat.name);
          }
          const actual = (goal.actualNewProblems || 0) + (goal.actualReviewProblems || 0);
          totalRemaining += Math.max(0, goal.totalProblemsTarget - actual);
        }

        if (totalRemaining <= 0) {
          console.log('[TodayTasksCard] 今日の目標は達成済みです');
          return;
        }

        // プランのカテゴリに一致する問題のみフィルタリング
        const matchingProblems = allProblems.filter(p =>
          p.category && goalCategories.has(p.category)
        );

        // SM-2優先度でソート: 期限切れ→未学習→期限前
        const now = new Date();
        const problemsWithPriority: Array<{ problem: typeof matchingProblems[0]; priority: number }> = [];

        for (const problem of matchingProblems) {
          if (!problem.id) continue;
          try {
            const card = await spacedRepetitionService.getCardByProblemId(problem.id);
            if (card && card.nextReviewDate && new Date(card.nextReviewDate) <= now) {
              // SM-2期限切れ: 最優先（期限切れ日数が多いほど優先）
              const daysOverdue = Math.floor((now.getTime() - new Date(card.nextReviewDate).getTime()) / (1000 * 60 * 60 * 24));
              problemsWithPriority.push({ problem, priority: 0 - daysOverdue });
            } else if (!card || card.repetitions === 0) {
              // 未学習: 次に優先
              problemsWithPriority.push({ problem, priority: 100 + Math.random() });
            } else {
              // SM-2カードあり・期限前: 最後
              problemsWithPriority.push({ problem, priority: 200 + Math.random() });
            }
          } catch {
            problemsWithPriority.push({ problem, priority: 100 + Math.random() });
          }
        }

        problemsWithPriority.sort((a, b) => a.priority - b.priority);
        orderedProblems = problemsWithPriority.slice(0, totalRemaining).map(p => p.problem);

        // プラン名をセッション名に使用
        const planNames = state.data!.planNames;
        if (planNames && planNames.size > 0) {
          sessionCategory = Array.from(planNames.values()).join(' / ');
        }

        console.log(`[TodayTasksCard] プランベース: カテゴリ=${Array.from(goalCategories).join(',')}, 合計=${orderedProblems.length}/${totalRemaining}問`);
      } catch (e) {
        console.error('[TodayTasksCard] プランベース問題取得エラー:', e);
      }
    }

    // 日次目標から問題が取得できなかった場合、推奨問題にフォールバック
    if (orderedProblems.length === 0 && state.recommendedProblems) {
      const { newProblems, reviewProblems, weaknessProblems, recommendedOrder } = state.recommendedProblems;

      if (recommendedOrder === 'review-first') {
        orderedProblems = [
          ...reviewProblems.map(rp => rp.problem),
          ...weaknessProblems.map(wp => wp.problem),
          ...newProblems.map(np => np.problem),
        ];
      } else if (recommendedOrder === 'weakness-first') {
        orderedProblems = [
          ...weaknessProblems.map(wp => wp.problem),
          ...reviewProblems.map(rp => rp.problem),
          ...newProblems.map(np => np.problem),
        ];
      } else if (recommendedOrder === 'new-first') {
        orderedProblems = [
          ...newProblems.map(np => np.problem),
          ...reviewProblems.map(rp => rp.problem),
          ...weaknessProblems.map(wp => wp.problem),
        ];
      } else {
        const maxLength = Math.max(newProblems.length, reviewProblems.length, weaknessProblems.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < reviewProblems.length) orderedProblems.push(reviewProblems[i].problem);
          if (i < newProblems.length) orderedProblems.push(newProblems[i].problem);
          if (i < weaknessProblems.length) orderedProblems.push(weaknessProblems[i].problem);
        }
      }
      sessionCategory = '弱点分析に基づく推奨問題';
    }

    if (orderedProblems.length === 0) {
      console.warn('[TodayTasksCard] 学習する問題がありません');
      return;
    }

    try {
      const sessionId = `study-plan-${Date.now()}`;
      await quizSessionService.save({
        id: sessionId,
        quizSetId: -1,
        category: sessionCategory,
        problems: orderedProblems,
        currentIndex: 0,
        score: 0,
        answers: [],
        startTime: new Date(),
        isCompleted: false,
        isPaused: false,
      });

      console.log(`[TodayTasksCard] クイズセッション作成: ${sessionId}, 問題数: ${orderedProblems.length}, カテゴリ: ${sessionCategory}`);

      window.dispatchEvent(new CustomEvent('study-session-started'));
      onStartStudy?.(sessionId);
    } catch (error) {
      console.error('[TodayTasksCard] クイズセッション作成エラー:', error);
    }
  }, [state.data, state.recommendedProblems, onStartStudy]);

  // 次の学習日のタスクを先取りして開始
  const handleStartNextDay = useCallback(async () => {
    console.log('[TodayTasksCard] handleStartNextDay called');
    const nextDay = state.data?.nextStudyDay;
    console.log('[TodayTasksCard] nextDay:', nextDay);
    if (!nextDay || nextDay.goals.length === 0) {
      console.warn('[TodayTasksCard] nextDay is null or has no goals, aborting');
      return;
    }

    try {
      const allProblems = await problemService.getAll();
      const goalCategories = new Set<string>();
      let totalTarget = 0;

      for (const goal of nextDay.goals) {
        for (const cat of goal.categories) {
          goalCategories.add(cat.name);
        }
        totalTarget += goal.totalProblemsTarget;
      }

      // ゴールのカテゴリが空の場合、プランのtargetCategoriesにフォールバック
      if (goalCategories.size === 0) {
        const activePlans = await studyPlanService.getActivePlans();
        for (const plan of activePlans) {
          if (plan.targetCategories) {
            for (const cat of plan.targetCategories) goalCategories.add(cat);
          }
        }
        // totalTargetも0の場合、プランの問題数をデフォルトで使用
        if (totalTarget === 0) {
          totalTarget = 10; // デフォルト問題数
        }
      }

      console.log('[TodayTasksCard] 先取り: categories=', Array.from(goalCategories), 'totalTarget=', totalTarget);

      // プランのカテゴリに一致する問題のみフィルタリング
      const matchingProblems = allProblems.filter(p =>
        p.category && goalCategories.has(p.category)
      );

      // SM-2優先度でソート: 期限切れ→未学習→期限前
      const now = new Date();
      const problemsWithPriority: Array<{ problem: typeof matchingProblems[0]; priority: number }> = [];

      for (const problem of matchingProblems) {
        if (!problem.id) continue;
        try {
          const card = await spacedRepetitionService.getCardByProblemId(problem.id);
          if (card && card.nextReviewDate && new Date(card.nextReviewDate) <= now) {
            const daysOverdue = Math.floor((now.getTime() - new Date(card.nextReviewDate).getTime()) / (1000 * 60 * 60 * 24));
            problemsWithPriority.push({ problem, priority: 0 - daysOverdue });
          } else if (!card || card.repetitions === 0) {
            problemsWithPriority.push({ problem, priority: 100 + Math.random() });
          } else {
            problemsWithPriority.push({ problem, priority: 200 + Math.random() });
          }
        } catch {
          problemsWithPriority.push({ problem, priority: 100 + Math.random() });
        }
      }

      problemsWithPriority.sort((a, b) => a.priority - b.priority);
      const orderedProblems = problemsWithPriority.slice(0, totalTarget).map(p => p.problem);

      if (orderedProblems.length === 0) {
        console.warn('[TodayTasksCard] 次の学習日の問題がありません');
        return;
      }

      const planNames = state.data!.planNames;
      const sessionCategory = planNames && planNames.size > 0
        ? `${Array.from(planNames.values()).join(' / ')} (先取り学習)`
        : '先取り学習';

      const sessionId = `study-plan-${Date.now()}`;
      await quizSessionService.save({
        id: sessionId,
        quizSetId: -1,
        category: sessionCategory,
        problems: orderedProblems,
        currentIndex: 0,
        score: 0,
        answers: [],
        startTime: new Date(),
        isCompleted: false,
        isPaused: false,
      });

      console.log(`[TodayTasksCard] 先取り学習セッション作成: ${sessionId}, 問題数: ${orderedProblems.length}`);

      window.dispatchEvent(new CustomEvent('study-session-started'));
      onStartStudy?.(sessionId);
    } catch (error) {
      console.error('[TodayTasksCard] 先取り学習セッション作成エラー:', error);
    }
  }, [state.data, onStartStudy]);

  // ============================================================
  // Effects
  // ============================================================

  useEffect(() => {
    loadTasksWithCache();
  }, [loadTasksWithCache]);

  // refreshKey が変わったらキャッシュを無視して強制再読み込み
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      loadTasks();
    }
  }, [refreshKey, loadTasks]);

  useEffect(() => {
    const handlePlanUpdate = () => {
      loadTasks();
    };

    window.addEventListener('study-plan-updated', handlePlanUpdate);
    window.addEventListener('daily-goal-completed', handlePlanUpdate);

    return () => {
      window.removeEventListener('study-plan-updated', handlePlanUpdate);
      window.removeEventListener('daily-goal-completed', handlePlanUpdate);
    };
  }, [loadTasks]);

  // ============================================================
  // Memoized Values
  // ============================================================

  const topCategories = useMemo(() => {
    if (!state.data?.categoryBreakdown) return [];
    return Array.from(state.data.categoryBreakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [state.data?.categoryBreakdown]);

  const urgencyGradient = useMemo(() => {
    return URGENCY_GRADIENTS[state.data?.urgencyLevel || 'low'];
  }, [state.data?.urgencyLevel]);

  const sm2AlertSeverity = useMemo(() => {
    if (!state.data || state.data.sm2DueCount === 0) return null;
    return getSM2AlertSeverity(state.data.sm2DueCount);
  }, [state.data]);

  const timeWarning = useMemo(() => {
    if (!state.data) return null;
    return getTimeWarning(state.data.estimatedTime);
  }, [state.data?.estimatedTime]);

  // ============================================================
  // Render: Loading
  // ============================================================

  if (state.loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Error
  // ============================================================

  if (state.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="text-center text-red-500 dark:text-red-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-2" />
          <p>データの読み込みに失敗しました</p>
          <button
            onClick={loadTasks}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Empty State (日次目標も推奨問題もない場合のみ)
  // ============================================================

  const hasRecommendedProblems = state.recommendedProblems && state.recommendedProblems.totalCount > 0;
  const hasGoals = state.data && state.data.goals.length > 0;
  const noStudyHistory = state.hasStudyHistory === false;

  if (!hasGoals && !hasRecommendedProblems) {
    // 学習履歴がない場合 → レベルチェック推奨バナー
    if (noStudyHistory && onRecreatePlan) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg p-6"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">📝</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                レベルチェックテストで実力を測定しましょう
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                学習履歴がまだないため、現在のレベルが正確に判定できません。
                <br />
                レベルチェックテスト（10問）を受けると、あなたの実力に合わせた最適な学習プランが作成されます。
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRecreatePlan}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              レベルチェックして新しいプランを作成
            </motion.button>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              ※ 既存のプランは削除されません
            </p>
          </div>
        </motion.div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <EmptyState
          icon={Calendar}
          title="今日の学習タスクはありません"
          description="明日も頑張りましょう！🎉"
        />
      </div>
    );
  }

  // ============================================================
  // Render: Rest Day (休息日 - アクティブプランはあるが学習予定日ではない)
  // ============================================================

  if (state.data?.isRestDay && state.data.restDayInfo) {
    const restInfo = state.data.restDayInfo;
    const hasReviewOnRestDay = restInfo.planDueCount > 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header - Rest Day Gradient */}
        <div className="bg-gradient-to-r from-indigo-400 to-purple-400 dark:from-indigo-600 dark:to-purple-600 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <Moon className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">今日は休息日です</h2>
              <p className="text-sm opacity-90">
                {new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {state.activePlans.length > 0 && (
                <p className="text-xs opacity-85 mt-0.5">
                  📋 {state.activePlans.map(p => p.name).join(' / ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Rest Day Message */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              {restInfo.message}
            </p>
            {restInfo.nextStudyDate && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                次の学習日: {restInfo.nextStudyDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
              </p>
            )}
          </div>

          {/* Long Rest Warning */}
          {restInfo.isLongRest && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠ 復習を完全にスキップすると忘却が進みます。可能な範囲で進めることをおすすめします。
              </p>
            </div>
          )}

          {hasReviewOnRestDay && (
            <>
              {/* Review Stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatBox
                  icon={RefreshCw}
                  label="復習問題"
                  value={`${restInfo.planDueCount}問`}
                  color="bg-green-500"
                />
                <StatBox
                  icon={Clock}
                  label="目安時間"
                  value={`約${Math.ceil(restInfo.planDueCount * 3)}分`}
                  color="bg-indigo-500"
                />
              </div>

              {restInfo.planDueCount > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  💡 一度に全部やる必要はありません。可能な範囲で進めてください。
                </p>
              )}

              {/* Review Button */}
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleStartStudy}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                復習を実施する ({restInfo.planDueCount}問)
              </motion.button>
            </>
          )}

          {/* 先取り学習ボタン（次の学習日がある場合） */}
          {state.data.nextStudyDay && (
            (() => {
              const nextDate = new Date(state.data.nextStudyDay!.date);
              const dateStr = nextDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
              return (
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleStartNextDay}
                  className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2"
                >
                  <SkipForward className="w-5 h-5" />
                  次の学習日を先取り ({dateStr} / {state.data.nextStudyDay!.totalProblems}問)
                </motion.button>
              );
            })()
          )}

          {!hasReviewOnRestDay && !state.data.nextStudyDay && (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                今日は学習タスクがありません。ゆっくり休んでください。
              </p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // 日次目標がなくても推奨問題がある場合 → 推奨問題ベースの学習UIを表示
  if (!hasGoals && hasRecommendedProblems) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className={`${urgencyGradient} px-6 py-4`}>
          <div className="flex items-center gap-3 text-white">
            <Calendar className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">今日のタスク</h2>
              <p className="text-sm opacity-90">
                {new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {state.activePlans.length > 0 && (
                <p className="text-xs opacity-85 mt-0.5">
                  📋 {state.activePlans.map(p => p.name).join(' / ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* アクティブプラン情報 */}
          {state.activePlans.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
              {state.activePlans.map((plan, idx) => (
                <div key={idx} className={`${idx > 0 ? 'mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-700' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                      📚 {plan.name}
                    </span>
                    {plan.targetScore && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-300">
                        目標 {plan.targetScore}点
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400">
                      試験日: {new Date(plan.examDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </span>
                    {plan.categories.length > 0 && (
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 truncate">
                        | {plan.categories.slice(0, 3).join('・')}{plan.categories.length > 3 ? ` 他${plan.categories.length - 3}件` : ''}
                      </span>
                    )}
                  </div>
                  {/* 目標到達度 */}
                  {plan.targetScore != null && plan.targetScore > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-indigo-700 dark:text-indigo-300">
                          推定 {Math.round(plan.averageAccuracy)}% → 目標 {plan.targetScore}点
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {Math.min(100, Math.round((plan.averageAccuracy / plan.targetScore) * 100))}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (plan.averageAccuracy / plan.targetScore) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {/* 時間不足警告 */}
                  {plan.timeWarning && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      ⚠️ {plan.timeWarning}
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2">
                ※ 今日は日次目標の設定日ではないため、弱点分析に基づく推奨問題を表示しています
              </p>
            </div>
          )}

          {/* 学習履歴なし → レベルチェック推奨バナー */}
          {noStudyHistory && onRecreatePlan && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">📝</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    レベルチェックで精度を上げませんか？
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    学習履歴がまだないため、現在のプランはデフォルト値で計算されています。
                  </p>
                  <button
                    onClick={onRecreatePlan}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                  >
                    レベルチェックして再作成 →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 推奨問題サマリー */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBox
              icon={RefreshCw}
              label="復習問題"
              value={`${state.recommendedProblems!.reviewProblems.length}問`}
              color="bg-green-500"
            />
            <StatBox
              icon={AlertCircle}
              label="弱点強化"
              value={`${state.recommendedProblems!.weaknessProblems.length}問`}
              color="bg-orange-500"
            />
            <StatBox
              icon={BookOpen}
              label="新規問題"
              value={`${state.recommendedProblems!.newProblems.length}問`}
              color="bg-blue-500"
            />
          </div>

          {/* Problem List Toggle */}
          <button
            onClick={() => setState((prev) => ({ ...prev, showProblemList: !prev.showProblemList }))}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span>📋 推奨問題リスト ({state.recommendedProblems!.totalCount}問)</span>
            {state.showProblemList ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {state.showProblemList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                <ProblemListSection
                  title="復習問題（SM-2期限切れ）"
                  icon={RefreshCw}
                  count={state.recommendedProblems!.reviewProblems.length}
                  color="bg-green-500"
                  problems={state.recommendedProblems!.reviewProblems.map((rp) => ({
                    title: rp.problem.question || `問題 #${rp.problem.id}`,
                    category: rp.category,
                    priority: rp.priority,
                  }))}
                />
                <ProblemListSection
                  title="弱点強化問題"
                  icon={AlertCircle}
                  count={state.recommendedProblems!.weaknessProblems.length}
                  color="bg-orange-500"
                  problems={state.recommendedProblems!.weaknessProblems.map((wp) => ({
                    title: wp.problem.question || `問題 #${wp.problem.id}`,
                    category: wp.category,
                    priority: wp.priority,
                  }))}
                />
                <ProblemListSection
                  title="新規問題"
                  icon={BookOpen}
                  count={state.recommendedProblems!.newProblems.length}
                  color="bg-blue-500"
                  problems={state.recommendedProblems!.newProblems.map((np) => ({
                    title: np.problem.question || `問題 #${np.problem.id}`,
                    category: np.category,
                    priority: np.priority,
                  }))}
                />
                {state.recommendedProblems!.recommendedOrder && (
                  <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      💡 推奨順序:
                      {state.recommendedProblems!.recommendedOrder === 'review-first' && ' 復習 → 弱点 → 新規'}
                      {state.recommendedProblems!.recommendedOrder === 'weakness-first' && ' 弱点 → 復習 → 新規'}
                      {state.recommendedProblems!.recommendedOrder === 'new-first' && ' 新規 → 復習 → 弱点'}
                      {state.recommendedProblems!.recommendedOrder === 'mixed' && ' バランス良く混合'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleStartStudy}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            学習開始 ({state.recommendedProblems!.totalCount}問)
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ============================================================
  // Render: Main Content
  // ============================================================

  const data = state.data!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className={`${urgencyGradient} px-6 py-4`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">今日のタスク</h2>
              <p className="text-sm opacity-90">
                {new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {data.planNames && data.planNames.size > 0 && (
                <p className="text-xs opacity-75 mt-0.5">
                  📋 {Array.from(data.planNames.values()).join(' / ')}
                </p>
              )}
            </div>
          </div>
          {data.urgencyLevel === 'high' && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">今日は学習量が多めです</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Plan Names */}
        {data.multiplePlans && (
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {data.todayStudyDayCount}個のプランから
            </span>
            <Badge variant="info">{data.todayStudyDayCount}</Badge>
          </motion.div>
        )}

        {/* Stats Grid */}
        {(() => {
          const totalTarget = data.goals.reduce((sum, g) => sum + g.totalProblemsTarget, 0);
          const totalActual = data.goals.reduce((sum, g) => sum + (g.actualNewProblems || 0) + (g.actualReviewProblems || 0), 0);
          const remaining = Math.max(0, totalTarget - totalActual);

          return (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <StatBox
                icon={BookOpen}
                label="学習問題（残り）"
                value={`${remaining}問`}
                color="bg-purple-500"
              />
            </div>
          );
        })()}

        {/* Progress Bar */}
        {(() => {
          const totalTarget = data.goals.reduce((sum, g) => sum + g.totalProblemsTarget, 0);
          const completed = data.goals.reduce((sum, g) => sum + (g.actualNewProblems || 0) + (g.actualReviewProblems || 0), 0);
          const pct = totalTarget > 0 ? Math.min(100, Math.round((completed / totalTarget) * 100)) : 0;
          if (totalTarget === 0) return null;
          return (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>進捗: {completed}/{totalTarget}問</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                />
              </div>
            </div>
          );
        })()}

        {/* SM-2 Due Alert */}
        {sm2AlertSeverity && (
          <motion.div
            variants={itemVariants}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${SM2_ALERT_SEVERITY[sm2AlertSeverity]}`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">SM-2復習期限切れ: {data.sm2DueCount}枚</span>
              {sm2AlertSeverity === 'high' && <p className="mt-1">大量の復習が必要です</p>}
              {sm2AlertSeverity === 'medium' && <p className="mt-1">優先的に復習してください</p>}
            </div>
          </motion.div>
        )}

        {/* Category Breakdown */}
        {topCategories.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              カテゴリー別内訳（トップ3）
            </h3>
            {topCategories.map(([name, count]) => (
              <CategoryItem key={name} name={name} count={count} />
            ))}
          </div>
        )}

        {/* Estimated Time */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
        >
          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <div>
            <div className="text-sm text-purple-700 dark:text-purple-300">推定学習時間</div>
            <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {formatEstimatedTime(data.estimatedTime)}
            </div>
            {timeWarning && (
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">{timeWarning}</div>
            )}
          </div>
        </motion.div>

        {/* Problem List Toggle */}
        {state.recommendedProblems && state.recommendedProblems.totalCount > 0 && (
          <motion.div variants={itemVariants}>
            <button
              onClick={() => setState((prev) => ({ ...prev, showProblemList: !prev.showProblemList }))}
              className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span>📋 推奨問題リスト ({state.recommendedProblems.totalCount}問)</span>
              {state.showProblemList ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {state.showProblemList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 space-y-3 overflow-hidden"
                >
                  {/* Review Problems */}
                  <ProblemListSection
                    title="復習問題（SM-2期限切れ）"
                    icon={RefreshCw}
                    count={state.recommendedProblems.reviewProblems.length}
                    color="bg-green-500"
                    problems={state.recommendedProblems.reviewProblems.map((rp) => ({
                      title: rp.problem.question || `問題 #${rp.problem.id}`,
                      category: rp.category,
                      priority: rp.priority,
                    }))}
                  />

                  {/* Weakness Problems */}
                  <ProblemListSection
                    title="弱点強化問題"
                    icon={AlertCircle}
                    count={state.recommendedProblems.weaknessProblems.length}
                    color="bg-orange-500"
                    problems={state.recommendedProblems.weaknessProblems.map((wp) => ({
                      title: wp.problem.question || `問題 #${wp.problem.id}`,
                      category: wp.category,
                      priority: wp.priority,
                    }))}
                  />

                  {/* New Problems */}
                  <ProblemListSection
                    title="新規問題"
                    icon={BookOpen}
                    count={state.recommendedProblems.newProblems.length}
                    color="bg-blue-500"
                    problems={state.recommendedProblems.newProblems.map((np) => ({
                      title: np.problem.question || `問題 #${np.problem.id}`,
                      category: np.category,
                      priority: np.priority,
                    }))}
                  />

                  {/* Recommended Order Info */}
                  {state.recommendedProblems.recommendedOrder && (
                    <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <p className="text-xs text-indigo-700 dark:text-indigo-300">
                        💡 推奨順序:
                        {state.recommendedProblems.recommendedOrder === 'review-first' && ' 復習 → 弱点 → 新規'}
                        {state.recommendedProblems.recommendedOrder === 'weakness-first' && ' 弱点 → 復習 → 新規'}
                        {state.recommendedProblems.recommendedOrder === 'new-first' && ' 新規 → 復習 → 弱点'}
                        {state.recommendedProblems.recommendedOrder === 'mixed' && ' バランス良く混合'}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Action Button */}
        {(() => {
          const totalTarget = data.goals.reduce((sum, g) => sum + g.totalProblemsTarget, 0);
          const totalActual = data.goals.reduce((sum, g) => sum + (g.actualNewProblems || 0) + (g.actualReviewProblems || 0), 0);
          const remaining = Math.max(0, totalTarget - totalActual);
          const isCompleted = remaining === 0;

          if (isCompleted && data.nextStudyDay) {
            const nextDate = new Date(data.nextStudyDay.date);
            const dateStr = nextDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-green-600 dark:text-green-400 text-sm font-semibold">✓ 今日の目標達成済み</span>
                </div>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleStartNextDay}
                  className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2"
                >
                  <SkipForward className="w-5 h-5" />
                  次の学習日を先取り ({dateStr} / {data.nextStudyDay.totalProblems}問)
                </motion.button>
              </div>
            );
          }

          return (
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleStartStudy}
              disabled={isCompleted}
              className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2 ${
                isCompleted
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
              }`}
            >
              <Play className="w-5 h-5" />
              {isCompleted ? '今日の目標達成済み ✓' : `学習開始 (${remaining}問)`}
            </motion.button>
          );
        })()}
      </div>
    </motion.div>
  );
});

TodayTasksCard.displayName = 'TodayTasksCard';
