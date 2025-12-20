import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import {
  BookOpen,
  BarChart3,
  Plus,
  Edit2,
  Clock,
  Target,
  Settings,
  FileText,
  Share2,
  Calendar,
  TrendingUp,
  List,
  Archive,
  Bell,
  Sliders,
  ArrowLeft,
  Timer
} from 'lucide-react';
import type { View } from '../types';

interface GuideProps {
  onNavigate: (view: View) => void;
  language?: 'ja' | 'en';
}

/**
 * 総合案内コンポーネント
 * アプリの全機能をカテゴリー別に表示
 */
export function Guide({ onNavigate, language = 'ja' }: GuideProps) {
  const translations = {
    ja: {
      title: '総合案内',
      subtitle: 'アプリの機能一覧',
      learning: '学習',
      quiz: 'クイズ開始',
      quizDesc: 'カテゴリー別に問題を解いて知識を定着させましょう。正解率や学習時間を記録して成長を実感できます。',
      spacedRepetition: '間隔反復復習',
      spacedRepetitionDesc: 'SM-2アルゴリズムによる科学的な復習スケジュール。忘却曲線に基づいて最適なタイミングで問題を復習できます。',
      problemCreate: '問題作成',
      problemCreateDesc: '○×問題や選択式問題を簡単に作成。カテゴリー分けや解説の追加で、オリジナルの学習教材を作りましょう。',
      problemEdit: '問題編集',
      problemEditDesc: '既存の問題を編集・削除・整理。問題の質を高めて学習効果を最大化しましょう。',
      analysis: '分析',
      stats: '統計表示',
      statsDesc: '全体の正解率、カテゴリー別の成績、苦手な問題などを可視化。学習の進捗状況を一目で把握できます。',
      history: '解答履歴',
      historyDesc: '過去の全ての解答記録を確認。正解・不正解の履歴から学習パターンを分析して弱点を克服しましょう。',
      diary: '学習日記',
      diaryDesc: '日々の学習内容や気づき、達成したことを記録。振り返りによって学習の質を向上させることができます。',
      insights: '学習インサイト',
      insightsDesc: '学習データを詳細に分析して視覚化。時間帯別の正解率、学習パターン、成長曲線などを確認できます。',
      management: '管理',
      quizSets: '問題集管理',
      quizSetsDesc: 'オリジナルの問題集を作成・管理。テーマ別や難易度別に問題をグループ化して効率的に学習できます。',
      backup: 'バックアップ',
      backupDesc: '問題、履歴、設定などのデータを安全にバックアップ。万が一のデータ損失に備えて定期的に保存しましょう。',
      share: '共有センター',
      shareDesc: 'QRコードやファイルで問題を共有。友達や仲間と問題を交換して学習の幅を広げましょう。',
      settingsSection: '設定',
      recommendations: '学習推薦',
      recommendationsDesc: 'AIが学習データを分析して最適な学習方法を提案。苦手分野の克服や学習効率の向上をサポートします。',
      pomodoro: 'ポモドーロタイマー',
      pomodoroDesc: '25分集中＋5分休憩の時間管理術。タイマーで作業時間を区切り、高い集中力を維持しながら効率的に学習できます。',
      sessionSettings: 'セッション設定',
      sessionSettingsDesc: 'ポモドーロテクニックを活用した集中学習。作業時間と休憩時間を設定して生産性を高めましょう。',
      reminderSettings: 'リマインダー',
      reminderSettingsDesc: '学習時間の通知を設定。毎日の学習習慣を継続するためのリマインダーで学習を習慣化できます。',
      difficultySettings: '難易度調整',
      difficultySettingsDesc: '学習レベルに合わせて問題の難易度を自動調整。常に適切な難易度で効率的に学習できます。',
      appSettings: '設定',
      appSettingsDesc: 'ダークモード、言語設定、データ管理など、アプリ全体の設定をカスタマイズできます。',
      backToDashboard: 'ダッシュボードに戻る'
    },
    en: {
      title: 'Guide',
      subtitle: 'All Features',
      learning: 'Learning',
      quiz: 'Start Quiz',
      quizDesc: 'Answer questions by category to solidify your knowledge. Track your accuracy and study time to feel your growth.',
      spacedRepetition: 'Spaced Repetition',
      spacedRepetitionDesc: 'Scientific review scheduling using the SM-2 algorithm. Review problems at optimal intervals based on the forgetting curve.',
      problemCreate: 'Create Problems',
      problemCreateDesc: 'Easily create true/false and multiple choice questions. Build your own study materials with categories and explanations.',
      problemEdit: 'Edit Problems',
      problemEditDesc: 'Edit, delete, and organize existing problems. Improve question quality to maximize learning effectiveness.',
      analysis: 'Analysis',
      stats: 'Statistics',
      statsDesc: 'Visualize overall accuracy, category performance, and weak areas. Get a clear view of your learning progress at a glance.',
      history: 'Answer History',
      historyDesc: 'Review all past answer records. Analyze your learning patterns from correct/incorrect history to overcome weaknesses.',
      diary: 'Learning Diary',
      diaryDesc: 'Record daily learning content, insights, and achievements. Improve learning quality through regular reflection.',
      insights: 'Learning Insights',
      insightsDesc: 'Analyze and visualize learning data in detail. Check accuracy by time of day, learning patterns, and growth curves.',
      management: 'Management',
      quizSets: 'Quiz Sets',
      quizSetsDesc: 'Create and manage custom quiz sets. Group problems by theme or difficulty for efficient learning.',
      backup: 'Backup',
      backupDesc: 'Safely backup problems, history, and settings. Regularly save data to protect against potential data loss.',
      share: 'Share Center',
      shareDesc: 'Share problems via QR code or files. Exchange problems with friends and expand your learning resources.',
      settingsSection: 'Settings',
      recommendations: 'Recommendations',
      recommendationsDesc: 'AI analyzes your learning data to suggest optimal study methods. Get help overcoming weak areas and improving efficiency.',
      pomodoro: 'Pomodoro Timer',
      pomodoroDesc: '25-minute focus + 5-minute break time management technique. Use timer to segment work time and maintain high concentration for efficient learning.',
      sessionSettings: 'Session Settings',
      sessionSettingsDesc: 'Focused learning with the Pomodoro Technique. Set work and break times to boost productivity.',
      reminderSettings: 'Reminders',
      reminderSettingsDesc: 'Set study time notifications. Build consistent study habits with daily learning reminders.',
      difficultySettings: 'Difficulty',
      difficultySettingsDesc: 'Automatically adjust problem difficulty to match your level. Always learn efficiently at the right difficulty.',
      appSettings: 'Settings',
      appSettingsDesc: 'Customize app-wide settings including dark mode, language, and data management.',
      backToDashboard: 'Back to Dashboard'
    }
  };

  const t = translations[language];

  // 学習セクション
  const learningFeatures = [
    {
      icon: Target,
      title: t.quiz,
      desc: t.quizDesc,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
      borderColor: 'border-blue-500',
      view: 'categoryQuiz' as View
    },
    {
      icon: Clock,
      title: t.spacedRepetition,
      desc: t.spacedRepetitionDesc,
      color: 'from-orange-500 to-red-500',
      bgColor: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
      borderColor: 'border-orange-500',
      view: 'spacedRepetition' as View
    },
    {
      icon: Plus,
      title: t.problemCreate,
      desc: t.problemCreateDesc,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      borderColor: 'border-green-500',
      view: 'editor' as View
    },
    {
      icon: Edit2,
      title: t.problemEdit,
      desc: t.problemEditDesc,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
      borderColor: 'border-purple-500',
      view: 'problemEdit' as View
    }
  ];

  // 分析セクション
  const analysisFeatures = [
    {
      icon: BarChart3,
      title: t.stats,
      desc: t.statsDesc,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20',
      borderColor: 'border-indigo-500',
      view: 'stats' as View
    },
    {
      icon: List,
      title: t.history,
      desc: t.historyDesc,
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
      borderColor: 'border-teal-500',
      view: 'history' as View
    },
    {
      icon: Calendar,
      title: t.diary,
      desc: t.diaryDesc,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
      borderColor: 'border-pink-500',
      view: 'diary' as View
    },
    {
      icon: TrendingUp,
      title: t.insights,
      desc: t.insightsDesc,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
      borderColor: 'border-violet-500',
      view: 'insights' as View
    }
  ];

  // 管理セクション
  const managementFeatures = [
    {
      icon: BookOpen,
      title: t.quizSets,
      desc: t.quizSetsDesc,
      color: 'from-amber-500 to-yellow-500',
      bgColor: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
      borderColor: 'border-amber-500',
      view: 'quizSets' as View
    },
    {
      icon: Archive,
      title: t.backup,
      desc: t.backupDesc,
      color: 'from-slate-500 to-gray-500',
      bgColor: 'from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20',
      borderColor: 'border-slate-500',
      view: 'backup' as View
    },
    {
      icon: Share2,
      title: t.share,
      desc: t.shareDesc,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
      borderColor: 'border-emerald-500',
      view: 'share' as View
    }
  ];

  // 設定セクション
  const settingsFeatures = [
    {
      icon: FileText,
      title: t.recommendations,
      desc: t.recommendationsDesc,
      color: 'from-sky-500 to-blue-500',
      bgColor: 'from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20',
      borderColor: 'border-sky-500',
      view: 'recommendations' as View
    },
    {
      icon: Timer,
      title: t.pomodoro,
      desc: t.pomodoroDesc,
      color: 'from-red-500 to-red-600',
      bgColor: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      borderColor: 'border-red-500',
      view: 'pomodoro' as View
    },
    {
      icon: Clock,
      title: t.sessionSettings,
      desc: t.sessionSettingsDesc,
      color: 'from-fuchsia-500 to-pink-500',
      bgColor: 'from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20',
      borderColor: 'border-fuchsia-500',
      view: 'sessionSettings' as View
    },
    {
      icon: Bell,
      title: t.reminderSettings,
      desc: t.reminderSettingsDesc,
      color: 'from-red-500 to-orange-500',
      bgColor: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      borderColor: 'border-red-500',
      view: 'reminderSettings' as View
    },
    {
      icon: Sliders,
      title: t.difficultySettings,
      desc: t.difficultySettingsDesc,
      color: 'from-lime-500 to-green-500',
      bgColor: 'from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20',
      borderColor: 'border-lime-500',
      view: 'difficultySettings' as View
    },
    {
      icon: Settings,
      title: t.appSettings,
      desc: t.appSettingsDesc,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50',
      borderColor: 'border-gray-500',
      view: 'settings' as View
    }
  ];

  const renderFeatureCard = (feature: typeof learningFeatures[0]) => {
    const Icon = feature.icon;
    return (
      <Card
        key={feature.title}
        hoverable
        clickable
        padding="none"
        className={`border-l-4 ${feature.borderColor} overflow-hidden cursor-pointer hover:shadow-lg transition-all`}
        onClick={() => onNavigate(feature.view)}
      >
        <CardContent className={`p-4 bg-gradient-to-br ${feature.bgColor}`}>
          <div className="flex items-center gap-3">
            <div className={`size-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
              <Icon className="size-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-0.5 truncate">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {feature.desc}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 animate-fade-in">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => onNavigate('menu')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="size-4" />
          {t.backToDashboard}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* 学習セクション */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Target className="size-5 text-blue-500" />
          {t.learning}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {learningFeatures.map(renderFeatureCard)}
        </div>
      </div>

      {/* 分析セクション */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BarChart3 className="size-5 text-indigo-500" />
          {t.analysis}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {analysisFeatures.map(renderFeatureCard)}
        </div>
      </div>

      {/* 管理セクション */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Archive className="size-5 text-amber-500" />
          {t.management}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {managementFeatures.map(renderFeatureCard)}
        </div>
      </div>

      {/* 設定セクション */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings className="size-5 text-gray-500" />
          {t.settingsSection}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {settingsFeatures.map(renderFeatureCard)}
        </div>
      </div>
    </div>
  );
}
