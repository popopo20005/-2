import { useState, useEffect } from 'react';
import type { View } from '../App';

interface MainMenuProps {
  onNavigate: (view: View) => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
}

export function MainMenu({ onNavigate, onToggleDarkMode, isDarkMode }: MainMenuProps) {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');

  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('language') || 'ja');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 定期的に言語設定をチェック
    const interval = setInterval(() => {
      const currentLang = localStorage.getItem('language') || 'ja';
      if (currentLang !== language) {
        setLanguage(currentLang);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  const t = {
    ja: {
      appTitle: '🎯 Minguella',
      pageTitle: '学習を始めましょう',
      pageSubtitle: 'あなたの知識をテストし、新しいことを学びましょう',
      features: {
        title: 'Minguellaの特徴',
        autoBackup: '自動バックアップ',
        pwa: 'PWA対応',
        offline: 'オフライン利用可能'
      },
      footer: '© 2025 Minguella - あなたの学習パートナー',
      menuItems: {
        quiz: { title: 'クイズ開始', description: '問題を解いてスキルアップ' },
        editor: { title: '問題作成', description: '新しい問題を作成' },
        problemEdit: { title: '問題編集', description: '既存の問題を編集' },
        categoryQuiz: { title: '問題集カテゴリー別クイズ', description: '問題集内のカテゴリー別にプレイ' },
        quizSets: { title: '問題集管理', description: 'カスタム問題集を作成' },
        stats: { title: '統計表示', description: '学習進捗を確認' },
        history: { title: '解答履歴', description: '過去の解答を振り返り' },
        backup: { title: 'バックアップ', description: 'データの保護と復元' },
        share: { title: '共有センター', description: 'みんなで問題を共有' },
        diary: { title: '学習日記', description: '学習の記録と振り返り' },
        insights: { title: '学習インサイト', description: '統計分析による学習効果の可視化' },
        recommendations: { title: '学習推薦', description: '学習データに基づく最適化提案' },
        sessionSettings: { title: 'セッション設定', description: 'Pomodoro・集中モードの設定' },
        reminderSettings: { title: 'リマインダー', description: '学習通知とリマインダー管理' },
        difficultySettings: { title: '難易度調整', description: '適応的難易度管理システム' },
        settings: { title: '設定', description: 'アプリの設定とヘルプ' }
      }
    },
    en: {
      appTitle: '🎯 Minguella',
      pageTitle: 'Start Learning',
      pageSubtitle: 'Test your knowledge and learn something new',
      features: {
        title: 'Minguella Features',
        autoBackup: 'Auto Backup',
        pwa: 'PWA Support',
        offline: 'Offline Available'
      },
      footer: '© 2025 Minguella - Your Learning Partner',
      menuItems: {
        quiz: { title: 'Start Quiz', description: 'Solve problems and improve skills' },
        editor: { title: 'Create Problems', description: 'Create new problems' },
        problemEdit: { title: 'Edit Problems', description: 'Edit existing problems' },
        categoryQuiz: { title: 'Category Quiz', description: 'Play by categories in quiz sets' },
        quizSets: { title: 'Quiz Set Manager', description: 'Create custom quiz sets' },
        stats: { title: 'Statistics', description: 'Check learning progress' },
        history: { title: 'Answer History', description: 'Review past answers' },
        backup: { title: 'Backup', description: 'Data protection and restore' },
        share: { title: 'Share Center', description: 'Share problems with everyone' },
        diary: { title: 'Study Diary', description: 'Record and reflect on learning' },
        insights: { title: 'Learning Insights', description: 'Statistical analysis-based learning visualization' },
        recommendations: { title: 'Learning Recommendations', description: 'Data-driven learning optimization suggestions' },
        sessionSettings: { title: 'Session Settings', description: 'Pomodoro & focus mode configuration' },
        reminderSettings: { title: 'Reminder Settings', description: 'Learning notifications and reminder management' },
        difficultySettings: { title: 'Difficulty Settings', description: 'Adaptive difficulty management system' },
        settings: { title: 'Settings', description: 'App settings and help' }
      }
    }
  };

  const currentLang = language as keyof typeof t;

  const menuItems = [
    {
      id: 'quiz' as View,
      title: t[currentLang].menuItems.quiz.title,
      description: t[currentLang].menuItems.quiz.description,
      icon: '🎯',
      isQuizAction: true
    },
    {
      id: 'editor' as View,
      title: t[currentLang].menuItems.editor.title,
      description: t[currentLang].menuItems.editor.description,
      icon: '✏️',
      isQuizAction: true
    },
    {
      id: 'problemEdit' as View,
      title: t[currentLang].menuItems.problemEdit.title,
      description: t[currentLang].menuItems.problemEdit.description,
      icon: '📝',
      isQuizAction: true
    },
    {
      id: 'categoryQuiz' as View,
      title: t[currentLang].menuItems.categoryQuiz.title,
      description: t[currentLang].menuItems.categoryQuiz.description,
      icon: '🎲',
      isQuizAction: true
    },
    {
      id: 'quizSets' as View,
      title: t[currentLang].menuItems.quizSets.title,
      description: t[currentLang].menuItems.quizSets.description,
      icon: '📚',
      isQuizAction: true
    },
    {
      id: 'stats' as View,
      title: t[currentLang].menuItems.stats.title,
      description: t[currentLang].menuItems.stats.description,
      icon: '📊',
      isQuizAction: true
    },
    {
      id: 'history' as View,
      title: t[currentLang].menuItems.history.title,
      description: t[currentLang].menuItems.history.description,
      icon: '📝',
      isQuizAction: true
    },
    {
      id: 'backup' as View,
      title: t[currentLang].menuItems.backup.title,
      description: t[currentLang].menuItems.backup.description,
      icon: '💾',
      isQuizAction: true
    },
    {
      id: 'share' as View,
      title: t[currentLang].menuItems.share.title,
      description: t[currentLang].menuItems.share.description,
      icon: '🤝',
      isQuizAction: true
    },
    {
      id: 'diary' as View,
      title: t[currentLang].menuItems.diary.title,
      description: t[currentLang].menuItems.diary.description,
      icon: '📖',
      isQuizAction: true
    },
    {
      id: 'insights' as View,
      title: t[currentLang].menuItems.insights.title,
      description: t[currentLang].menuItems.insights.description,
      icon: '📊',
      isQuizAction: true
    },
    {
      id: 'recommendations' as View,
      title: t[currentLang].menuItems.recommendations.title,
      description: t[currentLang].menuItems.recommendations.description,
      icon: '🎯',
      isQuizAction: true
    },
    {
      id: 'sessionSettings' as View,
      title: t[currentLang].menuItems.sessionSettings.title,
      description: t[currentLang].menuItems.sessionSettings.description,
      icon: '⏰',
      isQuizAction: true
    },
    {
      id: 'reminderSettings' as View,
      title: t[currentLang].menuItems.reminderSettings.title,
      description: t[currentLang].menuItems.reminderSettings.description,
      icon: '🔔',
      isQuizAction: true
    },
    {
      id: 'difficultySettings' as View,
      title: t[currentLang].menuItems.difficultySettings.title,
      description: t[currentLang].menuItems.difficultySettings.description,
      icon: '⚖️',
      isQuizAction: true
    },
    {
      id: 'settings' as View,
      title: t[currentLang].menuItems.settings.title,
      description: t[currentLang].menuItems.settings.description,
      icon: '⚙️',
      isQuizAction: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-gray-900 relative">
      <header className="glassmorphism shadow-lg border-b border-gray-200 dark:border-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t[currentLang].appTitle}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onToggleDarkMode}
                className="quiz-action-button p-3 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                style={{
                  backgroundColor: '#06b6d4',
                  color: 'white',
                  border: '1px solid #22d3ee'
                }}
                title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t[currentLang].pageTitle}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-200">
            {t[currentLang].pageSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`main-menu-button ${
                item.isQuizAction
                  ? 'quiz-action-button' 
                  : 'bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700'
              } rounded-lg p-4 shadow-md backdrop-blur-sm transform transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400`}
              style={item.isQuizAction ? {
                backgroundColor: '#06b6d4',
                color: 'white',
                border: '1px solid #22d3ee'
              } : {}}
            >
              <div className="text-center">
                <div className="text-xl mb-1">{item.icon}</div>
                <h3 className={`text-sm font-semibold mb-0.5 ${
                  item.isQuizAction ? 'text-white' : ''
                }`}>{item.title}</h3>
                <p className={`text-xs ${
                  item.isQuizAction
                    ? 'text-white/90' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}>{item.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="glassmorphism rounded-lg shadow-md border border-gray-200 dark:border-gray-600 p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t[currentLang].features.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-200">
              <div className="flex items-center justify-center space-x-2">
                <span>💾</span>
                <span>{t[currentLang].features.autoBackup}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>📱</span>
                <span>{t[currentLang].features.pwa}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>🌐</span>
                <span>{t[currentLang].features.offline}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="glassmorphism border-t border-gray-200 dark:border-gray-600 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 dark:text-gray-300">
            <p>{t[currentLang].footer}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}