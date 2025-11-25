import { useState, useEffect, lazy, Suspense } from 'react';
import { initializeDatabase } from './lib/database';
import { forceQuizActionButtonStyles } from './forceButtonStyles';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AdProvider, useAd } from './contexts/AdContext';
import { AdFreeProvider } from './contexts/AdFreeContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { MainMenu } from './components/MainMenu';
import { DashboardV2 } from './components/DashboardV2';
import { QuizView } from './components/QuizView';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AdMobInitializer } from './components/AdMobInitializer';
import { AdMobBanner } from './components/AdMobBanner';
import { Onboarding } from './components/onboarding/Onboarding';
import { AppShell } from './components/layout/AppShell';

// コード分割: 頻繁に使用されないコンポーネントを遅延ロード
const ProblemEditor = lazy(() => import('./components/ProblemEditor').then(m => ({ default: m.ProblemEditor })));
const QuizSetManager = lazy(() => import('./components/QuizSetManager').then(m => ({ default: m.QuizSetManager })));
const Statistics = lazy(() => import('./components/Statistics'));
import type { View, QuizParams } from './types';
const History = lazy(() => import('./components/History').then(m => ({ default: m.History })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const DataMigration = lazy(() => import('./components/DataMigration').then(m => ({ default: m.DataMigration })));
const BackupManager = lazy(() => import('./components/BackupManager').then(m => ({ default: m.BackupManager })));
const ShareCenter = lazy(() => import('./components/ShareCenter').then(m => ({ default: m.ShareCenter })));
const LearningGroup = lazy(() => import('./components/LearningGroup').then(m => ({ default: m.LearningGroup })));
const ExamView = lazy(() => import('./components/ExamView').then(m => ({ default: m.ExamView })));
const QuizSetCategorySelector = lazy(() => import('./components/QuizSetCategorySelector').then(m => ({ default: m.QuizSetCategorySelector })));
const ProblemEditManager = lazy(() => import('./components/ProblemEditManager').then(m => ({ default: m.ProblemEditManager })));
const QuizSetDetailStats = lazy(() => import('./components/QuizSetDetailStats').then(m => ({ default: m.QuizSetDetailStats })));
const StudyDiary = lazy(() => import('./components/StudyDiary').then(m => ({ default: m.StudyDiary })));
const LearningInsights = lazy(() => import('./components/LearningInsights').then(m => ({ default: m.LearningInsights })));
const RecommendationDashboard = lazy(() => import('./components/RecommendationDashboard').then(m => ({ default: m.RecommendationDashboard })));
const SessionSettings = lazy(() => import('./components/SessionSettings').then(m => ({ default: m.SessionSettings })));
const LearningReminder = lazy(() => import('./components/LearningReminder').then(m => ({ default: m.LearningReminder })));
const DifficultyAdjustment = lazy(() => import('./components/DifficultyAdjustment').then(m => ({ default: m.DifficultyAdjustment })));
// const SpacedRepetitionDashboard = lazy(() => import('./components/SpacedRepetitionDashboard').then(m => ({ default: m.SpacedRepetitionDashboard })));
const Guide = lazy(() => import('./components/Guide').then(m => ({ default: m.Guide })));
const PomodoroTimer = lazy(() => import('./components/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })));
const WeaknessAnalysis = lazy(() => import('./components/WeaknessAnalysis').then(m => ({ default: m.WeaknessAnalysis })));
const GoalManager = lazy(() => import('./components/GoalManager').then(m => ({ default: m.GoalManager })));
const NoteManager = lazy(() => import('./components/NoteManager').then(m => ({ default: m.NoteManager })));



function AppContent() {
  const { language } = useLanguage();
  const { setCurrentView: setAdView } = useAd();
  const [currentView, setCurrentView] = useState<View>('menu');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ビューが変更されたら広告表示状態を更新
  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setAdView(view);
    // 統計画面に遷移する際は最新データを読み込むためにキーを更新
    if (view === 'stats') {
      setStatsRefreshKey(prev => prev + 1);
    }
  };
  const [isDarkMode, setIsDarkMode] = useState(true); // 常にダークモードを有効化
  const [isLoading, setIsLoading] = useState(true);
  const [, setShowMigration] = useState(false);
  const [quizParams, setQuizParams] = useState<QuizParams | null>(null);
  const [selectedQuizSetId, setSelectedQuizSetId] = useState<number | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);


  useEffect(() => {
    // 初期画面の広告表示状態を設定
    setAdView('menu');

    const initApp = async () => {
      try {
        console.log('アプリケーションを初期化中...');
        console.log('ユーザーエージェント:', navigator.userAgent);
        console.log('画面サイズ:', window.innerWidth, 'x', window.innerHeight);

        // データベース初期化
        await initializeDatabase();
        console.log('データベースの初期化完了');

        // 常にダークモードを有効化
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
        localStorage.setItem('darkMode', 'true');
        console.log('ダークモード常時有効化:', {
          isDarkMode: true,
          documentClasses: document.documentElement.className
        });

        // 既存データの確認（旧IndexedDBデータがあるかチェック）
        const hasLegacyData = await checkForLegacyData();
        console.log('レガシーデータの確認:', hasLegacyData);
        if (hasLegacyData) {
          setShowMigration(true);
          handleViewChange('migration');
        }

        console.log('アプリケーションの初期化完了');

        // ボタンスタイルを強制適用
        forceQuizActionButtonStyles();

        // オンボーディング完了チェック
        const onboardingCompleted = localStorage.getItem('onboardingCompleted');
        console.log('オンボーディング完了状態:', onboardingCompleted);
        if (!onboardingCompleted) {
          console.log('オンボーディングを表示します');
          setShowOnboarding(true);
        } else {
          console.log('オンボーディングはスキップされました');
        }

        setIsLoading(false);
      } catch (error) {
        console.error('アプリケーションの初期化に失敗:', error);
        console.error('エラーの詳細:', error);
        console.error('エラースタック:', (error as Error).stack);

        // エラーメッセージを保存
        setInitError(`初期化エラー: ${(error as Error).message || 'Unknown error'}`);

        // エラーが発生してもアプリを表示する
        try {
          // ダークモード設定だけは読み込む
          const savedDarkMode = localStorage.getItem('darkMode') === 'true';
          setIsDarkMode(savedDarkMode);

          if (savedDarkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (e) {
          console.error('ダークモード設定の読み込みに失敗:', e);
        }

        setIsLoading(false);
      }
    };

    initApp();
  }, [setAdView]);

  const checkForLegacyData = async (): Promise<boolean> => {
    try {
      // 旧データベースのチェック
      const dbRequest = indexedDB.open('quizAppDB', 1);
      return new Promise((resolve) => {
        dbRequest.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (db.objectStoreNames.contains('problems')) {
            const transaction = db.transaction(['problems'], 'readonly');
            const store = transaction.objectStore('problems');
            const countRequest = store.count();
            countRequest.onsuccess = () => {
              resolve(countRequest.result > 0);
            };
            countRequest.onerror = () => resolve(false);
          } else {
            resolve(false);
          }
        };
        dbRequest.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());

    // Tailwind CSS dark mode: documentElementにdarkクラスを適用
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const startQuizSetWorstProblems = (quizSetId: number, useLatestOnly: boolean) => {
    setQuizParams({
      quizSetId,
      useLatestOnly,
      mode: 'quizSetWorstProblems'
    });
    handleViewChange('quiz');
  };


  const startQuizSetQuiz = (quizSetId: number) => {
    setQuizParams({
      quizSetId,
      mode: undefined
    });
    handleViewChange('quiz');
  };

  const startQuizSetCategoryQuiz = (quizSetId: number, category: string) => {
    setQuizParams({
      quizSetId,
      category,
      mode: 'categoryQuiz'
    });
    handleViewChange('quiz');
  };

  const openQuizSetStats = (quizSetId: number) => {
    setSelectedQuizSetId(quizSetId);
    handleViewChange('quizSetStats');
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">アプリを初期化しています...</p>
        </div>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'menu':
        return (
          <DashboardV2
            onNavigate={handleViewChange}
            language={language as 'ja' | 'en'}
          />
        );
      case 'quiz':
        return <QuizView
          onBack={() => {
            handleViewChange('menu');
            setQuizParams(null);
          }}
          initialParams={quizParams}
        />;
      case 'editor':
        return <ProblemEditor onBack={() => handleViewChange('menu')} />;
      case 'quizSets':
        return <QuizSetManager
          onBack={() => handleViewChange('menu')}
          onStartQuiz={startQuizSetQuiz}
          onStartCategoryQuiz={startQuizSetCategoryQuiz}
        />;
      case 'stats':
        return <Statistics
          key={statsRefreshKey}
          onBack={() => handleViewChange('menu')}
          onStartQuizSetWorstProblems={startQuizSetWorstProblems}
          onOpenQuizSetStats={openQuizSetStats}
          isDarkMode={isDarkMode}
          language={language as 'ja' | 'en'}
        />;
      case 'history':
        return <History onBack={() => handleViewChange('menu')} />;
      case 'settings':
        return <Settings onBack={() => handleViewChange('menu')} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} language={language as 'ja' | 'en'} />;
      case 'migration':
        return (
          <DataMigration
            onComplete={() => {
              setShowMigration(false);
              handleViewChange('menu');
            }}
            onSkip={() => {
              setShowMigration(false);
              handleViewChange('menu');
            }}
          />
        );
      case 'backup':
        return <BackupManager onBack={() => handleViewChange('menu')} />;
      case 'share':
        return <LearningGroup onBack={() => handleViewChange('menu')} />;
      case 'qrShare':
        return <ShareCenter onBack={() => handleViewChange('menu')} />;
      case 'exam':
        return <ExamView onBack={() => handleViewChange('menu')} />;
      case 'categoryQuiz':
        return <QuizSetCategorySelector
          onBack={() => handleViewChange('menu')}
          onStartQuiz={startQuizSetCategoryQuiz}
        />;
      case 'problemEdit':
        return <ProblemEditManager onBack={() => handleViewChange('menu')} />;
      case 'quizSetStats':
        return selectedQuizSetId ? (
          <QuizSetDetailStats
            quizSetId={selectedQuizSetId}
            onBack={() => {
              handleViewChange('stats');
              setSelectedQuizSetId(null);
            }}
            isDarkMode={isDarkMode}
            language={language as 'ja' | 'en'}
          />
        ) : (
          <MainMenu onNavigate={handleViewChange} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
        );
      case 'diary':
        return <StudyDiary onBack={() => handleViewChange('menu')} isDarkMode={isDarkMode} language={language as 'ja' | 'en'} />;
      case 'insights':
        return <LearningInsights onBack={() => handleViewChange('menu')} isDarkMode={isDarkMode} language={language as 'ja' | 'en'} />;
      // case 'spacedRepetition':
      //   return <SpacedRepetitionDashboard onBack={() => handleViewChange('menu')} language={language as 'ja' | 'en'} />;
      case 'recommendations':
        return <RecommendationDashboard
          onBack={() => handleViewChange('menu')}
          onStartQuiz={(params) => {
            setQuizParams(params);
            handleViewChange('quiz');
          }}
          onNavigateToSettings={(view: View) => handleViewChange(view)}
          isDarkMode={isDarkMode}
          language={language as 'ja' | 'en'}
        />;
      case 'sessionSettings':
        return <SessionSettings onBack={() => handleViewChange('menu')} language={language as 'ja' | 'en'} />;
      case 'reminderSettings':
        return <LearningReminder onBack={() => handleViewChange('menu')} language={language as 'ja' | 'en'} />;
      case 'difficultySettings':
        return <DifficultyAdjustment onBack={() => handleViewChange('menu')} language={language as 'ja' | 'en'} />;
      case 'guide':
        return <Guide onNavigate={handleViewChange} language={language as 'ja' | 'en'} />;
      case 'pomodoro':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="max-w-2xl mx-auto">
              <PomodoroTimer />
              <div className="mt-6">
                <button
                  onClick={() => handleViewChange('menu')}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  ← {language === 'ja' ? 'メニューに戻る' : 'Back to Menu'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'weaknessAnalysis':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={() => handleViewChange('menu')}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  ← {language === 'ja' ? 'メニューに戻る' : 'Back to Menu'}
                </button>
              </div>
              <WeaknessAnalysis
                onStartRecommendedQuiz={(problemIds) => {
                  setQuizParams({
                    problemIds,
                    mode: 'review',
                  });
                  handleViewChange('quiz');
                }}
                language={language as 'ja' | 'en'}
              />
            </div>
          </div>
        );
      case 'goalManager':
        return <GoalManager onBack={() => handleViewChange('menu')} language={language as 'ja' | 'en'} />;
      case 'noteManager':
        return <NoteManager onBack={() => handleViewChange('menu')} />;
      default:
        return <MainMenu onNavigate={handleViewChange} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />;
    }
  };

  // オンボーディング表示
  console.log('レンダリング時のshowOnboarding:', showOnboarding);
  if (showOnboarding) {
    console.log('オンボーディングコンポーネントをレンダリングします');
    return (
      <Onboarding
        onComplete={() => {
          console.log('オンボーディング完了');
          localStorage.setItem('onboardingCompleted', 'true');
          setShowOnboarding(false);
        }}
        language={language as 'ja' | 'en'}
      />
    );
  }

  // エラーが発生した場合の緊急フォールバック表示
  if (initError) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'dark' : ''}`} style={{ backgroundColor: isDarkMode ? '#111827' : '#f9fafb', color: isDarkMode ? '#f9fafb' : '#111827' }}>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4" style={{ color: isDarkMode ? '#f9fafb' : '#111827' }}>🚨 アプリケーションエラー</h1>
          <p className="mb-4" style={{ color: isDarkMode ? '#d1d5db' : '#4b5563' }}>
            アプリケーションの初期化中にエラーが発生しました。
          </p>
          <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg mb-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-mono">
              {initError}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            style={{ backgroundColor: '#2563eb', color: 'white' }}
          >
            ページを再読み込み
          </button>
          <div className="mt-4 text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
            <p>User Agent: {navigator.userAgent.substring(0, 100)}...</p>
            <p>画面サイズ: {window.innerWidth} x {window.innerHeight}</p>
            <p>URL: {window.location.href}</p>
          </div>
        </div>
      </div>
    );
  }

  // DashboardV2 (menu view) は AppShell をバイパスして独自のレイアウトを使用
  if (currentView === 'menu') {
    return (
      <>
        <AdMobInitializer />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{language === 'ja' ? '読み込み中...' : 'Loading...'}</p>
            </div>
          </div>
        }>
          {renderCurrentView()}
        </Suspense>
        <PWAInstallPrompt />
        <AdMobBanner />
      </>
    );
  }

  return (
    <AppShell currentView={currentView} onNavigate={handleViewChange} isDarkMode={isDarkMode}>
      {/* AdMob初期化（ネイティブプラットフォームのみ） */}
      <AdMobInitializer />

      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">{language === 'ja' ? '読み込み中...' : 'Loading...'}</p>
          </div>
        </div>
      }>
        {renderCurrentView()}
      </Suspense>
      <PWAInstallPrompt />

      {/* バナー広告（ネイティブプラットフォームのみ） */}
      <AdMobBanner />
    </AppShell>
  );
}

// LanguageProvider、AdFreeProvider、AdProviderでラップしたApp関数
function App() {
  return (
    <LanguageProvider>
      <AdFreeProvider>
        <AdProvider>
          <PomodoroProvider>
            <AppContent />
          </PomodoroProvider>
        </AdProvider>
      </AdFreeProvider>
    </LanguageProvider>
  );
}

export default App;
