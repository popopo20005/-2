import { useState, useEffect } from 'react';
import { initializeDatabase } from './lib/database';
import { forceQuizActionButtonStyles } from './forceButtonStyles';
import { MainMenu } from './components/MainMenu';
import { QuizView } from './components/QuizView';
import { ProblemEditor } from './components/ProblemEditor';
import { QuizSetManager } from './components/QuizSetManager';
import { Statistics } from './components/Statistics';
import { History } from './components/History';
import { Settings } from './components/Settings';
import { DataMigration } from './components/DataMigration';
import { BackupManager } from './components/BackupManager';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ShareCenter } from './components/ShareCenter';
import { FloatingParticles } from './components/FloatingParticles';
import { QuizSetCategorySelector } from './components/QuizSetCategorySelector';
import { ProblemEditManager } from './components/ProblemEditManager';
import { QuizSetDetailStats } from './components/QuizSetDetailStats';
import { StudyDiary } from './components/StudyDiary';
import { LearningInsights } from './components/LearningInsights';
import { RecommendationDashboard } from './components/RecommendationDashboard';
import { SessionSettings } from './components/SessionSettings';
import { LearningReminder } from './components/LearningReminder';
import { DifficultyAdjustment } from './components/DifficultyAdjustment';

export type View = 'menu' | 'quiz' | 'editor' | 'quizSets' | 'stats' | 'history' | 'settings' | 'migration' | 'backup' | 'share' | 'categoryQuiz' | 'problemEdit' | 'quizSetStats' | 'diary' | 'insights' | 'recommendations' | 'sessionSettings' | 'reminderSettings' | 'difficultySettings';

interface QuizParams {
  quizSetId?: number;
  useLatestOnly?: boolean;
  mode?: 'quizSetWorstProblems' | 'categoryQuiz' | 'review';
  category?: string;
  problemIds?: number[];
}

function App() {
  const [currentView, setCurrentView] = useState<View>('menu');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setShowMigration] = useState(false);
  const [quizParams, setQuizParams] = useState<QuizParams | null>(null);
  const [selectedQuizSetId, setSelectedQuizSetId] = useState<number | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');


  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('アプリケーションを初期化中...');
        console.log('ユーザーエージェント:', navigator.userAgent);
        console.log('画面サイズ:', window.innerWidth, 'x', window.innerHeight);
        
        // データベース初期化
        await initializeDatabase();
        console.log('データベースの初期化完了');
        
        // ダークモード設定読み込み
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(savedDarkMode);
        
        // documentElementに初期ダークモードクラスを適用
        if (savedDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        console.log('初期ダークモード設定:', { 
          savedDarkMode, 
          documentClasses: document.documentElement.className 
        });
        
        // 既存データの確認（旧IndexedDBデータがあるかチェック）
        const hasLegacyData = await checkForLegacyData();
        console.log('レガシーデータの確認:', hasLegacyData);
        if (hasLegacyData) {
          setShowMigration(true);
          setCurrentView('migration');
        }
        
        console.log('アプリケーションの初期化完了');
        
        // ボタンスタイルを強制適用
        forceQuizActionButtonStyles();
        
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
  }, []);

  // Language change listener
  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('language') || 'ja');
    };

    window.addEventListener('storage', handleStorageChange);

    // Periodic check for language changes
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
    console.log('ダークモード切り替え:', { 現在: isDarkMode, 新しい値: newDarkMode });
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    // 複数箇所でdarkクラスを適用/削除（確実性のため）
    const elementsToToggle = [document.documentElement, document.body];
    
    elementsToToggle.forEach(element => {
      if (newDarkMode) {
        element.classList.add('dark');
      } else {
        element.classList.remove('dark');
      }
    });
    
    // 強制的にスタイルを適用
    if (newDarkMode) {
      document.body.style.backgroundColor = '#111827'; // ダークグレー
      document.body.style.color = '#f9fafb'; // 明るいテキスト
    } else {
      document.body.style.backgroundColor = '#f8fafc'; // ライトモード
      document.body.style.color = '#111827'; // 暗いテキスト
    }
    
    console.log('ダークモード設定完了:', { 
      localStorage: localStorage.getItem('darkMode'),
      documentClasses: document.documentElement.className,
      bodyClasses: document.body.className,
      bodyStyle: document.body.style.backgroundColor
    });
  };

  const startQuizSetWorstProblems = (quizSetId: number, useLatestOnly: boolean) => {
    setQuizParams({
      quizSetId,
      useLatestOnly,
      mode: 'quizSetWorstProblems'
    });
    setCurrentView('quiz');
  };


  const startQuizSetQuiz = (quizSetId: number) => {
    setQuizParams({
      quizSetId,
      mode: undefined
    });
    setCurrentView('quiz');
  };

  const startQuizSetCategoryQuiz = (quizSetId: number, category: string) => {
    setQuizParams({
      quizSetId,
      category,
      mode: 'categoryQuiz'
    });
    setCurrentView('quiz');
  };

  const openQuizSetStats = (quizSetId: number) => {
    setSelectedQuizSetId(quizSetId);
    setCurrentView('quizSetStats');
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
        return <MainMenu onNavigate={setCurrentView} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />;
      case 'quiz':
        return <QuizView 
          onBack={() => {
            setCurrentView('menu');
            setQuizParams(null);
          }} 
          initialParams={quizParams}
        />;
      case 'editor':
        return <ProblemEditor onBack={() => setCurrentView('menu')} />;
      case 'quizSets':
        return <QuizSetManager 
          onBack={() => setCurrentView('menu')} 
          onStartQuiz={startQuizSetQuiz}
          onStartCategoryQuiz={startQuizSetCategoryQuiz}
        />;
      case 'stats':
        return <Statistics
          onBack={() => setCurrentView('menu')}
          onStartQuizSetWorstProblems={startQuizSetWorstProblems}
          onOpenQuizSetStats={openQuizSetStats}
          isDarkMode={isDarkMode}
          language={language as 'ja' | 'en'}
        />;
      case 'history':
        return <History onBack={() => setCurrentView('menu')} />;
      case 'settings':
        return <Settings onBack={() => setCurrentView('menu')} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} language={language as 'ja' | 'en'} />;
      case 'migration':
        return (
          <DataMigration 
            onComplete={() => {
              setShowMigration(false);
              setCurrentView('menu');
            }}
            onSkip={() => {
              setShowMigration(false);
              setCurrentView('menu');
            }}
          />
        );
      case 'backup':
        return <BackupManager onBack={() => setCurrentView('menu')} />;
      case 'share':
        return <ShareCenter onBack={() => setCurrentView('menu')} />;
      case 'categoryQuiz':
        return <QuizSetCategorySelector 
          onBack={() => setCurrentView('menu')} 
          onStartQuiz={startQuizSetCategoryQuiz}
        />;
      case 'problemEdit':
        return <ProblemEditManager onBack={() => setCurrentView('menu')} />;
      case 'quizSetStats':
        return selectedQuizSetId ? (
          <QuizSetDetailStats
            quizSetId={selectedQuizSetId}
            onBack={() => {
              setCurrentView('stats');
              setSelectedQuizSetId(null);
            }}
            isDarkMode={isDarkMode}
            language={language as 'ja' | 'en'}
          />
        ) : (
          <MainMenu onNavigate={setCurrentView} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
        );
      case 'diary':
        return <StudyDiary onBack={() => setCurrentView('menu')} isDarkMode={isDarkMode} language={language as 'ja' | 'en'} />;
      case 'insights':
        return <LearningInsights onBack={() => setCurrentView('menu')} isDarkMode={isDarkMode} language={language as 'ja' | 'en'} />;
      case 'recommendations':
        return <RecommendationDashboard
          onBack={() => setCurrentView('menu')}
          onStartQuiz={(params) => {
            setQuizParams(params);
            setCurrentView('quiz');
          }}
          onNavigateToSettings={(view: View) => setCurrentView(view)}
          isDarkMode={isDarkMode}
          language={language as 'ja' | 'en'}
        />;
      case 'sessionSettings':
        return <SessionSettings onBack={() => setCurrentView('menu')} language={language as 'ja' | 'en'} />;
      case 'reminderSettings':
        return <LearningReminder onBack={() => setCurrentView('menu')} language={language as 'ja' | 'en'} />;
      case 'difficultySettings':
        return <DifficultyAdjustment onBack={() => setCurrentView('menu')} language={language as 'ja' | 'en'} />;
      default:
        return <MainMenu onNavigate={setCurrentView} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />;
    }
  };

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

  return (
    <div 
      className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}
      style={{ 
        minHeight: '100vh', 
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        color: isDarkMode ? '#f9fafb' : '#111827'
      }}
    >
      <FloatingParticles />
      <div 
        className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        style={{ 
          minHeight: '100vh', 
          backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
          color: isDarkMode ? '#f9fafb' : '#111827'
        }}
      >
        {renderCurrentView()}
        <PWAInstallPrompt />
      </div>
    </div>
  );
}

export default App;
