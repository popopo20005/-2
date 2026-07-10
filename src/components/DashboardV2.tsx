import { useState, useEffect, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Play, BarChart3, Plus, Share2, Clock, X, Star, Menu, TrendingDown, FileSearch } from 'lucide-react';
import type { View, QuizSession } from '../types';
import { db, historyService, spacedRepetitionService, quizSetService, quizSessionService } from '../lib/database';
import { calculatePersonalizedTime } from '../services/responseTimeService';
import { getRecommendationPenalty } from '../services/quizCompletionService';
import type { QuizSet } from '../types';
import { StudyCalendar } from './StudyCalendar';
import { debugLog } from '../utils/debug';
import { PerformanceMonitor } from '../services/performanceOptimizer';
import { detectTopWeaknesses } from '../services/weaknessDetectionService';
import type { WeakArea } from '../types/weakness';
import { generateRecommendedProblems } from '../services/recommendationEngine';
import type { RecommendedProblem } from '../types/recommendation';
import { SmartReviewPanel } from './SmartReviewPanel';
import { XPProgressWidget } from './gamification/XPProgressWidget';
import { getUserProgress } from '../services/gamificationService';
import { Quick5Button } from './Quick5Button';
import { StreakIndicator } from './gamification/StreakIndicator';
import { WeeklyReviewCard } from './WeeklyReviewCard';
import { CategoryMasteryLevels } from './CategoryMasteryLevels';

// Performance monitoring instance
const performanceMonitor = new PerformanceMonitor();

interface DashboardV2Props {
  onNavigate: (view: View, options?: { quizSetId?: number; problemIds?: number[]; sessionId?: string }) => void;
  language?: 'ja' | 'en';
}

interface WeeklyData {
  day: string;
  time: number; // minutes
  isToday: boolean;
  date: Date;
}

const DashboardV2 = ({ onNavigate, language = 'ja' }: DashboardV2Props) => {
  debugLog('🔥 DashboardV2 LOADED - FIGMA DESIGN VERSION');

  const [userName, setUserName] = useState('田中 太郎');
  const [xp, setXp] = useState(1542);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [recommendedQuizSet, setRecommendedQuizSet] = useState<QuizSet | null>(null);
  const [level, setLevel] = useState(12);
  const [streak, setStreak] = useState(7);
  const [totalProblems, setTotalProblems] = useState(542);
  const [accuracy, setAccuracy] = useState(85);
  const [totalStudyTime, setTotalStudyTime] = useState(25);
  const [dueCardsCount, setDueCardsCount] = useState(5);
  const [savedSessions, setSavedSessions] = useState<QuizSession[]>([]);
  const [sessionQuizSetNames, setSessionQuizSetNames] = useState<Map<string, string>>(new Map());
  const [topWeaknesses, setTopWeaknesses] = useState<WeakArea[]>([]);
  const [recommendedProblems, setRecommendedProblems] = useState<RecommendedProblem[]>([]);

  // Memory stage statistics
  const [memoryStages, setMemoryStages] = useState<{
    acquisition: number;
    consolidation: number;
    storage: number;
    automaticity: number;
  }>({ acquisition: 0, consolidation: 0, storage: 0, automaticity: 0 });

  // Animated values for count-up effect
  const animatedLevel = useMotionValue(0);
  const animatedXP = useMotionValue(0);
  const animatedProblems = useMotionValue(0);
  const animatedAccuracy = useMotionValue(0);
  const animatedTime = useMotionValue(0);
  const animatedStreak = useMotionValue(0);

  const days = language === 'ja' ? ['月', '火', '水', '木', '金', '土', '日'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Format time for display (minutes to hours/minutes)
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '';
    if (minutes < 60) {
      return language === 'ja' ? `${minutes}分` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return language === 'ja' ? `${hours}時間` : `${hours}h`;
    }
    return language === 'ja' ? `${hours}時間${remainingMinutes}分` : `${hours}h${remainingMinutes}m`;
  };

  // Format date for tooltip
  const formatDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return language === 'ja' ? `${month}/${day}` : `${month}/${day}`;
  };

  // Animate numbers when they change
  useEffect(() => {
    const levelControl = animate(animatedLevel, level, { duration: 1, ease: 'easeOut' });
    const xpControl = animate(animatedXP, xp, { duration: 1.2, ease: 'easeOut' });
    const problemsControl = animate(animatedProblems, totalProblems, { duration: 1, ease: 'easeOut' });
    const accuracyControl = animate(animatedAccuracy, accuracy, { duration: 1.2, ease: 'easeOut' });
    const timeControl = animate(animatedTime, totalStudyTime, { duration: 1, ease: 'easeOut' });
    const streakControl = animate(animatedStreak, streak, { duration: 1, ease: 'easeOut' });

    return () => {
      levelControl.stop();
      xpControl.stop();
      problemsControl.stop();
      accuracyControl.stop();
      timeControl.stop();
      streakControl.stop();
    };
  }, [level, xp, totalProblems, accuracy, totalStudyTime, streak, animatedLevel, animatedXP, animatedProblems, animatedAccuracy, animatedTime, animatedStreak]);

  const displayedLevel = useTransform(animatedLevel, Math.round);
  const displayedXP = useTransform(animatedXP, Math.round);
  const displayedProblems = useTransform(animatedProblems, Math.round);
  const displayedAccuracy = useTransform(animatedAccuracy, Math.round);
  const displayedTime = useTransform(animatedTime, Math.round);
  const displayedStreak = useTransform(animatedStreak, Math.round);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    return performanceMonitor.measure('Dashboard: Load All Data', async () => {
      try {
        // Load user name from localStorage
        const savedUserName = localStorage.getItem('userName') || '田中 太郎';
        setUserName(savedUserName);

        // Load history and calculate stats
        const allHistory = await performanceMonitor.measure('Dashboard: Load History', () => historyService.getAll());
      // Load gamification progress from IndexedDB (persistent)
      const userProgress = await getUserProgress();
      setXp(userProgress.totalXP);
      setLevel(userProgress.level);

      // Calculate total problems attempted
      setTotalProblems(allHistory.length);

      // Calculate accuracy
      const correctCount = allHistory.filter(h => h.isCorrect).length;
      const calculatedAccuracy = allHistory.length > 0 ? Math.round((correctCount / allHistory.length) * 100) : 0;
      setAccuracy(calculatedAccuracy);

      // Calculate total study time (mock for now)
      setTotalStudyTime(25); // hours

      // Streak from gamification service (persistent)
      setStreak(userProgress.currentStreak);

      // Load weekly study time data
      await performanceMonitor.measure('Dashboard: Load Weekly Data', () => loadWeeklyData());

      // Load recommended quiz set and due cards count
      const allQuizSets = await performanceMonitor.measure('Dashboard: Load Quiz Sets', () => quizSetService.getAll());

      // すべての復習期限カードを取得（問題集に紐付いていないカードも含む）
      const allDueCards = await performanceMonitor.measure('Dashboard: Load Due Cards', () => spacedRepetitionService.getDueCards(1000));
      setDueCardsCount(allDueCards.length);
      debugLog('📊 Total due cards (all):', allDueCards.length);

      let totalDueCards = 0;
      if (allQuizSets.length > 0) {
        const quizSetWithCounts = await Promise.all(
          allQuizSets.map(async (qs) => {
            if (!qs.id) return { quizSet: qs, dueCount: 0, problemCount: 0, penalty: 0 };
            const cards = await spacedRepetitionService.getDueCardsByQuizSet(qs.id);
            const penalty = getRecommendationPenalty(qs.id);
            return {
              quizSet: qs,
              dueCount: cards.length,
              problemCount: qs.problemIds?.length || 0,
              penalty
            };
          })
        );
        totalDueCards = quizSetWithCounts.reduce((acc, q) => acc + q.dueCount, 0);

        // 復習カード数でソート（完了履歴でペナルティ適用）、同数なら問題数が多い方を優先
        const recommended = quizSetWithCounts
          .filter(q => q.problemCount > 0) // 問題がある問題集のみ
          .sort((a, b) => {
            // ペナルティを考慮したスコアで比較
            const scoreA = a.dueCount - a.penalty;
            const scoreB = b.dueCount - b.penalty;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return b.problemCount - a.problemCount;
          })[0];

        setRecommendedQuizSet(recommended?.quizSet || null);
        debugLog('📚 Recommended quiz set:', recommended?.quizSet, 'Problems:', recommended?.problemCount, 'Penalty:', recommended?.penalty);
        debugLog('📊 Due cards in quiz sets:', totalDueCards);
      }

      // Load saved sessions
      const pausedSessions = await performanceMonitor.measure('Dashboard: Load Paused Sessions', () => quizSessionService.getPausedSessions());

      // 各セッションの問題集名を取得
      const namesMap = new Map<string, string>();
      debugLog('🔍 Loading quiz set names for', pausedSessions.length, 'sessions...');

      for (const session of pausedSessions) {
        debugLog(`📋 Session ${session.id}:`, {
          quizSetId: session.quizSetId,
          category: session.category,
          problems: session.problems.length
        });

        if (session.quizSetId) {
          try {
            const quizSet = await quizSetService.getById(session.quizSetId);
            if (quizSet) {
              namesMap.set(session.id, quizSet.name);
              debugLog(`✅ Found quiz set name for session ${session.id}: "${quizSet.name}"`);
            } else {
              debugLog(`⚠️ Quiz set not found for ID: ${session.quizSetId}`);
            }
          } catch (error) {
            debugLog('❌ Failed to load quiz set name for session:', session.id, error);
          }
        } else {
          debugLog(`ℹ️ Session ${session.id} has no quizSetId, using category or default`);
        }
      }

      debugLog('📝 Quiz set names map:', Array.from(namesMap.entries()));
      setSessionQuizSetNames(namesMap);
      setSavedSessions(pausedSessions);
      debugLog('💾 Saved sessions:', pausedSessions.length);

      // Load memory stage statistics
      const stageStats = await performanceMonitor.measure('Dashboard: Load Memory Stats', () => spacedRepetitionService.getMemoryStageStats());
      debugLog('🧠 Memory stage stats:', stageStats);
      setMemoryStages(stageStats);

      // Load weakness data
      const weaknesses = await performanceMonitor.measure('Dashboard: Load Weaknesses', () => detectTopWeaknesses());
      debugLog('📉 Top weaknesses:', weaknesses);
      setTopWeaknesses(weaknesses);

      // Load recommended problems (Top 10)
      const recommended = await performanceMonitor.measure('Dashboard: Load Recommendations', () => generateRecommendedProblems(10));
      debugLog('🎯 Recommended problems:', recommended);
      setRecommendedProblems(recommended);

      setIsLoading(false);

      // Log performance summary
      const summaryStats = performanceMonitor.getAllStats();
      debugLog('📊 Dashboard Performance Summary:', summaryStats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setIsLoading(false);
    }
    });
  };

  const loadWeeklyData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate date range (7 days ago to today)
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // 🚀 Performance: Single query for all 7 days (was 7 separate queries)
      const allSessions = await performanceMonitor.measure('Weekly Data: Query Sessions', () =>
        db.studyTimeSessions
          .where('startTime')
          .between(sevenDaysAgo, tomorrow, true, false)
          .toArray()
      );

      debugLog(`🚀 Fetched ${allSessions.length} sessions in single query for 7 days`);

      // Create a map to aggregate study time by date
      const dailyTimeMap = new Map<string, number>();

      allSessions.forEach((session) => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        const dateKey = sessionDate.toISOString().split('T')[0];
        const currentTime = dailyTimeMap.get(dateKey) || 0;
        dailyTimeMap.set(dateKey, currentTime + (session.duration || 0));
      });

      // Generate weekly data for display
      const weekData: WeeklyData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];

        // Calculate day of week for display (Mon=0, Sun=6)
        const dayOfWeek = (date.getDay() + 6) % 7;
        const isToday = i === 0;

        // Get study time from map (in seconds)
        const dayStudySeconds = dailyTimeMap.get(dateKey) || 0;
        const dayStudyMinutes = Math.round(dayStudySeconds / 60);

        weekData.push({
          day: days[dayOfWeek],
          time: dayStudyMinutes,
          isToday,
          date: new Date(date),
        });
      }

      debugLog('📊 Weekly study data loaded:', weekData);
      setWeeklyData(weekData);
    } catch (error) {
      console.error('Failed to load weekly data:', error);
      // Set empty data on error
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setWeeklyData(
        Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (6 - i));
          return {
            day: days[i],
            time: 0,
            isToday: false,
            date: new Date(date),
          };
        })
      );
    }
  };

  // オレンジのカード用：おすすめ問題集を選択状態でクイズ選択画面へ
  const handleStartRecommendedQuiz = async () => {
    debugLog('🎮 Opening quiz selection with recommended:', recommendedQuizSet);

    if (recommendedQuizSet && recommendedQuizSet.id && recommendedQuizSet.problemIds && recommendedQuizSet.problemIds.length > 0) {
      // 推奨問題集に対応する保存済みセッションがあるかチェック
      const savedSession = savedSessions.find(s => s.quizSetId === recommendedQuizSet.id);

      if (savedSession) {
        // セッションがある場合は確認ダイアログを表示
        const progress = Math.round((savedSession.currentIndex / savedSession.problems.length) * 100);
        const message = language === 'ja'
          ? `この問題集に途中保存されたセッションがあります。\n\n進捗: ${savedSession.currentIndex + 1}/${savedSession.problems.length}問 (${progress}%)\n正解: ${savedSession.score}問\n\n続きから再開しますか？`
          : `There is a saved session for this quiz set.\n\nProgress: ${savedSession.currentIndex + 1}/${savedSession.problems.length} (${progress}%)\nCorrect: ${savedSession.score}\n\nResume from where you left off?`;

        if (confirm(message)) {
          // 続きから再開
          debugLog('✅ Resuming saved session:', savedSession.id);
          onNavigate('quiz', { sessionId: savedSession.id });
          return;
        } else {
          // ユーザーが「キャンセル」を選択（新規開始）→ 古いセッションを削除
          debugLog('🗑️ Deleting old session:', savedSession.id);
          await quizSessionService.delete(savedSession.id);
        }
      }

      // 保存済みセッションがない場合、またはユーザーが新規開始を選択した場合
      debugLog('✅ Opening quiz selection with quiz set:', recommendedQuizSet.id, 'Problems:', recommendedQuizSet.problemIds.length);
      onNavigate('quiz', { quizSetId: recommendedQuizSet.id });
    } else {
      // 問題集がない場合はクイズ選択画面へ
      debugLog('⚠️ No recommended quiz set, opening quiz selection');
      onNavigate('quiz');
    }
  };

  // 紫のPlayボタン用：クイズ選択画面へ（何も選択されていない）
  const handleOpenQuizSelection = () => {
    debugLog('🎮 Opening quiz selection (no preset)');
    onNavigate('quiz');
  };

  // 問題数から推奨時間を計算する関数（問題タイプとユーザー設定を考慮）
  const calculateRecommendedTime = (count: number): string => {
    // 新しいresponseTimeServiceを使用してパーソナライズされた時間を計算
    const result = calculatePersonalizedTime(count, 0.5);

    if (result.isReduced) {
      debugLog('📊 推奨時間を30％短縮して表示（学習意欲向上のため）');
    }

    return language === 'ja' ? result.formatted : result.formatted.replace('時間', ' hr').replace('分', ' min');
  };

  // 保存されたセッションを削除
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // カードのクリックイベントを防ぐ

    const confirmMessage = language === 'ja'
      ? 'このセッションを削除してもよろしいですか？\n進捗は失われます。'
      : 'Are you sure you want to delete this session?\nProgress will be lost.';

    if (confirm(confirmMessage)) {
      try {
        await quizSessionService.delete(sessionId);
        debugLog('✅ Session deleted:', sessionId);

        // セッションリストを再読み込み
        const updatedSessions = await quizSessionService.getPausedSessions();
        setSavedSessions(updatedSessions);

        // 問題集名マップも更新
        const namesMap = new Map<string, string>();
        for (const session of updatedSessions) {
          if (session.quizSetId) {
            try {
              const quizSet = await quizSetService.getById(session.quizSetId);
              if (quizSet) {
                namesMap.set(session.id, quizSet.name);
              }
            } catch (error) {
              debugLog('Failed to load quiz set name:', error);
            }
          }
        }
        setSessionQuizSetNames(namesMap);
      } catch (error) {
        console.error('Failed to delete session:', error);
        alert(language === 'ja' ? 'セッションの削除に失敗しました' : 'Failed to delete session');
      }
    }
  };

  // 赤の復習期限カード用：復習期限のカードを直接開始
  const handleStartDueCardsReview = async () => {
    debugLog('🎯 Starting due cards review...');
    try {
      // すべての復習期限カードを取得（limit=1000で十分な数を取得）
      const dueCards = await spacedRepetitionService.getDueCards(1000);
      debugLog('📋 Found due cards:', dueCards.length);

      if (dueCards.length === 0) {
        debugLog('⚠️ No due cards found');
        return;
      }

      // カードのproblemIdsを抽出（型を明示）
      const problemIds = dueCards.map((card: { problemId: number }) => card.problemId);
      debugLog('📝 Problem IDs for review:', problemIds);

      // 復習モードで開始
      onNavigate('spacedRepetitionReview', { problemIds });
    } catch (error) {
      console.error('❌ Failed to load due cards:', error);
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div className="text-center">
          <motion.div
            className="w-20 h-20 rounded-full mx-auto mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-full h-full rounded-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-white" />
            </div>
          </motion.div>
          <p className="text-white/90 font-medium text-lg">
            {language === 'ja' ? '読み込み中...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Daily goal in minutes (2 hours = 120 minutes)
  const dailyGoalMinutes = 120;
  const maxTime = Math.max(...weeklyData.map(d => d.time), dailyGoalMinutes, 1);

  // Calculate total weekly study time
  const totalWeeklyMinutes = weeklyData.reduce((sum, data) => sum + data.time, 0);
  const totalWeeklyTime = formatTime(totalWeeklyMinutes);

  // Calculate weekly goal achievement
  const weeklyGoalMinutes = dailyGoalMinutes * 7; // 14 hours
  const weeklyAchievementRate = Math.round((totalWeeklyMinutes / weeklyGoalMinutes) * 100);
  const daysAchieved = weeklyData.filter(d => d.time >= dailyGoalMinutes).length;

  return (
    <div
      className="min-h-screen pb-24 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
          url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
        `,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-4 sm:px-6 backdrop-blur-xl border-b"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 24px rgba(139, 92, 246, 0.1)',
        }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Avatar - Circular with gradient background */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4), 0 0 0 3px rgba(139, 92, 246, 0.1)',
              }}
            >
              {userName.charAt(0)}
            </div>
            {/* Greeting */}
            <div>
              <div className="text-xs font-medium" style={{ color: 'rgba(139, 92, 246, 0.7)' }}>
                {language === 'ja' ? 'こんにちは、' : 'Hello,'}
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-white">
                {userName}{language === 'ja' ? 'さん！' : '!'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak Counter - Persistent */}
            <StreakIndicator />

            {/* XP Counter */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                  boxShadow: '0 2px 8px rgba(251, 191, 36, 0.4)',
                }}
              >
                ⭐
              </div>
              <motion.span className="font-bold text-amber-900 text-sm">
                {displayedXP}
              </motion.span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6">
        {/* CTA Card - Start Learning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-4 sm:p-8 text-white relative overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            boxShadow: '0 16px 48px rgba(245, 158, 11, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
          }}
          onClick={handleStartRecommendedQuiz}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Decorative elements */}
          <div className="absolute top-6 right-6 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-600/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  className="w-10 h-10 bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <span className="text-2xl">🎯</span>
                </motion.div>
                <h2 className="text-xl font-bold tracking-tight">
                  {language === 'ja' ? '学習を始める準備はできましたか？' : 'Ready to start learning?'}
                </h2>
              </div>
              <p className="text-white/95 text-base font-medium mb-2">
                {language === 'ja' ? '新しいクイズセッションを開始' : 'Start a new quiz session'}
              </p>
              {/* 推奨問題集名を表示 */}
              {recommendedQuizSet && (
                <>
                  <p className="text-white/90 text-base font-semibold mb-1">
                    {language === 'ja' ? `📚 ${recommendedQuizSet.name}` : `📚 ${recommendedQuizSet.name}`}
                  </p>
                  <p className="text-white/80 text-sm">
                    {language === 'ja' ? '推奨: ' : 'Recommended: '}
                    {calculateRecommendedTime(recommendedQuizSet.problemIds?.length || 0)}
                  </p>
                </>
              )}
              {!recommendedQuizSet && (
                <p className="text-white/80 text-sm">
                  {language === 'ja' ? '推奨: 10〜15分' : 'Recommended: 10-15 min'}
                </p>
              )}
            </div>

            {/* Play Button */}
            <div className="flex items-center justify-center">
              <motion.div
                className="w-16 h-16 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 90 }}
                style={{
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(255, 255, 255, 0.2) inset',
                }}
              >
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Quick 5 Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Quick5Button
            onStart={(problemIds) => onNavigate('quiz', { problemIds })}
            language={language}
          />
        </motion.div>

        {/* Level Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl p-4 sm:p-8 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
          }}
        >
          {/* Decorative particles */}
          <div className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
          <div className="absolute bottom-8 left-8 w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 right-12 w-1 h-1 bg-white/25 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="flex flex-col items-center">
            {/* Circular XP Ring */}
            <div className="relative w-48 h-48 mb-6">
              {/* Glow background */}
              <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-2xl" />

              {/* Background circle */}
              <svg className="w-48 h-48 transform -rotate-90 relative z-10" viewBox="0 0 192 192">
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="16"
                />
                {/* Progress circle - CYAN GLOW */}
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  fill="none"
                  stroke="url(#cyanGradient)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 84}`}
                  strokeDashoffset={`${2 * Math.PI * 84 * (1 - ((xp % 100) / 100))}`}
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 24px rgba(6, 182, 212, 0.4))',
                    transition: 'stroke-dashoffset 1s ease-out',
                  }}
                />
                <defs>
                  <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center badge with 3D effect */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                  className="bg-white/95 rounded-3xl px-8 py-6 backdrop-blur-sm"
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
                  }}
                >
                  <motion.div className="text-5xl font-bold bg-gradient-to-br from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {displayedLevel}
                  </motion.div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold mt-1">
                    {language === 'ja' ? 'レベル' : 'Level'}
                  </div>
                </div>
              </div>
            </div>

            {/* Rank Badge */}
            <div
              className="px-6 py-2 rounded-full text-sm font-bold mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.9) 0%, rgba(196, 181, 253, 0.9) 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
              }}
            >
              {language === 'ja' ? 'マスター学習者' : 'Master Learner'}
            </div>

            {/* Next Level Progress */}
            <div className="text-center">
              <div className="text-sm font-semibold mb-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                {language === 'ja' ? '次のレベルまで' : 'Next level'}: <motion.span>{displayedXP}</motion.span> / {(level) * 100} XP
              </div>
              <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {language === 'ja' ? `あと ${(level) * 100 - xp} XP` : `${(level) * 100 - xp} XP remaining`}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid (2×2) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {/* Total Problems */}
          <motion.div
            className="rounded-2xl p-4 sm:p-6"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: '8px 8px 16px rgba(139, 92, 246, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                }}
              >
                <span className="text-xl">📚</span>
              </div>
              <div className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent mb-1">
                <motion.span>{displayedProblems}</motion.span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">
                {language === 'ja' ? '総問題数' : 'Total'}
              </div>
            </div>
          </motion.div>

          {/* Accuracy */}
          <motion.div
            className="rounded-2xl p-4 sm:p-6"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: '8px 8px 16px rgba(139, 92, 246, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                }}
              >
                <span className="text-xl">✅</span>
              </div>
              <div className="text-4xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent mb-1">
                <motion.span>{displayedAccuracy}</motion.span>%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">
                {language === 'ja' ? '正答率' : 'Accuracy'}
              </div>
            </div>
          </motion.div>

          {/* Study Time */}
          <motion.div
            className="rounded-2xl p-4 sm:p-6"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: '8px 8px 16px rgba(139, 92, 246, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                }}
              >
                <span className="text-xl">⏱️</span>
              </div>
              <div className="text-4xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 bg-clip-text text-transparent mb-1">
                <motion.span>{displayedTime}</motion.span>h
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">
                {language === 'ja' ? '学習時間' : 'Time'}
              </div>
            </div>
          </motion.div>

          {/* Streak */}
          <motion.div
            className="rounded-2xl p-4 sm:p-6"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: '8px 8px 16px rgba(139, 92, 246, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                }}
              >
                <motion.span
                  className="text-xl"
                  animate={streak > 0 ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                >
                  🔥
                </motion.span>
              </div>
              <div className="text-4xl font-bold bg-gradient-to-br from-orange-600 to-orange-700 bg-clip-text text-transparent mb-1">
                <motion.span>{displayedStreak}</motion.span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">
                {language === 'ja' ? '連続日数' : 'Streak'}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Weakness Analysis Card */}
        {topWeaknesses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="rounded-2xl p-4 sm:p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(243, 244, 246, 0.9) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3) inset',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <TrendingDown className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {language === 'ja' ? '苦手分野分析' : 'Weakness Analysis'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('weaknessAnalysis')}
                className="text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                  color: '#DC2626',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {language === 'ja' ? '詳細分析' : 'View Details'}
              </button>
            </div>

            <div className="space-y-3">
              {topWeaknesses.slice(0, 3).map((weakness, index) => (
                <div
                  key={weakness.category}
                  className="p-3 rounded-lg border"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{
                            background: index === 0
                              ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                              : index === 1
                              ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                              : 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                          }}
                        >
                          {index + 1}
                        </div>
                        <span className="font-semibold text-gray-900">{weakness.category}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>
                          {language === 'ja' ? '正解率: ' : 'Accuracy: '}
                          <span className="font-semibold text-red-600">
                            {(weakness.accuracy * 100).toFixed(1)}%
                          </span>
                        </span>
                        <span>
                          {language === 'ja' ? '解答: ' : 'Attempts: '}
                          <span className="font-semibold">{weakness.totalAttempts}</span>
                          {language === 'ja' ? '回' : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('weaknessAnalysis')}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
                        color: '#DC2626',
                      }}
                    >
                      {language === 'ja' ? '練習' : 'Practice'}
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${weakness.accuracy * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                      className="h-full"
                      style={{
                        background: 'linear-gradient(90deg, #EF4444 0%, #FBBF24 50%, #10B981 100%)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              {language === 'ja'
                ? '「詳細分析」をクリックして全ての弱点分野を確認し、推奨問題を解きましょう'
                : 'Click "View Details" to see all weaknesses and practice recommended problems'}
            </p>
          </motion.div>
        )}

        {/* Past Exam Analysis Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer"
          onClick={() => onNavigate('pastExamAnalysis')}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.1), 0 0 0 1px rgba(139, 92, 246, 0.15) inset',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
            >
              <FileSearch className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {language === 'ja' ? '過去問一括分析' : 'Batch Past-Exam Analysis'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ja'
                  ? '複数年度の過去問をAIで一括分析し、出題傾向を把握'
                  : 'Analyze multiple years with AI to see subtopic trends'}
              </p>
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        </motion.div>

        {/* Today's Recommendations CTA */}
        {recommendedProblems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer"
            onClick={() => onNavigate('recommendations')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ✨
                    </motion.span>
                  </div>
                  <div className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                    {language === 'ja' ? 'AIおすすめ' : 'AI Picks'}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-1">
                  {language === 'ja' ? '今日のおすすめ' : "Today's Picks"}
                </h3>
                <p className="text-white/90 text-sm">
                  {recommendedProblems.length} {language === 'ja' ? '問の推奨問題' : 'recommended problems'}
                </p>
                <p className="text-white/70 text-xs mt-1">
                  {language === 'ja' ? 'あなたに最適化された問題' : 'Personalized for you'}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-white" fill="white" />
              </div>
            </div>
          </motion.div>
        )}

        {/* XP Progress Widget */}
        <XPProgressWidget
          language={language}
          onBadgesClick={() => onNavigate('badges')}
        />

        {/* Smart Review Panel */}
        <SmartReviewPanel
          language={language}
          onStartReview={(problemIds) => {
            onNavigate('spacedRepetitionReview', { problemIds });
          }}
        />

        {/* Weekly PDCA Review Card */}
        <WeeklyReviewCard
          language={language}
          onDismiss={() => {}}
          onNavigate={(view) => onNavigate(view as View)}
        />

        {/* Category Mastery Levels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">
              {language === 'ja' ? '📈 習熟度レベル' : '📈 Mastery Levels'}
            </h3>
            <button
              onClick={() => onNavigate('stats')}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              {language === 'ja' ? '詳細' : 'Details'} →
            </button>
          </div>
          <CategoryMasteryLevels language={language} compact={false} maxItems={5} />
        </motion.div>

        {/* PDCA Learning Flow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          <h3 className="text-sm font-bold text-white mb-3">
            {language === 'ja' ? '📚 学習サイクル' : '📚 Learning Cycle'}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { view: 'promptGenerator' as View, label: language === 'ja' ? 'プロンプト生成' : 'Prompt', emoji: '✏️', color: '#8B5CF6' },
              { view: 'editor' as View, label: language === 'ja' ? '問題インポート' : 'Import', emoji: '📥', color: '#3B82F6' },
              { view: 'studyPlanDashboard' as View, label: language === 'ja' ? '学習プラン' : 'Plan', emoji: '📋', color: '#10B981' },
              { view: 'stats' as View, label: language === 'ja' ? '統計・分析' : 'Statistics', emoji: '📊', color: '#EF4444' },
              { view: 'subtopicAnalysis' as View, label: language === 'ja' ? 'サブトピック' : 'Subtopics', emoji: '🔍', color: '#14B8A6' },
              { view: 'smartNotes' as View, label: language === 'ja' ? 'スマートノート' : 'Notes', emoji: '💡', color: '#F59E0B' },
              { view: 'pdcaCycle' as View, label: language === 'ja' ? 'PDCAサイクル' : 'PDCA', emoji: '🔄', color: '#EC4899' },
            ].map((item) => (
              <motion.button
                key={item.view}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate(item.view)}
                className="flex items-center gap-2 p-3 rounded-xl text-left transition-colors"
                style={{
                  background: `${item.color}20`,
                  border: `1px solid ${item.color}40`,
                }}
              >
                <span className="text-base shrink-0">{item.emoji}</span>
                <span className="text-xs font-semibold text-white leading-tight truncate">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Today's Review CTA */}
        {dueCardsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg cursor-pointer"
            onClick={handleStartDueCardsReview}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                    >
                      🎯
                    </motion.span>
                  </div>
                  <div className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                    {language === 'ja' ? '復習期限！' : 'Due Now!'}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-1">
                  {language === 'ja' ? '今日の復習' : "Today's Review"}
                </h3>
                <p className="text-white/90 text-sm">
                  {dueCardsCount} {language === 'ja' ? '枚のカードが復習期限です' : 'cards due for review'}
                </p>
                <p className="text-white/70 text-xs mt-1">
                  {language === 'ja' ? '推奨: ' : 'Recommended: '}{calculateRecommendedTime(dueCardsCount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Weekly Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(243, 244, 246, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3) inset',
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
            >
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {language === 'ja' ? '週間の進捗' : 'Weekly Progress'}
            </h3>
          </div>

          {/* Bar Chart */}
          <div className="space-y-4">
            <div className="h-40 flex items-end justify-between gap-2 relative">
              {/* Goal Line */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="absolute left-0 right-0 border-t-2 border-dashed pointer-events-none z-10"
                style={{
                  borderColor: 'rgba(234, 179, 8, 0.6)',
                  bottom: `${(dailyGoalMinutes / maxTime) * 100}%`,
                }}
              >
                <div className="absolute -right-1 -top-3 text-xs font-bold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                  {language === 'ja' ? '目標' : 'Goal'}
                </div>
              </motion.div>

              {weeklyData.map((data, index) => {
                const heightPercent = maxTime > 0 ? (data.time / maxTime) * 100 : 0;
                const isGoalAchieved = data.time >= dailyGoalMinutes;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1 relative group"
                    onMouseEnter={() => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Hover Tooltip */}
                    {hoveredBarIndex === index && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none"
                      >
                        <div
                          className="px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
                          style={{
                            background: isGoalAchieved
                              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)'
                              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%)',
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          <div className="text-xs font-bold text-white mb-1">
                            {formatDate(data.date)} ({data.day})
                          </div>
                          <div className="text-sm font-bold text-white">
                            {data.time > 0 ? formatTime(data.time) : (language === 'ja' ? '学習なし' : 'No study')}
                          </div>
                          {isGoalAchieved && (
                            <div className="text-xs text-white/90 mt-1">
                              ✅ {language === 'ja' ? '目標達成！' : 'Goal achieved!'}
                            </div>
                          )}
                        </div>
                        {/* Arrow */}
                        <div
                          className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0"
                          style={{
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: isGoalAchieved
                              ? '6px solid rgba(5, 150, 105, 0.95)'
                              : '6px solid rgba(139, 92, 246, 0.95)',
                          }}
                        />
                      </motion.div>
                    )}

                    {/* Time label above bar */}
                    <div className="h-6 flex items-center justify-center">
                      {data.time > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.05, duration: 0.4 }}
                          className={`text-xs font-bold whitespace-nowrap ${
                            data.isToday
                              ? 'text-violet-600 dark:text-violet-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {formatTime(data.time)}
                        </motion.div>
                      )}
                    </div>

                    {/* Bar Container */}
                    <div className="w-full flex items-end justify-center h-32 cursor-pointer">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPercent, data.time > 0 ? 5 : 0)}%` }}
                        transition={{
                          delay: 0.3 + index * 0.05,
                          duration: 0.6,
                          ease: 'easeOut',
                        }}
                        className="w-full rounded-t-xl relative"
                        whileHover={{ scale: 1.05 }}
                        style={{
                          background: data.isToday
                            ? isGoalAchieved
                              ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)' // Today + Goal Achieved: Green
                              : 'linear-gradient(180deg, #8B5CF6 0%, #6366F1 100%)' // Today: Purple
                            : isGoalAchieved
                            ? 'linear-gradient(180deg, #34D399 0%, #10B981 100%)' // Goal Achieved: Light Green
                            : 'linear-gradient(180deg, #93C5FD 0%, #60A5FA 100%)', // Default: Blue
                          minHeight: data.time > 0 ? '8px' : '0',
                          boxShadow: data.isToday && data.time > 0
                            ? isGoalAchieved
                              ? '0 0 24px rgba(16, 185, 129, 0.6), 0 4px 12px rgba(16, 185, 129, 0.3)'
                              : '0 0 24px rgba(139, 92, 246, 0.6), 0 4px 12px rgba(139, 92, 246, 0.3)'
                            : isGoalAchieved && data.time > 0
                            ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                            : data.time > 0
                            ? '0 2px 8px rgba(59, 130, 246, 0.2)'
                            : 'none',
                        }}
                      />
                    </div>

                    {/* Day Label */}
                    <div
                      className={`text-xs font-medium ${
                        data.isToday ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {data.day}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly Total and Goal */}
            <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              {/* Total Weekly Time and Achievement Rate */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.4 }}
                className="flex items-center justify-center gap-3"
              >
                {/* Total Time */}
                <div className="px-4 py-2 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {language === 'ja' ? '今週の合計:' : 'Total:'}
                    </span>
                    <span className="text-base font-bold text-violet-600 dark:text-violet-400">
                      {totalWeeklyTime || (language === 'ja' ? '0分' : '0m')}
                    </span>
                  </div>
                </div>

                {/* Achievement Rate */}
                <div className="px-4 py-2 rounded-xl"
                  style={{
                    background: weeklyAchievementRate >= 100
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)'
                      : weeklyAchievementRate >= 50
                      ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {language === 'ja' ? '達成率:' : 'Achievement:'}
                    </span>
                    <span className={`text-base font-bold ${
                      weeklyAchievementRate >= 100
                        ? 'text-green-600 dark:text-green-400'
                        : weeklyAchievementRate >= 50
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {weeklyAchievementRate}%
                    </span>
                  </div>
                </div>

                {/* Days Achieved */}
                <div className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">
                      {daysAchieved}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      / 7 {language === 'ja' ? '日達成' : 'days'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Goal Line */}
              <div className="text-sm text-gray-600 dark:text-gray-300 text-center">
                {language === 'ja' ? '目標: 2時間/日 (週14時間)' : 'Goal: 2h/day (14h/week)'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Memory Stage Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(243, 244, 246, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3) inset',
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
            >
              <span className="text-base">🧠</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {language === 'ja' ? '記憶定着度 (SM-2アルゴリズム)' : 'Memory Retention (SM-2 Algorithm)'}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Acquisition Stage - 短期記憶 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌱</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {language === 'ja' ? '習得期 (0-2回)' : 'Acquisition (0-2 reps)'}
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {memoryStages.acquisition}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity > 0
                        ? (memoryStages.acquisition / (memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity)) * 100
                        : 0
                    }%`
                  }}
                  transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #60A5FA 0%, #3B82F6 100%)',
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ja' ? '短期記憶 - 24時間以内に70%忘却' : 'Short-term memory - 70% forgotten in 24h'}
              </p>
            </div>

            {/* Consolidation Stage - 移行期 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📖</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {language === 'ja' ? '定着期 (3-5回)' : 'Consolidation (3-5 reps)'}
                  </span>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {memoryStages.consolidation}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity > 0
                        ? (memoryStages.consolidation / (memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity)) * 100
                        : 0
                    }%`
                  }}
                  transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #A78BFA 0%, #8B5CF6 100%)',
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ja' ? '長期記憶への移行 - 1週間で35%忘却' : 'Transition to long-term - 35% forgotten in 1 week'}
              </p>
            </div>

            {/* Storage Stage - 長期記憶 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {language === 'ja' ? '保持期 (6-8回)' : 'Storage (6-8 reps)'}
                  </span>
                </div>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {memoryStages.storage}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity > 0
                        ? (memoryStages.storage / (memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity)) * 100
                        : 0
                    }%`
                  }}
                  transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #34D399 0%, #10B981 100%)',
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ja' ? '長期記憶 - 2ヶ月で15%忘却' : 'Long-term memory - 15% forgotten in 2 months'}
              </p>
            </div>

            {/* Automaticity Stage - 手続き記憶 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {language === 'ja' ? '自動化期 (9回以上)' : 'Automaticity (9+ reps)'}
                  </span>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {memoryStages.automaticity}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity > 0
                        ? (memoryStages.automaticity / (memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity)) * 100
                        : 0
                    }%`
                  }}
                  transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 100%)',
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ja' ? '手続き記憶 - 1年で5%忘却' : 'Procedural memory - 5% forgotten in 1 year'}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300 text-center">
              {language === 'ja' ? '総カード数: ' : 'Total cards: '}
              <span className="font-bold text-violet-600 dark:text-violet-400">
                {memoryStages.acquisition + memoryStages.consolidation + memoryStages.storage + memoryStages.automaticity}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              {language === 'ja'
                ? '科学的根拠に基づくスペースドリピティション (Wozniak, 1990)'
                : 'Evidence-based spaced repetition (Wozniak, 1990)'}
            </p>
          </div>
        </motion.div>

        {/* Learning Calendar Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StudyCalendar language={language} />
        </motion.div>

        {/* Saved Sessions */}
        {savedSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full"
          >
            <div className="glass-card p-6 rounded-2xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}>
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {language === 'ja' ? '💾 保存されたクイズ' : '💾 Saved Quizzes'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {language === 'ja' ? `${savedSessions.length}件の続きから再開` : `Resume from ${savedSessions.length} saved sessions`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedSessions
                  .sort((a, b) => {
                    // 最新のセッションを上に表示（降順）
                    const aTime = new Date(a.pausedAt || a.lastSaved || a.startTime).getTime();
                    const bTime = new Date(b.pausedAt || b.lastSaved || b.startTime).getTime();
                    return bTime - aTime;
                  })
                  .map((session) => {
                  const progress = Math.round((session.currentIndex / session.problems.length) * 100);
                  const accuracy = session.score > 0 ? Math.round((session.score / session.currentIndex) * 100) : 0;

                  // 問題集名を優先、なければカテゴリー、どちらもなければデフォルト
                  const displayName = sessionQuizSetNames.get(session.id) ||
                                      session.category ||
                                      (language === 'ja' ? 'ミックスクイズ' : 'Mixed Quiz');

                  return (
                    <motion.div
                      key={session.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onNavigate('quiz', { sessionId: session.id })}
                      className="p-4 rounded-xl cursor-pointer relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {/* Progress Bar Background */}
                      <div className="absolute inset-0 opacity-10">
                        <div
                          className="h-full"
                          style={{
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #8B5CF6 0%, #6366F1 100%)',
                          }}
                        />
                      </div>

                      {/* Delete Button */}
                      <motion.button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={language === 'ja' ? '削除' : 'Delete'}
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </motion.button>

                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3 pr-8">
                          <div className="flex-1">
                            <h3 className="text-white font-bold text-lg mb-1">
                              {displayName}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {language === 'ja'
                                ? `${session.currentIndex + 1}問目 / ${session.problems.length}問`
                                : `Question ${session.currentIndex + 1} / ${session.problems.length}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-violet-400">{progress}%</div>
                            <div className="text-xs text-gray-500">{language === 'ja' ? '進捗' : 'Progress'}</div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                            <span className="text-gray-300">
                              {language === 'ja' ? `正解: ${session.score}問` : `Correct: ${session.score}`}
                            </span>
                          </div>
                          {session.currentIndex > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                              <span className="text-gray-300">
                                {language === 'ja' ? `正答率: ${accuracy}%` : `Accuracy: ${accuracy}%`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-500">
                          {new Date(session.pausedAt || session.startTime).toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating Action Buttons (FABs) */}
      <div
        className="flex flex-col z-50"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          left: 'auto',
          top: 'auto',
          margin: '0',
          transform: 'none',
          gap: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'flex-end'
        }}
      >
        {/* Menu Button - Teal */}
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('allFeatures')}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
            boxShadow: '0 8px 24px rgba(20, 184, 166, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
          title={language === 'ja' ? 'メニュー' : 'Menu'}
        >
          <Menu className="w-6 h-6" />
        </motion.button>

        {/* Stats Button - Blue */}
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('stats')}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
          title={language === 'ja' ? '統計' : 'Statistics'}
        >
          <BarChart3 className="w-6 h-6" />
        </motion.button>

        {/* Share Button - Orange */}
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('qrShare')}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
          title={language === 'ja' ? '共有' : 'Share'}
        >
          <Share2 className="w-6 h-6" />
        </motion.button>

        {/* Favorites Button - Yellow */}
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('favorites')}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
            boxShadow: '0 8px 24px rgba(251, 191, 36, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
          title={language === 'ja' ? 'お気に入り' : 'Favorites'}
        >
          <Star className="w-6 h-6" />
        </motion.button>

        {/* Add Button - Green */}
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('editor')}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
          title={language === 'ja' ? '問題追加' : 'Add Problem'}
        >
          <Plus className="w-6 h-6" />
        </motion.button>

        {/* Play Button (Largest) - Purple */}
        <motion.button
          whileHover={{ scale: 1.15, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenQuizSelection}
          className="w-16 h-16 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
            boxShadow: '0 12px 32px rgba(139, 92, 246, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          title={language === 'ja' ? '開始' : 'Start'}
        >
          <Play className="w-7 h-7 ml-1" fill="white" />
        </motion.button>
      </div>
    </div>
  );
};

// React.memoでラップしてパフォーマンス最適化
export default memo(DashboardV2);
