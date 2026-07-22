// MainMenu - メインメニューコンポーネント
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from './ui/Card';
import {
  BookOpen,
  BarChart3,
  Settings as SettingsIcon,
  Share2,
  Plus,
  Brain,
  FileEdit,
  History,
  BookMarked,
  Database,
  HardDrive,
  Edit2,
  Lightbulb,
  Clock,
  Bell,
  Sliders,
  Flame,
  Target,
  TrendingUp,
  Sparkles,
  Timer,
  TrendingDown,
  StickyNote,
  GraduationCap,
  Star,
  FileText,
  Mic,
  LogIn,
  User,
  Crown,
  Wand2,
  Trophy,
} from 'lucide-react';
import type { View } from '../types';
import { UserNameSettings } from './UserNameSettings';
import { useAuth } from '../contexts/AuthContext';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { historyService, spacedRepetitionService, quizSetService, problemService, studyPlanService } from '../lib/database';
import type { QuizSet } from '../types';
import { pageTransition, gridContainer, gridItem, defaultTransition } from '../utils/animations';

interface MainMenuProps {
  onNavigate: (view: View) => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
}

/**
 * メインメニュー - すべての機能へのアクセスポイント
 */
export function MainMenu({ onNavigate }: MainMenuProps) {
  const { user } = useAuth();
  const [language] = useState(localStorage.getItem('language') || 'ja');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || (language === 'ja' ? 'ユーザー' : 'User'));
  const [showNameSettings, setShowNameSettings] = useState(false);

  // Dashboard統計データ
  const [streakDays, setStreakDays] = useState(0);
  const [todayQuestions, setTodayQuestions] = useState(0);
  const [todayAccuracy, setTodayAccuracy] = useState(0);
  const [learningTime, setLearningTime] = useState(0);
  const [reviewNeeded, setReviewNeeded] = useState(0);
  const [recommendedQuizSet, setRecommendedQuizSet] = useState<QuizSet | null>(null);
  const [weakestCategory, setWeakestCategory] = useState<string>('');

  // Quick Start Flow 進捗状態
  const [hasProblems, setHasProblems] = useState(false);
  const [hasStudyPlan, setHasStudyPlan] = useState(false);
  const [hasQuizHistory, setHasQuizHistory] = useState(false);

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
      const estimatedTime = todayHistory.length * 2; // 1問あたり平均2分と仮定
      setLearningTime(estimatedTime);

      // 復習が必要なカードの数（間隔反復）
      const allCards = await spacedRepetitionService.getAllCards();
      const now = new Date();
      const dueCards = allCards.filter(card =>
        card.nextReviewDate <= now && !card.isNew
      );
      setReviewNeeded(dueCards.length);

      // パーソナライズされた問題セット推奨の計算
      await loadPersonalizedRecommendation(allHistory);

      // Quick Start Flow 進捗状態の取得
      try {
        const [allProblems, allPlans] = await Promise.all([
          problemService.getAll(),
          studyPlanService.getAll(),
        ]);
        setHasProblems(allProblems.length > 0);
        setHasStudyPlan(allPlans.some((p) => !p.isCompleted));
        setHasQuizHistory(allHistory.length > 0);
      } catch (e) {
        console.warn('Quick Start Flow 進捗取得に失敗:', e);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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

      setWeakestCategory(worstCategory);

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
    import('../services/syncService').then(({ syncService }) => {
      syncService.syncUserName(name).catch(() => {});
    });
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
      greeting: `おかえりなさい、${userName}さん！`,
      subtitle: '今日も頑張りましょう',
      streakDays: `${streakDays}日連続`,
      streakLabel: '学習ストリーク',
      streakTarget: `${streakDays} / 10日`,
      streakMessage: `あと${Math.max(0, 10 - streakDays)}日で10日連続達成！🎉`,
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
      problemEdit: '問題編集',
      allFeatures: 'すべての機能',
      sections: {
        learning: '学習',
        analysis: '分析',
        management: '管理',
        settings: '設定'
      },
      items: {
        quiz: { title: 'クイズ開始', desc: '問題を解いてスキルアップ' },
        podcast: { title: 'ポッドキャスト学習', desc: '聞き流しで学習（統計記録なし）' },
        exam: { title: '模擬試験', desc: '本番形式で実力を試す' },
        spacedRepetition: { title: '間隔反復復習', desc: '効率的に復習' },
        editor: { title: '問題インポート', desc: '問題をインポート・作成' },
        problemEdit: { title: '問題編集', desc: '既存の問題を編集' },
        quizSets: { title: '問題集管理', desc: 'カスタム問題集を作成' },
        stats: { title: '統計表示', desc: '学習進捗を確認' },
        history: { title: '解答履歴', desc: '過去の解答を振り返り' },
        diary: { title: '学習日記', desc: '学習の記録と振り返り' },
        insights: { title: '学習インサイト', desc: '統計分析による可視化' },
        weaknessAnalysis: { title: '弱点分析', desc: '苦手分野を自動検出' },
        subtopicAnalysis: { title: 'サブトピック分析', desc: '科目内の頻出分野を分析' },
        spacedRepetitionManager: { title: '間隔反復学習', desc: 'SM-2アルゴリズムで記憶定着' },
        studyPlanDashboard: { title: '学習プラン', desc: '試験日ベースの学習計画' },
        aiGenerator: { title: 'AI問題生成', desc: 'AIで問題を自動生成する' },
        promptGenerator: { title: 'プロンプト生成', desc: '外部AI用プロンプトを自動生成' },
        badges: { title: 'バッジコレクション', desc: '獲得バッジと進捗を確認' },
        goalManager: { title: '目標管理', desc: '学習目標を設定' },
        noteManager: { title: '学習メモ', desc: 'Markdown形式でメモ管理' },
        smartNotes: { title: 'スマートノート', desc: 'AI生成の学習ノートを閲覧' },
        templateManager: { title: 'テンプレート管理', desc: 'カスタムメモテンプレートを作成' },
        favorites: { title: 'お気に入り', desc: '重要な問題をブックマーク' },
        backup: { title: 'バックアップ', desc: 'データの保護と復元' },
        advancedBackup: { title: '拡張バックアップ', desc: '完全バックアップ・選択的インポート' },
        share: { title: '共有センター', desc: 'みんなで問題を共有' },
        recommendations: { title: '学習推薦', desc: '最適化提案' },
        pomodoro: { title: 'ポモドーロタイマー', desc: '集中力を高める時間管理' },
        sessionSettings: { title: 'セッション設定', desc: 'Pomodoro設定' },
        reminderSettings: { title: 'リマインダー', desc: '学習通知管理' },
        difficultySettings: { title: '難易度調整', desc: '適応的難易度管理' },
        settings: { title: '設定', desc: 'アプリの設定とヘルプ' },
        pricing: { title: '料金プラン', desc: 'プランの確認・アップグレード' }
      }
    },
    en: {
      greeting: `Welcome back, ${userName}!`,
      subtitle: "Let's keep up the great work",
      streakDays: `${streakDays} days`,
      streakLabel: 'Learning Streak',
      streakTarget: `${streakDays} / 10 days`,
      streakMessage: `${Math.max(0, 10 - streakDays)} more days to 10-day streak! 🎉`,
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
      problemEdit: 'Edit Problems',
      allFeatures: 'All Features',
      sections: {
        learning: 'Learning',
        analysis: 'Analysis',
        management: 'Management',
        settings: 'Settings'
      },
      items: {
        quiz: { title: 'Start Quiz', desc: 'Solve problems and improve' },
        podcast: { title: 'Podcast Learning', desc: 'Listen and learn (no stats)' },
        exam: { title: 'Mock Exam', desc: 'Test your skills in exam mode' },
        spacedRepetition: { title: 'Spaced Repetition', desc: 'Efficient review' },
        editor: { title: 'Import Problems', desc: 'Import and create problems' },
        problemEdit: { title: 'Edit Problems', desc: 'Edit existing problems' },
        quizSets: { title: 'Quiz Sets', desc: 'Create custom quiz sets' },
        stats: { title: 'Statistics', desc: 'Check progress' },
        history: { title: 'History', desc: 'Review past answers' },
        diary: { title: 'Study Diary', desc: 'Record and reflect' },
        insights: { title: 'Insights', desc: 'Statistical analysis' },
        weaknessAnalysis: { title: 'Weakness Analysis', desc: 'Auto-detect weak areas' },
        subtopicAnalysis: { title: 'Subtopic Analysis', desc: 'Analyze frequent topics in subjects' },
        spacedRepetitionManager: { title: 'Spaced Repetition', desc: 'Memory retention with SM-2' },
        studyPlanDashboard: { title: 'Study Plans', desc: 'Exam-based study planning' },
        aiGenerator: { title: 'AI Problem Gen', desc: 'Auto-generate problems with AI' },
        promptGenerator: { title: 'Prompt Generator', desc: 'Auto-generate prompts for external AI' },
        badges: { title: 'Badge Collection', desc: 'View earned badges and progress' },
        goalManager: { title: 'Goal Management', desc: 'Set learning goals' },
        noteManager: { title: 'Study Notes', desc: 'Markdown note management' },
        smartNotes: { title: 'Smart Notes', desc: 'View AI-generated study notes' },
        templateManager: { title: 'Template Management', desc: 'Create custom note templates' },
        favorites: { title: 'Favorites', desc: 'Bookmark important problems' },
        backup: { title: 'Backup', desc: 'Data protection' },
        advancedBackup: { title: 'Advanced Backup', desc: 'Full backup & selective import' },
        share: { title: 'Share Center', desc: 'Share problems' },
        recommendations: { title: 'Recommendations', desc: 'Optimization suggestions' },
        pomodoro: { title: 'Pomodoro Timer', desc: 'Boost focus with time management' },
        sessionSettings: { title: 'Session Settings', desc: 'Pomodoro configuration' },
        reminderSettings: { title: 'Reminders', desc: 'Notification management' },
        difficultySettings: { title: 'Difficulty', desc: 'Adaptive difficulty' },
        settings: { title: 'Settings', desc: 'App settings and help' },
        pricing: { title: 'Pricing Plans', desc: 'View plans & upgrade' }
      }
    }
  };

  const translations = t[language as keyof typeof t];

  const menuSections = [
    {
      title: translations.sections.learning,
      items: [
        { id: 'quiz' as View, icon: BookOpen, color: 'from-blue-500 to-blue-600', ...translations.items.quiz },
        { id: 'podcast' as View, icon: Mic, color: 'from-pink-500 to-purple-600', ...translations.items.podcast },
        { id: 'exam' as View, icon: GraduationCap, color: 'from-red-500 to-red-600', ...translations.items.exam },
        { id: 'spacedRepetitionManager' as View, icon: Brain, color: 'from-purple-500 to-purple-600', ...translations.items.spacedRepetitionManager },
        { id: 'editor' as View, icon: Plus, color: 'from-green-500 to-green-600', ...translations.items.editor },
        { id: 'problemEdit' as View, icon: FileEdit, color: 'from-orange-500 to-orange-600', ...translations.items.problemEdit },
      ]
    },
    {
      title: translations.sections.analysis,
      items: [
        { id: 'stats' as View, icon: BarChart3, color: 'from-indigo-500 to-indigo-600', ...translations.items.stats },
        { id: 'history' as View, icon: History, color: 'from-pink-500 to-pink-600', ...translations.items.history },
        { id: 'diary' as View, icon: BookMarked, color: 'from-teal-500 to-teal-600', ...translations.items.diary },
        { id: 'insights' as View, icon: Lightbulb, color: 'from-yellow-500 to-yellow-600', ...translations.items.insights },
        { id: 'weaknessAnalysis' as View, icon: TrendingDown, color: 'from-red-500 to-red-600', ...translations.items.weaknessAnalysis },
        { id: 'subtopicAnalysis' as View, icon: TrendingUp, color: 'from-teal-500 to-teal-600', ...translations.items.subtopicAnalysis },
        { id: 'studyPlanDashboard' as View, icon: GraduationCap, color: 'from-indigo-500 to-indigo-600', ...translations.items.studyPlanDashboard },
        { id: 'aiGenerator' as View, icon: Sparkles, color: 'from-purple-500 to-pink-600', ...translations.items.aiGenerator },
        { id: 'promptGenerator' as View, icon: Wand2, color: 'from-fuchsia-500 to-purple-600', ...translations.items.promptGenerator },
      ]
    },
    {
      title: translations.sections.management,
      items: [
        { id: 'badges' as View, icon: Trophy, color: 'from-amber-500 to-yellow-500', ...translations.items.badges },
        { id: 'quizSets' as View, icon: BookOpen, color: 'from-cyan-500 to-cyan-600', ...translations.items.quizSets },
        { id: 'goalManager' as View, icon: Target, color: 'from-blue-500 to-blue-600', ...translations.items.goalManager },
        { id: 'noteManager' as View, icon: StickyNote, color: 'from-yellow-500 to-yellow-600', ...translations.items.noteManager },
        { id: 'smartNotes' as View, icon: Lightbulb, color: 'from-amber-500 to-orange-600', ...translations.items.smartNotes },
        { id: 'templateManager' as View, icon: FileText, color: 'from-purple-500 to-purple-600', ...translations.items.templateManager },
        { id: 'favorites' as View, icon: Star, color: 'from-yellow-400 to-orange-500', ...translations.items.favorites },
        { id: 'backup' as View, icon: Database, color: 'from-gray-500 to-gray-600', ...translations.items.backup },
        { id: 'advancedBackup' as View, icon: HardDrive, color: 'from-indigo-500 to-indigo-600', ...translations.items.advancedBackup },
        { id: 'share' as View, icon: Share2, color: 'from-blue-400 to-blue-500', ...translations.items.share },
      ]
    },
    {
      title: translations.sections.settings,
      items: [
        { id: 'recommendations' as View, icon: Lightbulb, color: 'from-amber-500 to-amber-600', ...translations.items.recommendations },
        { id: 'pomodoro' as View, icon: Timer, color: 'from-red-500 to-red-600', ...translations.items.pomodoro },
        { id: 'sessionSettings' as View, icon: Clock, color: 'from-rose-500 to-rose-600', ...translations.items.sessionSettings },
        { id: 'reminderSettings' as View, icon: Bell, color: 'from-violet-500 to-violet-600', ...translations.items.reminderSettings },
        { id: 'difficultySettings' as View, icon: Sliders, color: 'from-emerald-500 to-emerald-600', ...translations.items.difficultySettings },
        { id: 'pricing' as View, icon: Crown, color: 'from-amber-500 to-yellow-500', ...translations.items.pricing },
        { id: 'settings' as View, icon: SettingsIcon, color: 'from-slate-500 to-slate-600', ...translations.items.settings },
      ]
    }
  ];

  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition as any}
      transition={defaultTransition as any}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 md:px-12 lg:px-16 space-y-6">
        {/* ヘッダー */}
        <Card hoverable>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">👋</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {translations.greeting}
                  </h2>
                  <button
                    onClick={() => setShowNameSettings(true)}
                    className="
                      p-1.5 rounded-lg
                      text-gray-400 hover:text-gray-600
                      dark:text-gray-500 dark:hover:text-gray-300
                      hover:bg-gray-100 dark:hover:bg-gray-700
                      transition-colors
                    "
                    aria-label="ユーザー名を編集"
                  >
                    <Edit2 className="size-4" />
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {translations.subtitle}
                </p>
              </div>
              {/* 同期状態 + ログイン状態 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <SyncStatusIndicator />
                {user ? (
                  <button
                    onClick={() => onNavigate('settings')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors text-sm"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="size-6 rounded-full" />
                    ) : (
                      <User className="size-4" />
                    )}
                    <span className="hidden sm:inline max-w-[120px] truncate">
                      {user.displayName || user.email || 'ユーザー'}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('settings')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    <LogIn className="size-4" />
                    <span>{language === 'ja' ? 'ログイン' : 'Login'}</span>
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Flow - 学習フローガイド */}
        <QuickStartFlow
          language={language as 'ja' | 'en'}
          hasProblems={hasProblems}
          hasStudyPlan={hasStudyPlan}
          hasQuizHistory={hasQuizHistory}
          onNavigate={onNavigate}
        />

        {/* 学習ストリーク */}
        <Card hoverable className="border-l-4 border-orange-500">
          <CardContent className="p-5 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-800 dark:to-gray-800">
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

        {/* 今日の進捗 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-2 flex items-center gap-2">
            <BarChart3 className="size-5 text-blue-600" />
            {translations.todayProgress}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 解いた問題 */}
            <Card hoverable className="border-l-4 border-blue-500">
              <CardContent className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800">
                <div className="text-center">
                  <div className="size-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <Target className="size-6 text-white" />
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {todayQuestions}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                    {translations.solvedProblems}
                  </p>
                  <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((todayQuestions / todayGoal) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {translations.goal}: {todayGoal}{translations.problems}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 正答率 */}
            <Card hoverable className="border-l-4 border-green-500">
              <CardContent className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800">
                <div className="text-center">
                  <div className="size-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <TrendingUp className="size-6 text-white" />
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {todayAccuracy}%
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                    {translations.accuracy}
                  </p>
                  {todayQuestions > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center justify-center gap-1 font-medium">
                      +5% <TrendingUp className="size-3" />
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 学習時間 */}
            <Card hoverable className="border-l-4 border-purple-500">
              <CardContent className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800">
                <div className="text-center">
                  <div className="size-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Clock className="size-6 text-white" />
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {learningTime}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                    {translations.learningTime}
                  </p>
                  <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((learningTime / 60) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {translations.goal}: 60{translations.minutes}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* おすすめアクション */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-2 flex items-center gap-2">
            <Target className="size-5" />
            {translations.recommendedActions}
          </h2>
          <div className="space-y-3">
            {/* 復習が必要な問題 - 常に表示 */}
            <Card hoverable clickable onClick={() => onNavigate('spacedRepetition')}>
              <CardContent className="p-5 border-l-4 border-orange-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="size-5 text-orange-500" />
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">
                        {reviewNeeded > 0 ? translations.reviewNeeded : translations.noReviewNeeded}
                      </h3>
                      {reviewNeeded > 0 && (
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded-full text-xs font-bold text-orange-600 dark:text-orange-400">
                          {reviewNeeded}{translations.problems}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {reviewNeeded > 0 ? translations.reviewDescription : translations.noReviewDescription}
                    </p>
                    {reviewNeeded > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {translations.estimatedTime}: {translations.about}{reviewNeeded * 2}{translations.minutes}
                      </p>
                    )}
                  </div>
                  <button className="ml-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium whitespace-nowrap">
                    {reviewNeeded > 0 ? translations.startReview : translations.viewCards}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* 新しい問題セット - パーソナライズ */}
            {recommendedQuizSet ? (
              <Card hoverable clickable onClick={() => onNavigate('quiz')}>
                <CardContent className="p-5 border-l-4 border-blue-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="size-5 text-blue-500" />
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">
                          {recommendedQuizSet.name}
                        </h3>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400">
                          {translations.personalizedRecommendation}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {recommendedQuizSet.description || (weakestCategory ? `${translations.weakCategory}: ${weakestCategory}` : translations.newDescription)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {recommendedQuizSet.problemIds.length}{translations.problems}
                      </p>
                    </div>
                    <button className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium whitespace-nowrap">
                      {translations.startLearning}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card hoverable clickable onClick={() => onNavigate('quiz')}>
                <CardContent className="p-5 border-l-4 border-blue-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="size-5 text-blue-500" />
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">
                          {translations.newProblems}
                        </h3>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400">
                          {translations.recommended}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {translations.newDescription}
                      </p>
                    </div>
                    <button className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium whitespace-nowrap">
                      {translations.startLearning}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* クイックアクセス */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-2">
            {translations.quickAccess}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card hoverable clickable onClick={() => onNavigate('categoryQuiz')}>
              <CardContent className="p-5 text-center">
                <div className="size-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="size-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {translations.quizSets}
                </h3>
              </CardContent>
            </Card>

            <Card hoverable clickable onClick={() => onNavigate('stats')}>
              <CardContent className="p-5 text-center">
                <div className="size-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <BarChart3 className="size-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {translations.statistics}
                </h3>
              </CardContent>
            </Card>

            <Card hoverable clickable onClick={() => onNavigate('editor')}>
              <CardContent className="p-5 text-center">
                <div className="size-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Plus className="size-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {translations.create}
                </h3>
              </CardContent>
            </Card>

            <Card hoverable clickable onClick={() => onNavigate('problemEdit')}>
              <CardContent className="p-5 text-center">
                <div className="size-12 mx-auto mb-3 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <FileEdit className="size-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {translations.problemEdit}
                </h3>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* すべての機能 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-2">
            {translations.allFeatures}
          </h2>
        </div>

        {/* メニューセクション */}
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-3">
            <motion.h2
              className="text-lg font-bold text-gray-900 dark:text-gray-100 px-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              {section.title}
            </motion.h2>
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
              initial="hidden"
              animate="visible"
              variants={gridContainer as any}
            >
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    variants={gridItem as any}
                    whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.95 }}
                    custom={itemIndex}
                  >
                    <Card
                      hoverable
                      clickable
                      onClick={() => onNavigate(item.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className={`
                            size-12 rounded-lg
                            bg-gradient-to-br ${item.color}
                            flex items-center justify-center
                            shadow-lg
                          `}
                          >
                            <Icon className="size-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        ))}

        {/* ユーザー名設定モーダル */}
        <UserNameSettings
          isOpen={showNameSettings}
          onClose={() => setShowNameSettings(false)}
          currentName={userName}
          onSave={handleSaveUserName}
          language={language as 'ja' | 'en'}
        />
      </div>
    </motion.div>
  );
}

// ============================================================
// QuickStartFlow - 学習開始までの5ステップガイド
// ============================================================

interface QuickStartFlowProps {
  language: 'ja' | 'en';
  hasProblems: boolean;
  hasStudyPlan: boolean;
  hasQuizHistory: boolean;
  onNavigate: (view: View) => void;
}

function QuickStartFlow({
  language,
  hasProblems,
  hasStudyPlan,
  hasQuizHistory,
  onNavigate,
}: QuickStartFlowProps) {
  const labels = {
    ja: {
      title: 'クイックスタートガイド',
      subtitle: '問題作成から学習開始までの流れ',
      completed: '完了',
      steps: [
        {
          title: '① プロンプト生成',
          desc: '学習データから外部AI用プロンプトを作成',
          view: 'promptGenerator' as View,
        },
        {
          title: '② 問題インポート',
          desc: 'AI生成テキスト/JSONをインポート',
          view: 'editor' as View,
        },
        {
          title: '③ 問題編集',
          desc: '既存の問題を編集・管理',
          view: 'problemEdit' as View,
        },
        {
          title: '④ 学習プラン作成',
          desc: '試験日から逆算して日次目標を自動生成',
          view: 'studyPlanDashboard' as View,
        },
        {
          title: '⑤ クイズプレイ',
          desc: '毎日の目標を達成して記憶を定着',
          view: 'quiz' as View,
        },
      ],
    },
    en: {
      title: 'Quick Start Guide',
      subtitle: 'From creating problems to starting learning',
      completed: 'Done',
      steps: [
        {
          title: '① Generate Prompt',
          desc: 'Create AI prompts from your learning data',
          view: 'promptGenerator' as View,
        },
        {
          title: '② Import Problems',
          desc: 'Import AI-generated text/JSON',
          view: 'editor' as View,
        },
        {
          title: '③ Edit Problems',
          desc: 'Edit and manage existing problems',
          view: 'problemEdit' as View,
        },
        {
          title: '④ Create Study Plan',
          desc: 'Auto-generate daily goals from exam date',
          view: 'studyPlanDashboard' as View,
        },
        {
          title: '⑤ Play Quiz',
          desc: 'Complete daily goals to retain knowledge',
          view: 'quiz' as View,
        },
      ],
    },
  };

  const t = labels[language];

  // Step別の完了状態判定
  const stepStatus = [
    false, // ① プロンプト生成 (常にクリック可能、進捗判定なし)
    hasProblems, // ② 問題インポート (問題が存在すれば完了)
    hasProblems, // ③ 問題編集 (問題があれば利用可能)
    hasStudyPlan, // ④ 学習プラン
    hasQuizHistory, // ⑤ クイズプレイ
  ];

  // 次に取り組むべきステップ（最初の未完了ステップ）
  const nextStepIndex = stepStatus.findIndex((s) => !s);
  const activeIndex = nextStepIndex >= 0 ? nextStepIndex : 0;

  return (
    <Card hoverable className="overflow-hidden">
      <CardContent className="p-5 bg-gradient-to-br from-fuchsia-50 via-purple-50 to-indigo-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="size-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="size-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                {t.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* ステップカード（横スクロール可能なグリッド） */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {t.steps.map((step, idx) => {
            const isCompleted = stepStatus[idx];
            const isActive = idx === activeIndex;
            return (
              <button
                key={step.view}
                type="button"
                onClick={() => onNavigate(step.view)}
                className={`group relative text-left rounded-lg p-3 border-2 transition-all ${
                  isActive
                    ? 'border-purple-500 bg-white dark:bg-gray-900 shadow-md ring-2 ring-purple-300 dark:ring-purple-700'
                    : isCompleted
                      ? 'border-green-400 dark:border-green-600 bg-green-50/70 dark:bg-green-900/20 hover:border-green-500'
                      : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 hover:border-purple-400 dark:hover:border-purple-600'
                }`}
              >
                {isCompleted && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                    ✓
                  </span>
                )}
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {step.title}
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">
                  {step.desc}
                </div>
                {isActive && (
                  <div className="mt-2 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                    {language === 'ja' ? 'こちらから →' : 'Start here →'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
