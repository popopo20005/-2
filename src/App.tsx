import { useState, useEffect, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { initializeDatabase } from './lib/database';
import { forceQuizActionButtonStyles } from './forceButtonStyles';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AdProvider, useAd } from './contexts/AdContext';
import { AdFreeProvider } from './contexts/AdFreeContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { notificationService } from './services/notificationService';
import { MainMenu } from './components/MainMenu';
import { HomeView } from './components/HomeView';
import { CreateHub } from './components/CreateHub';
import { MoreView } from './components/MoreView';
import { ReviewView } from './components/ReviewView';
import { LibraryView } from './components/LibraryView';
import QuizView from './components/QuizView';
import PodcastView from './components/PodcastView';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AdMobInitializer } from './components/AdMobInitializer';
import { AdMobBanner } from './components/AdMobBanner';
import { Onboarding } from './components/onboarding/Onboarding';
import { AppShell } from './components/layout/AppShell';
import { DailyReviewInterstitial } from './components/DailyReviewInterstitial';
import { StreakAtRiskBanner } from './components/StreakAtRiskBanner';

// コード分割: 頻繁に使用されないコンポーネントを遅延ロード
const ProblemEditor = lazy(() => import('./components/ProblemEditor').then(m => ({ default: m.ProblemEditor })));
// QuizSetManager は LibraryView に置き換え済み。MainMenu経由でアクセス可能
// const QuizSetManager = lazy(() => import('./components/QuizSetManager').then(m => ({ default: m.QuizSetManager })));
const Statistics = lazy(() => import('./components/Statistics'));
import type { View, QuizParams } from './types';
const History = lazy(() => import('./components/History').then(m => ({ default: m.History })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const DataMigration = lazy(() => import('./components/DataMigration').then(m => ({ default: m.DataMigration })));
const BackupManager = lazy(() => import('./components/BackupManager').then(m => ({ default: m.BackupManager })));
const AdvancedBackupManager = lazy(() => import('./components/AdvancedBackupManager').then(m => ({ default: m.AdvancedBackupManager })));
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
const TemplateManager = lazy(() => import('./components/TemplateManager').then(m => ({ default: m.TemplateManager })));
const SpacedRepetitionManager = lazy(() => import('./components/SpacedRepetitionManager').then(m => ({ default: m.SpacedRepetitionManager })));
const SpacedRepetitionReview = lazy(() => import('./components/SpacedRepetitionReview').then(m => ({ default: m.SpacedRepetitionReview })));
const FavoritesList = lazy(() => import('./components/FavoritesList').then(m => ({ default: m.FavoritesList })));
const StudyPlanCreator = lazy(() => import('./components/StudyPlanCreator').then(m => ({ default: m.StudyPlanCreator })));
const StudyPlanDashboard = lazy(() => import('./components/StudyPlanDashboard').then(m => ({ default: m.StudyPlanDashboard })));
const AIProblemGenerator = lazy(() => import('./components/AIProblemGenerator').then(m => ({ default: m.AIProblemGenerator })));
const PromptGeneratorCard = lazy(() => import('./components/PromptGeneratorCard').then(m => ({ default: m.PromptGeneratorCard })));
const PricingPage = lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));
const PastExamAnalysis = lazy(() => import('./components/PastExamAnalysis').then(m => ({ default: m.PastExamAnalysis })));
const BadgeCollection = lazy(() => import('./components/gamification/BadgeSystem').then(m => ({ default: m.BadgeCollection })));
const SmartNoteViewer = lazy(() => import('./components/SmartNoteViewer').then(m => ({ default: m.SmartNoteViewer })));
const PDCACycleDashboard = lazy(() => import('./components/PDCACycleDashboard').then(m => ({ default: m.PDCACycleDashboard })));
const SubtopicAnalyzer = lazy(() => import('./components/SubtopicAnalyzer').then(m => ({ default: m.SubtopicAnalyzer })));
const PromptWizard = lazy(() => import('./components/PromptWizard').then(m => ({ default: m.PromptWizard })));
const AIHandoff = lazy(() => import('./components/AIHandoff').then(m => ({ default: m.AIHandoff })));



function AppContent() {
  const { language } = useLanguage();
  const { setCurrentView: setAdView } = useAd();
  const [currentView, setCurrentView] = useState<View>('menu');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReviewInterstitial, setShowReviewInterstitial] = useState(false);

  // ビューが変更されたら広告表示状態を更新
  const handleViewChange = (view: View, options?: { quizSetId?: number; problemIds?: number[]; sessionId?: string; editorMode?: string }) => {
    // セッションIDが渡された場合は保存済みセッションを再開
    if (view === 'quiz' && options?.sessionId) {
      console.log('🎯 Resuming session:', options.sessionId);
      setQuizParams({
        sessionId: options.sessionId,
        mode: 'resume'
      });
      setCurrentView('quiz');
      setAdView('quiz');
      return;
    }

    // クイズ画面に遷移する際は問題集IDを保存（ビュー変更の前に）
    if (view === 'quiz' && options?.quizSetId) {
      setQuizParams({
        quizSetId: options.quizSetId,
        mode: undefined
      });
    } else if (view === 'quiz' && options?.problemIds && options.problemIds.length > 0) {
      // problemIdsが渡された場合（弱点分析などから）
      console.log('🎯 Starting quiz with problemIds:', options.problemIds.length);
      setQuizParams({
        problemIds: options.problemIds,
        mode: 'review'
      });
    } else if (view === 'quiz' && !options) {
      // クイズ画面でパラメータなしの場合はクリア
      setQuizParams(null);
    }

    // SM-2復習画面に遷移する際は問題集IDを保存してQuizViewで表示
    if (view === 'spacedRepetitionReview' && options?.quizSetId) {
      setQuizParams({
        quizSetId: options.quizSetId,
        mode: 'review' // SM-2モード
      });
      setCurrentView('quiz'); // QuizViewを使用
      setAdView('quiz');
      return; // 早期リターン
    } else if (view === 'spacedRepetitionReview' && options?.problemIds && options.problemIds.length > 0) {
      // problemIdsが渡された場合は復習期限カードをレビュー
      console.log('🎯 Starting review with problemIds:', options.problemIds.length);
      setQuizParams({
        problemIds: options.problemIds,
        mode: 'review' // SM-2モード
      });
      setCurrentView('quiz');
      setAdView('quiz');
      return;
    } else if (view === 'spacedRepetitionReview') {
      // quizSetIdもproblemIdsもない場合は全カードをレビュー
      setQuizParams({
        mode: 'review' // SM-2モード
      });
      setCurrentView('quiz');
      setAdView('quiz');
      return;
    }

    // editorMode を保持
    if (view === 'editor' && options?.editorMode) {
      setCurrentEditorMode(options.editorMode);
    } else if (view !== 'editor') {
      setCurrentEditorMode(undefined);
    }

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
  const [currentEditorMode, setCurrentEditorMode] = useState<string | undefined>(undefined);
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

        // 通知サービス初期化
        try {
          await notificationService.initialize();
          console.log('通知サービスの初期化完了');

          // 通知が有効な場合、スケジューリングを開始
          const settings = await notificationService.getSettings();
          if (settings && settings.enabled) {
            await notificationService.scheduleNotifications();
            console.log('通知スケジューリング開始');
          }
        } catch (error) {
          console.error('通知サービスの初期化に失敗:', error);
          // 通知サービスの初期化失敗はアプリ起動を妨げない
        }

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

        // Stripe決済後のリダイレクト処理
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        if (paymentStatus === 'success') {
          handleViewChange('paymentSuccess');
          // URLからパラメータを除去（履歴を汚さない）
          window.history.replaceState({}, '', window.location.pathname);
        } else if (paymentStatus === 'cancel') {
          handleViewChange('paymentCancel');
          window.history.replaceState({}, '', window.location.pathname);
        }

        setIsLoading(false);

        // Daily Review Interstitial: show once per day if not onboarding
        const onboardingDone = localStorage.getItem('onboardingCompleted');
        const today = new Date().toDateString();
        const alreadyShown = sessionStorage.getItem('reviewInterstitialShown') === today;
        if (onboardingDone && !alreadyShown) {
          setShowReviewInterstitial(true);
          sessionStorage.setItem('reviewInterstitialShown', today);
        }
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

    // Service Workerからの通知クリックメッセージをリッスン
    const handleNotificationClick = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        console.log('[App] 通知クリックメッセージを受信:', event.data);

        const { notificationType } = event.data;

        // 通知タイプに応じて適切な画面に遷移
        switch (notificationType) {
          case 'review_reminder':
            console.log('[App] 復習画面に遷移します');
            handleViewChange('spacedRepetitionReview');
            break;
          case 'goal_achievement':
            console.log('[App] 目標管理画面に遷移します');
            handleViewChange('goalManager');
            break;
          case 'streak_alert':
            console.log('[App] クイズ画面に遷移します');
            handleViewChange('quiz');
            break;
          default:
            console.log('[App] メニューに遷移します');
            handleViewChange('menu');
            break;
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleNotificationClick);
    }

    initApp();

    // クリーンアップ
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleNotificationClick);
      }
    };
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

  const startQuizSetWorstProblems = (quizSetId: number, useLatestOnly: boolean, problemCount?: number | 'all') => {
    setQuizParams({
      quizSetId,
      useLatestOnly,
      problemCount,
      mode: 'quizSetWorstProblems'
    });
    setCurrentView('quiz');
    setAdView('quiz');
  };


  const startQuizSetQuiz = (quizSetId: number) => {
    setQuizParams({
      quizSetId,
      mode: undefined
    });
    setCurrentView('quiz');
    setAdView('quiz');
  };

  const startQuizSetCategoryQuiz = (quizSetId: number, category: string) => {
    setQuizParams({
      quizSetId,
      category,
      mode: 'categoryQuiz'
    });
    setCurrentView('quiz');
    setAdView('quiz');
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
          <HomeView
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
      case 'podcast':
        return <PodcastView onBack={() => handleViewChange('menu')} />;
      case 'editor':
        return <ProblemEditor onBack={() => handleViewChange('menu')} initialMode={currentEditorMode} />;
      case 'quizSets':
        return <LibraryView
          onNavigate={handleViewChange}
          onStartQuiz={startQuizSetQuiz}
          onStartCategoryQuiz={startQuizSetCategoryQuiz}
          onShare={(quizSetId) => {
            setSelectedQuizSetId(quizSetId);
            handleViewChange('qrShare');
          }}
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
        return <Settings
          onBack={() => handleViewChange('menu')}
          onToggleDarkMode={toggleDarkMode}
          isDarkMode={isDarkMode}
          language={language as 'ja' | 'en'}
          onShowOnboarding={() => setShowOnboarding(true)}
          onNavigate={handleViewChange}
        />;
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
      case 'advancedBackup':
        return <AdvancedBackupManager onBack={() => handleViewChange('menu')} />;
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
      case 'allFeatures':
        return <MainMenu onNavigate={handleViewChange} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />;
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
            console.log('🎯 [App] onStartQuiz called with params:', params);
            if (params?.problemIds && params.problemIds.length > 0) {
              // problemIdsが渡された場合は直接QuizViewに遷移
              setQuizParams(params);
              setCurrentView('quiz');
              setAdView('quiz');
            } else if (params?.category) {
              // カテゴリー別クイズの場合
              setQuizParams(params);
              setCurrentView('quiz');
              setAdView('quiz');
            } else {
              // その他の場合は通常フロー
              setQuizParams(params);
              setCurrentView('quiz');
              setAdView('quiz');
            }
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
                  handleViewChange('quiz', { problemIds });
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
      case 'smartNotes':
        return <SmartNoteViewer onBack={() => handleViewChange('menu')} language={language as 'ja' | 'en'} />;
      case 'subtopicAnalysis':
        return <SubtopicAnalyzer
          examId="general"
          examName={language === 'ja' ? 'サブトピック分析' : 'Subtopic Analysis'}
          subjects={[]}
          onBack={() => handleViewChange('menu')}
          lang={language as 'ja' | 'en'}
        />;
      case 'templateManager':
        return <TemplateManager onBack={() => handleViewChange('menu')} />;
      case 'favorites':
        return <FavoritesList
          onBack={() => handleViewChange('menu')}
          onStartQuiz={(problemIds) => {
            console.log('📋 App.tsx: onStartQuiz called with:', {
              problemIds,
              problemIdsLength: problemIds.length
            });
            const params = {
              problemIds,
              mode: 'review' as const
            };
            console.log('📋 App.tsx: Saving params to sessionStorage:', params);
            // Save to sessionStorage to survive re-renders
            sessionStorage.setItem('pendingQuizParams', JSON.stringify(params));

            console.log('📋 App.tsx: Setting quizParams with flushSync');
            flushSync(() => {
              setQuizParams(params);
            });
            console.log('📋 App.tsx: Changing view to quiz');
            handleViewChange('quiz');
          }}
        />;
      case 'spacedRepetitionManager':
        return <SpacedRepetitionManager onNavigate={handleViewChange} />;
      case 'spacedRepetitionReview':
        // SM-2復習は現在QuizViewで表示されるため、このケースは使われない
        return <SpacedRepetitionReview onNavigate={handleViewChange} />;
      case 'studyPlanDashboard':
        return <StudyPlanDashboard
          onBack={() => handleViewChange('menu')}
          onCreatePlan={() => handleViewChange('studyPlan')}
          onNavigateToQuiz={(sessionId) => handleViewChange('quiz', { sessionId })}
          language={language as 'ja' | 'en'}
        />;
      case 'studyPlan':
        return <StudyPlanCreator
          onBack={() => handleViewChange('studyPlanDashboard')}
          onPlanCreated={() => handleViewChange('studyPlanDashboard')}
          language={language as 'ja' | 'en'}
        />;
      case 'aiGenerator':
        return <AIProblemGenerator
          onBack={() => handleViewChange('menu')}
          onSaved={() => handleViewChange('problemEdit')}
          onNavigate={(view) => handleViewChange(view as View)}
        />;
      case 'promptGenerator':
        return <PromptGeneratorCard
          onBack={() => handleViewChange('menu')}
          language={language as 'ja' | 'en'}
        />;
      case 'pricing':
        return <PricingPage
          onBack={() => handleViewChange('menu')}
          onNavigate={handleViewChange}
        />;
      case 'paymentSuccess':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">お支払い完了！</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                プランのアップグレードが完了しました。すべての機能をお楽しみください。
              </p>
              <button
                onClick={() => handleViewChange('menu')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        );
      case 'paymentCancel':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">😢</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">お支払いがキャンセルされました</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                お支払い手続きがキャンセルされました。いつでもプランをアップグレードできます。
              </p>
              <button
                onClick={() => handleViewChange('menu')}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        );
      case 'pastExamAnalysis':
        return <PastExamAnalysis
          onBack={() => handleViewChange('menu')}
          onNavigate={handleViewChange}
          language={language as 'ja' | 'en'}
        />;
      case 'badges':
        return <BadgeCollection
          onBack={() => handleViewChange('menu')}
          language={language as 'ja' | 'en'}
        />;
      case 'pdcaCycle':
        return <PDCACycleDashboard
          onNavigate={handleViewChange}
          onBack={() => handleViewChange('menu')}
          language={language as 'ja' | 'en'}
        />;
      case 'create':
        return <CreateHub onNavigate={handleViewChange} />;
      case 'review':
        return <ReviewView onNavigate={handleViewChange} language={language as 'ja' | 'en'} />;
      case 'more':
        return <MoreView onNavigate={handleViewChange} />;
      case 'promptWizard':
        return <PromptWizard
          language={language as 'ja' | 'en'}
          onNavigate={handleViewChange}
          onBack={() => handleViewChange('create')}
        />;
      case 'aiHandoff':
        return <AIHandoff
          language={language as 'ja' | 'en'}
          onNavigate={handleViewChange}
          onBack={() => handleViewChange('promptWizard')}
        />;
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

  // Daily Review Interstitial (shown once per day when review cards are due)
  if (showReviewInterstitial && currentView === 'menu') {
    return (
      <DailyReviewInterstitial
        onStartReview={(problemIds) => {
          setShowReviewInterstitial(false);
          handleViewChange('quiz', { problemIds });
        }}
        onSkip={() => setShowReviewInterstitial(false)}
        language={language as 'ja' | 'en'}
      />
    );
  }

  // クイズプレイ中はAppShellのナビバーを非表示にする
  const hideNavViews = ['quiz', 'exam', 'podcast'];
  if (hideNavViews.includes(currentView)) {
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
      {/* ストリーク危機バナー（ホーム画面のみ） */}
      {currentView === 'menu' && (
        <StreakAtRiskBanner
          onStartQuick={() => handleViewChange('quiz')}
          language={language as 'ja' | 'en'}
        />
      )}
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
    <AuthProvider>
      <SubscriptionProvider>
        <LanguageProvider>
          <AdFreeProvider>
            <AdProvider>
              <PomodoroProvider>
                <AppContent />
              </PomodoroProvider>
            </AdProvider>
          </AdFreeProvider>
        </LanguageProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
