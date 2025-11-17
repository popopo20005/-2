import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { StatCard } from './ui/StatCard';
import { SectionHeader } from './ui/SectionHeader';
import { InfoCard } from './ui/InfoCard';
import {
  Flame,
  BookOpen,
  BarChart3,
  Plus,
  Clock,
  Target,
  TrendingUp,
  Sparkles,
  Sun,
  Moon,
  HelpCircle
} from 'lucide-react';
import type { View } from '../App';
import { historyService, spacedRepetitionService, quizSetService, problemService } from '../lib/database';
import { getTodayStudyTime, getWeeklyStudyTime } from '../lib/studyTimeService';
import type { QuizSet } from '../types';
import { UserNameSettings } from './UserNameSettings';

interface DashboardProps {
  onNavigate: (view: View) => void;
  language?: 'ja' | 'en';
  onToggleDarkMode?: () => void;
  isDarkMode?: boolean;
}

/**
 * ダッシュボードコンポーネント
 *
 * Phase 1.1: ダッシュボード化
 * - 学習ストリークで連続日数を可視化
 * - 今日の進捗をカードで表示
 * - おすすめアクションで次にやることが明確
 * - クイックアクセスで主要機能に3タップ以内でアクセス
 * - パーソナライゼーション
 */
export function Dashboard({ onNavigate, language = 'ja', onToggleDarkMode, isDarkMode = false }: DashboardProps) {
  const [userName, setUserName] = useState('');
  const [streakDays, setStreakDays] = useState(0);
  const [todayQuestions, setTodayQuestions] = useState(0);
  const [todayAccuracy, setTodayAccuracy] = useState(0);
  const [learningTime, setLearningTime] = useState(0); // 分
  const [learningTimeSeconds, setLearningTimeSeconds] = useState(0); // 秒
  const [reviewNeeded, setReviewNeeded] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showNameSettings, setShowNameSettings] = useState(false);
  const [recommendedQuizSet, setRecommendedQuizSet] = useState<QuizSet | null>(null);
  const [weeklyStudyTime, setWeeklyStudyTime] = useState<{ dayOfWeek: number; date: Date; duration: number }[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // ユーザー名の読み込み
      const savedUserName = localStorage.getItem('userName') || (language === 'ja' ? 'ユーザー' : 'User');
      setUserName(savedUserName);

      // 連続学習日数の計算
      const streak = await calculateStreak();
      setStreakDays(streak);

      // 今日の進捗データの読み込み
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allHistory = await historyService.getAll();
      const todayHistory = allHistory.filter(h => {
        const historyDate = new Date(h.timestamp);
        historyDate.setHours(0, 0, 0, 0);
        return historyDate.getTime() === today.getTime();
      });

      setTodayQuestions(todayHistory.length);

      if (todayHistory.length > 0) {
        const correct = todayHistory.filter(h => h.isCorrect).length;
        setTodayAccuracy(Math.round((correct / todayHistory.length) * 100));
      }

      // 学習時間の計算（今日のセッション）
      const todayStudySeconds = await getTodayStudyTime();
      const todayStudyMinutes = Math.floor(todayStudySeconds / 60);
      console.log('📊 今日の学習時間:', { todayStudySeconds, todayStudyMinutes });
      setLearningTime(todayStudyMinutes);
      setLearningTimeSeconds(todayStudySeconds);

      // 週間学習時間の読み込み
      const weeklyData = await getWeeklyStudyTime();
      console.log('📊 週間学習時間データ:', weeklyData);
      console.log('📅 今日の曜日:', new Date().getDay(), new Date().toLocaleDateString('ja-JP', { weekday: 'long' }));
      setWeeklyStudyTime(weeklyData);

      // 復習が必要なカードの数（間隔反復）
      const allCards = await spacedRepetitionService.getAllCards();
      const now = new Date();
      const dueCards = allCards.filter(card =>
        card.nextReviewDate <= now && !card.isNew
      );
      setReviewNeeded(dueCards.length);

      // パーソナライズされた問題セット推奨の計算
      await loadPersonalizedRecommendation(allHistory);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setIsLoading(false);
    }
  };

  const calculateStreak = async (): Promise<number> => {
    try {
      const allHistory = await historyService.getAll();
      if (allHistory.length === 0) return 0;

      // 日付順にソート
      const sortedHistory = allHistory.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);

      for (let i = 0; i < 30; i++) { // 最大30日まで確認
        const dayHistory = sortedHistory.some(h => {
          const historyDate = new Date(h.timestamp);
          historyDate.setHours(0, 0, 0, 0);
          return historyDate.getTime() === checkDate.getTime();
        });

        if (dayHistory) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Failed to calculate streak:', error);
      return 0;
    }
  };

  const loadPersonalizedRecommendation = async (allHistory: any[]) => {
    try {
      // カテゴリ別の正答率を計算
      const categoryStats: Record<string, { correct: number; total: number }> = {};

      allHistory.forEach(h => {
        if (!categoryStats[h.category]) {
          categoryStats[h.category] = { correct: 0, total: 0 };
        }
        categoryStats[h.category].total++;
        if (h.isCorrect) {
          categoryStats[h.category].correct++;
        }
      });

      // 最も正答率が低いカテゴリを見つける
      let worstCategory = '';
      let lowestAccuracy = 100;

      Object.entries(categoryStats).forEach(([category, stats]) => {
        if (stats.total >= 5) { // 最低5問以上解いたカテゴリのみ
          const accuracy = (stats.correct / stats.total) * 100;
          if (accuracy < lowestAccuracy) {
            lowestAccuracy = accuracy;
            worstCategory = category;
          }
        }
      });

      // 推奨する問題セットを見つける
      const allQuizSets = await quizSetService.getAll();

      if (worstCategory && allQuizSets.length > 0) {
        // 弱点カテゴリの問題を含む問題セットを探す
        const allProblems = await problemService.getAll();
        const categoryProblems = allProblems.filter(p => p.category === worstCategory);
        const categoryProblemIds = categoryProblems.map(p => p.id!);

        // カテゴリの問題を最も多く含む問題セットを見つける
        let bestQuizSet: QuizSet | null = null;
        let maxMatchCount = 0;

        for (const quizSet of allQuizSets) {
          const matchCount = quizSet.problemIds.filter(id =>
            categoryProblemIds.includes(id)
          ).length;

          if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            bestQuizSet = quizSet;
          }
        }

        setRecommendedQuizSet(bestQuizSet);
      } else if (allQuizSets.length > 0) {
        // 弱点カテゴリがない場合は、最も最近作成された問題セット
        const sortedSets = allQuizSets.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setRecommendedQuizSet(sortedSets[0]);
      }
    } catch (error) {
      console.error('Failed to load personalized recommendation:', error);
    }
  };

  const handleSaveUserName = (name: string) => {
    localStorage.setItem('userName', name);
    setUserName(name);
  };

  // ストリークのマイルストーン設定
  const getStreakMilestone = (days: number) => {
    if (days >= 100) return { level: 5, target: 100, next: 365, name: '伝説', color: 'from-purple-500 via-pink-500 to-red-500', icon: '👑' };
    if (days >= 30) return { level: 4, target: 30, next: 100, name: 'マスター', color: 'from-yellow-400 via-orange-500 to-red-500', icon: '🏆' };
    if (days >= 14) return { level: 3, target: 14, next: 30, name: '熟練者', color: 'from-blue-400 via-purple-500 to-pink-500', icon: '⭐' };
    if (days >= 7) return { level: 2, target: 7, next: 14, name: '継続者', color: 'from-green-400 to-blue-500', icon: '🌟' };
    return { level: 1, target: 0, next: 7, name: '初心者', color: 'from-orange-400 to-orange-600', icon: '🔥' };
  };

  const streakMilestone = getStreakMilestone(streakDays);
  const streakProgress = ((streakDays - streakMilestone.target) / (streakMilestone.next - streakMilestone.target)) * 100;
  const todayGoal = 20; // 1日の目標問題数

  const t = {
    ja: {
      greeting: `👋 おかえりなさい、${userName}さん！`,
      subtitle: '今日も頑張りましょう',
      streakDays: `${streakDays}日連続`,
      streakLabel: '学習ストリーク',
      streakTarget: `${streakDays} / 10日`,
      streakMessage: `あと${10 - streakDays}日で10日連続達成！🎉`,
      todayProgress: '今日の進捗',
      solvedProblems: '解いた問題',
      accuracy: '正答率',
      learningTime: '学習時間（分）',
      goal: '目標',
      problems: '問',
      minutes: '分',
      recommendedActions: 'おすすめアクション',
      reviewNeeded: '復習が必要な問題',
      reviewDescription: '間違えた問題を復習して、記憶を定着させましょう',
      noReviewNeeded: 'すべてクリア！',
      noReviewDescription: '復習が必要な問題はありません。新しい問題に挑戦しましょう！',
      estimatedTime: '所要時間',
      about: '約',
      startReview: '今すぐ復習 →',
      viewCards: '復習画面へ →',
      newProblems: '新しい問題セット',
      recommended: 'おすすめ',
      newDescription: '「看護師国家試験 基礎編」 - あなたのレベルに最適',
      personalizedRecommendation: 'あなたへのおすすめ',
      weakCategory: '弱点カテゴリ',
      difficulty: '難易度',
      medium: '中級',
      startLearning: '学習開始 →',
      quickAccess: 'クイックアクセス',
      quizSets: '問題集',
      statistics: '統計',
      create: '作成',
      guide: '総合案内',
    },
    en: {
      greeting: `👋 Welcome back, ${userName}!`,
      subtitle: "Let's do our best today",
      streakDays: `${streakDays} days`,
      streakLabel: 'Learning Streak',
      streakTarget: `${streakDays} / 10 days`,
      streakMessage: `${10 - streakDays} more days to 10-day streak! 🎉`,
      todayProgress: "Today's Progress",
      solvedProblems: 'Solved',
      accuracy: 'Accuracy',
      learningTime: 'Study Time (min)',
      goal: 'Goal',
      problems: '',
      minutes: 'min',
      recommendedActions: 'Recommended Actions',
      reviewNeeded: 'Review Needed',
      reviewDescription: 'Review missed problems to reinforce your memory',
      noReviewNeeded: 'All Clear!',
      noReviewDescription: 'No cards need review. Try new problems!',
      estimatedTime: 'Estimated time',
      about: 'about',
      startReview: 'Start Review →',
      viewCards: 'View Cards →',
      newProblems: 'New Problem Set',
      recommended: 'Recommended',
      newDescription: 'Nursing National Exam - Basics - Perfect for your level',
      personalizedRecommendation: 'Recommended for You',
      weakCategory: 'Weak Category',
      difficulty: 'Difficulty',
      medium: 'Medium',
      startLearning: 'Start Learning →',
      quickAccess: 'Quick Access',
      quizSets: 'Quiz Sets',
      statistics: 'Statistics',
      create: 'Create',
      guide: 'Guide',
    },
  };

  const translations = t[language];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-4 animate-fade-in">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 animate-fade-in">
      {/* ヘッダー：パーソナライズされた挨拶 */}
      <Card hoverable>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-gray-100">
                {translations.greeting}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {translations.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* ダークモード切り替えボタン */}
              {onToggleDarkMode && (
                <button
                  onClick={onToggleDarkMode}
                  className="
                    p-2.5 rounded-full
                    bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-blue-600 dark:to-purple-600
                    hover:scale-110 active:scale-95
                    transition-all duration-200
                    shadow-lg hover:shadow-xl
                  "
                  aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
                  title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
                >
                  {isDarkMode ? (
                    <Sun className="size-5 text-white" />
                  ) : (
                    <Moon className="size-5 text-white" />
                  )}
                </button>
              )}
              {/* ストリークバッジ */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Flame className="size-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {translations.streakDays}
                </span>
              </div>
            </div>
          </div>

          {/* 学習ストリーク - マイルストーンシステム */}
          <div className="mt-6">
            <Card hoverable padding="none" className="border-l-4 border-orange-500 overflow-hidden">
              <CardContent
                className="p-5"
                style={{
                  background: isDarkMode
                    ? 'linear-gradient(to bottom right, rgba(124, 45, 18, 0.8), rgba(133, 77, 14, 0.8))'
                    : 'linear-gradient(to bottom right, #fff7ed, #fed7aa)',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`size-14 rounded-xl bg-gradient-to-br ${streakMilestone.color} flex items-center justify-center shadow-lg text-2xl`}>
                      {streakMilestone.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className="size-5 text-orange-500" />
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">
                          {translations.streakLabel}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        レベル {streakMilestone.level}: {streakMilestone.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      {streakDays}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {language === 'ja' ? '日連続' : 'days'}
                    </p>
                  </div>
                </div>

                {/* プログレスバー */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{streakMilestone.target}日</span>
                    <span className="font-medium">次の目標: {streakMilestone.next}日</span>
                  </div>
                  <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className={`h-full bg-gradient-to-r ${streakMilestone.color} transition-all duration-500 rounded-full relative`}
                      style={{ width: `${Math.min(streakProgress, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    あと <span className="font-bold text-orange-600 dark:text-orange-400">{streakMilestone.next - streakDays}日</span> で次のレベル達成！🎉
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* 今日の進捗 */}
      <div>
        <SectionHeader
          icon={BarChart3}
          iconColor="text-blue-500"
          title={translations.todayProgress}
          size="lg"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 解いた問題 */}
          <StatCard
            theme="learning"
            icon={Target}
            value={todayQuestions}
            goal={todayGoal}
            label={translations.solvedProblems}
            showProgress
            progress={(todayQuestions / todayGoal) * 100}
          />

          {/* 正答率 */}
          <StatCard
            theme="success"
            icon={TrendingUp}
            value={`${todayAccuracy}%`}
            label={translations.accuracy}
            additionalInfo={todayAccuracy >= 80 ? '+5% ↑' : undefined}
          />

          {/* 学習時間 */}
          <StatCard
            theme="focus"
            icon={Clock}
            value={learningTime >= 1 ? `${learningTime}${language === 'ja' ? '分' : 'min'}` : `${learningTimeSeconds}${language === 'ja' ? '秒' : 's'}`}
            goal={`60${language === 'ja' ? '分' : 'min'}`}
            label={translations.learningTime}
            showProgress
            progress={(learningTime / 60) * 100}
          />
        </div>
      </div>

      {/* 週間学習時間グラフ */}
      <div>
        <SectionHeader
          icon={BarChart3}
          iconColor="text-purple-500"
          title={language === 'ja' ? '週間学習時間' : 'Weekly Study Time'}
          size="lg"
        />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {weeklyStudyTime.map((day) => {
                const dayNames = language === 'ja'
                  ? ['日', '月', '火', '水', '木', '金', '土']
                  : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const minutes = Math.floor(day.duration / 60);
                const maxMinutes = Math.max(...weeklyStudyTime.map(d => Math.floor(d.duration / 60)), 60);
                const percentage = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
                const isToday = day.dayOfWeek === new Date().getDay();

                return (
                  <div key={day.dayOfWeek} className="flex items-center gap-3">
                    {/* 曜日ラベル */}
                    <div className={`w-10 text-sm font-medium text-center ${isToday ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                      {dayNames[day.dayOfWeek]}
                    </div>

                    {/* プログレスバー */}
                    <div className="flex-1 relative">
                      {isToday && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full shadow-xl shadow-purple-500/60 dark:shadow-purple-400/60 animate-pulse"></div>
                      )}
                      <div className={`relative w-full rounded-full h-8 ${isToday ? 'bg-purple-300 dark:bg-purple-800 m-1' : 'bg-gray-200 dark:bg-gray-700'} overflow-hidden`}>
                        <div
                          className={`h-full bg-gradient-to-r ${isToday ? 'from-purple-500 to-pink-500' : 'from-purple-400 to-purple-300 dark:from-purple-600 dark:to-purple-500'} transition-all duration-500 rounded-full flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(percentage, minutes > 0 ? 5 : day.duration > 0 ? 10 : 0)}%` }}
                        >
                          {(minutes > 0 || (day.duration > 0 && day.duration < 60)) && (
                            <span className="text-xs font-medium text-white">
                              {minutes >= 1 ? `${minutes}${language === 'ja' ? '分' : 'min'}` : `${day.duration}${language === 'ja' ? '秒' : 's'}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 週間合計 */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'ja' ? '週間合計' : 'Weekly Total'}
                </span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {Math.floor(weeklyStudyTime.reduce((sum, day) => sum + day.duration, 0) / 60)}
                  {language === 'ja' ? '分' : ' min'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* おすすめアクション */}
      <div>
        <SectionHeader
          icon={Target}
          iconColor="text-orange-500"
          title={translations.recommendedActions}
          size="lg"
        />
        <div className="space-y-3">
          {/* アクション1: 復習 */}
          <InfoCard
            theme="streak"
            icon={Clock}
            title={reviewNeeded > 0 ? translations.reviewNeeded : translations.noReviewNeeded}
            description={reviewNeeded > 0 ? `${reviewNeeded}${translations.problems} - ${translations.reviewDescription}` : translations.noReviewDescription}
            actionText={reviewNeeded > 0 ? translations.startReview : translations.viewCards}
            onAction={() => onNavigate('spacedRepetition')}
            variant="outlined"
          />

          {/* アクション2: パーソナライズされた問題セット */}
          {recommendedQuizSet ? (
            <InfoCard
              theme="learning"
              icon={Sparkles}
              title={translations.personalizedRecommendation}
              description={`${recommendedQuizSet.name} - ${recommendedQuizSet.problemIds.length}${translations.problems}`}
              actionText={translations.startLearning}
              onAction={() => onNavigate('quizSets')}
              variant="outlined"
            />
          ) : (
            <InfoCard
              theme="learning"
              icon={Sparkles}
              title={translations.newProblems}
              description={translations.newDescription}
              actionText={translations.startLearning}
              onAction={() => onNavigate('quiz')}
              variant="outlined"
            />
          )}
        </div>
      </div>

      {/* クイックアクセス */}
      <div>
        <SectionHeader
          title={translations.quickAccess}
          size="lg"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => onNavigate('categoryQuiz')}
          >
            <BookOpen className="size-6" />
            <span className="text-sm">{translations.quizSets}</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => onNavigate('stats')}
          >
            <BarChart3 className="size-6" />
            <span className="text-sm">{translations.statistics}</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => onNavigate('editor')}
          >
            <Plus className="size-6" />
            <span className="text-sm">{translations.create}</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => onNavigate('guide')}
          >
            <HelpCircle className="size-6" />
            <span className="text-sm">{translations.guide}</span>
          </Button>
        </div>
      </div>

      {/* ユーザー名設定モーダル */}
      <UserNameSettings
        isOpen={showNameSettings}
        onClose={() => setShowNameSettings(false)}
        currentName={userName}
        onSave={handleSaveUserName}
        language={language}
      />
    </div>
  );
}

// Trigger HMR
