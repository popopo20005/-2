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

export type View = 'menu' | 'quiz' | 'editor' | 'quizSets' | 'stats' | 'history' | 'settings' | 'migration' | 'backup' | 'share' | 'categoryQuiz' | 'problemEdit';

interface QuizParams {
  quizSetId?: number;
  useLatestOnly?: boolean;
  mode?: 'quizSetWorstProblems' | 'categoryQuiz';
  category?: string;
}

function App() {
  const [currentView, setCurrentView] = useState<View>('menu');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setShowMigration] = useState(false);
  const [quizParams, setQuizParams] = useState<QuizParams | null>(null);


  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('アプリケーションを初期化中...');
        
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
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

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

  const startCategoryQuiz = (category: string) => {
    setQuizParams({
      category,
      mode: 'categoryQuiz'
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
        />;
      case 'history':
        return <History onBack={() => setCurrentView('menu')} />;
      case 'settings':
        return <Settings onBack={() => setCurrentView('menu')} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />;
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
      default:
        return <MainMenu onNavigate={setCurrentView} onToggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}>
      <FloatingParticles />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {renderCurrentView()}
        <PWAInstallPrompt />
      </div>
    </div>
  );
}

export default App;
