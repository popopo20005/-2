import { useState, useEffect } from 'react';
import { categoryService, problemService, quizSetService, historyService, quizSessionService } from '../lib/database';
import type { Problem, QuizSet, QuizSession } from '../types';

interface QuizParams {
  quizSetId?: number;
  useLatestOnly?: boolean;
  mode?: 'quizSetWorstProblems' | 'categoryQuiz';
  category?: string;
}

interface QuizViewProps {
  onBack: () => void;
  initialParams?: QuizParams | null;
}

type QuizMode = 'selection' | 'playing' | 'result';
type QuizType = 'all' | 'category' | 'quizSet' | 'incorrect' | 'quizSetIncorrect' | 'quizSetWorstProblems';

export function QuizView({ onBack, initialParams }: QuizViewProps) {
  const [mode, setMode] = useState<QuizMode>('selection');
  const [isLoading, setIsLoading] = useState(true);
  
  // Language state management
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  
  // データ
  const [categories, setCategories] = useState<string[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [savedSessions, setSavedSessions] = useState<QuizSession[]>([]);
  
  // クイズ選択
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedQuizSet, setSelectedQuizSet] = useState<number | null>(null);
  
  // クイズプレイ状態
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(boolean | number)[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // セッション管理
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);

  // Language change detection
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

  // Translation objects
  const t = {
    ja: {
      loading: 'データを読み込み中...',
      pageTitle: {
        selection: 'クイズ開始',
        playing: 'クイズプレイ',
        result: 'クイズ結果'
      },
      buttons: {
        backToMenu: '← メインメニューに戻る',
        endQuiz: '← クイズを終了',
        saveAndExit: '💾 保存して終了',
        startQuiz: '選択したカテゴリーで開始',
        startIncorrect: '間違えた問題で復習',
        startQuizSet: '選択した問題集で開始',
        startIncorrectLatest: '間違えた問題で復習（最新版）',
        startIncorrectAll: '間違えた問題で復習（全履歴）',
        startAllProblems: '全問題で開始',
        startIncorrectOnly: '間違えた問題のみで復習',
        nextQuestion: '次の問題へ',
        finishQuiz: 'クイズ終了',
        resumeSession: '🎯 再開する',
        deleteSession: '🗑️ 削除',
        deleteAllSessions: '🗑️ すべてのセッションを削除',
        retryQuiz: '別のクイズに挑戦'
      },
      labels: {
        selectCategory: 'カテゴリーを選択:',
        selectCategoryOption: 'カテゴリーを選択',
        selectQuizSet: '問題集を選択:',
        selectQuizSetOption: '問題集を選択',
        questionNumber: '問題',
        correctCount: '正解数:',
        lastSaved: '💾 最終保存:',
        correct: '正しい',
        incorrect: '間違い',
        yourAnswer: 'あなたの回答:',
        correctAnswer: '正解:',
        explanation: '解説',
        accuracy: '正答率:',
        playTime: '所要時間:',
        minutes: '分',
        seconds: '秒',
        correctAnswers: '正解',
        incorrectAnswers: '不正解',
        totalQuestions: '総問題数'
      },
      sections: {
        categoryQuiz: {
          title: '📚 カテゴリー別クイズ'
        },
        quizSetQuiz: {
          title: '📖 問題集クイズ'
        },
        otherQuiz: {
          title: '🎯 その他のクイズ'
        },
        statistics: {
          title: '📊 統計情報',
          totalProblems: '総問題数:',
          totalCategories: 'カテゴリー数:',
          totalQuizSets: '問題集数:'
        },
        savedSessions: {
          title: '💾 保存されたクイズセッション',
          count: '件',
          progress: '進捗:',
          correct: '正解:',
          timeElapsed: '分経過',
          paused: '⏸️ 一時停止中',
          accuracyRate: '正答率:'
        }
      },
      messages: {
        noProblemsFound: '出題する問題がありません',
        quizStartError: 'クイズの開始に失敗しました',
        sessionNotFound: 'セッションが見つかりません',
        sessionResumeError: 'セッションの再開に失敗しました',
        sessionSaved: '💾 進捗が保存されました',
        sessionSaveError: '❌ 保存に失敗しました',
        sessionCompleted: '🎉 クイズが完了しました！',
        sessionResumed: '🎯 セッションを再開しました！',
        confirmEndQuiz: 'クイズを終了しますか？\n\n進捗は自動保存されます。',
        confirmDeleteSession: 'このセッションを削除しますか？\n\n進捗は失われます。',
        confirmDeleteAllSessions: 'すべてのセッションを削除しますか？\n\nすべての進捗が失われます。',
        confirmResumeSession: 'セッションを再開しますか？',
        quizInProgress: 'クイズが進行中です。ページを移動すると進捗が保存されます。',
        resumedSession: '🔄 再開されたセッション'
      },
      feedback: {
        correct: '✅ 正解！',
        incorrect: '❌ 不正解'
      }
    },
    en: {
      loading: 'Loading data...',
      pageTitle: {
        selection: 'Start Quiz',
        playing: 'Quiz Play',
        result: 'Quiz Result'
      },
      buttons: {
        backToMenu: '← Back to Main Menu',
        endQuiz: '← End Quiz',
        saveAndExit: '💾 Save and Exit',
        startQuiz: 'Start with Selected Category',
        startIncorrect: 'Review Incorrect Problems',
        startQuizSet: 'Start with Selected Quiz Set',
        startIncorrectLatest: 'Review Incorrect Problems (Latest)',
        startIncorrectAll: 'Review Incorrect Problems (All History)',
        startAllProblems: 'Start with All Problems',
        startIncorrectOnly: 'Review Incorrect Problems Only',
        nextQuestion: 'Next Question',
        finishQuiz: 'Finish Quiz',
        resumeSession: '🎯 Resume',
        deleteSession: '🗑️ Delete',
        deleteAllSessions: '🗑️ Delete All Sessions',
        retryQuiz: 'Try Another Quiz'
      },
      labels: {
        selectCategory: 'Select Category:',
        selectCategoryOption: 'Select Category',
        selectQuizSet: 'Select Quiz Set:',
        selectQuizSetOption: 'Select Quiz Set',
        questionNumber: 'Question',
        correctCount: 'Correct:',
        lastSaved: '💾 Last Saved:',
        correct: 'Correct',
        incorrect: 'Incorrect',
        yourAnswer: 'Your Answer:',
        correctAnswer: 'Correct Answer:',
        explanation: 'Explanation',
        accuracy: 'Accuracy:',
        playTime: 'Play Time:',
        minutes: 'min',
        seconds: 'sec',
        correctAnswers: 'Correct',
        incorrectAnswers: 'Incorrect',
        totalQuestions: 'Total Questions'
      },
      sections: {
        categoryQuiz: {
          title: '📚 Category Quiz'
        },
        quizSetQuiz: {
          title: '📖 Quiz Set Quiz'
        },
        otherQuiz: {
          title: '🎯 Other Quiz'
        },
        statistics: {
          title: '📊 Statistics',
          totalProblems: 'Total Problems:',
          totalCategories: 'Categories:',
          totalQuizSets: 'Quiz Sets:'
        },
        savedSessions: {
          title: '💾 Saved Quiz Sessions',
          count: 'sessions',
          progress: 'Progress:',
          correct: 'Correct:',
          timeElapsed: 'min elapsed',
          paused: '⏸️ Paused',
          accuracyRate: 'Accuracy:'
        }
      },
      messages: {
        noProblemsFound: 'No problems found to quiz',
        quizStartError: 'Failed to start quiz',
        sessionNotFound: 'Session not found',
        sessionResumeError: 'Failed to resume session',
        sessionSaved: '💾 Progress saved',
        sessionSaveError: '❌ Save failed',
        sessionCompleted: '🎉 Quiz completed!',
        sessionResumed: '🎯 Session resumed!',
        confirmEndQuiz: 'End quiz?\n\nProgress will be auto-saved.',
        confirmDeleteSession: 'Delete this session?\n\nProgress will be lost.',
        confirmDeleteAllSessions: 'Delete all sessions?\n\nAll progress will be lost.',
        confirmResumeSession: 'Resume session?',
        quizInProgress: 'Quiz in progress. Progress will be saved when leaving the page.',
        resumedSession: '🔄 Resumed Session'
      },
      feedback: {
        correct: '✅ Correct!',
        incorrect: '❌ Incorrect'
      }
    }
  };

  const currentLang = language as keyof typeof t;

  // ページ移動時の警告処理
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (mode === 'playing' && currentSessionId) {
        e.preventDefault();
        e.returnValue = t[currentLang].messages.quizInProgress;
        // 緊急保存を実行
        saveSession();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && mode === 'playing' && currentSessionId) {
        // フォーカスが外れた時に保存
        saveSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mode, currentSessionId]);

  useEffect(() => {
    if (initialParams && !isLoading) {
      if (initialParams.mode === 'quizSetWorstProblems' && initialParams.quizSetId) {
        // 統計画面からの苦手問題プレイ開始
        setSelectedQuizSet(initialParams.quizSetId);
        startQuiz('quizSetWorstProblems', initialParams.useLatestOnly || true);
      } else if (initialParams.mode === 'categoryQuiz' && initialParams.category) {
        // カテゴリー別クイズ開始
        setSelectedCategory(initialParams.category);
        if (initialParams.quizSetId) {
          setSelectedQuizSet(initialParams.quizSetId);
        }
        startQuizWithParams('category', initialParams.category, initialParams.quizSetId);
      } else if (initialParams.quizSetId && !initialParams.mode) {
        // 問題集クイズ開始
        setSelectedQuizSet(initialParams.quizSetId);
        startQuiz('quizSet');
      }
    }
  }, [initialParams, isLoading]);

  const loadData = async () => {
    try {
      const [categoriesData, quizSetsData, problemsData] = await Promise.all([
        categoryService.getAll(),
        quizSetService.getAll(),
        problemService.getAll()
      ]);
      
      console.log('読み込まれたデータ:', {
        categories: categoriesData,
        quizSets: quizSetsData,
        problems: problemsData
      });
      
      setCategories(categoriesData);
      setQuizSets(quizSetsData);
      setAllProblems(problemsData);
      
      // セッションデータは後で読み込み（エラーを避けるため）
      try {
        const sessionsData = await quizSessionService.getActiveSessions();
        setSavedSessions(sessionsData);
      } catch (sessionError) {
        console.warn('Session data loading failed:', sessionError);
        setSavedSessions([]);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIncorrectProblems = async (): Promise<Problem[]> => {
    const history = await historyService.getAll();
    const incorrectProblemIds = new Set<number>();
    
    // 各問題の最新の回答履歴をチェック
    const problemAnswers = new Map<number, boolean>();
    
    // 時系列順に履歴を処理して最新の結果を取得
    const sortedHistory = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    for (const entry of sortedHistory) {
      if (!problemAnswers.has(entry.problemId)) {
        problemAnswers.set(entry.problemId, entry.isCorrect);
      }
    }
    
    // 最新で間違えた問題のIDを収集
    for (const [problemId, isCorrect] of problemAnswers) {
      if (!isCorrect) {
        incorrectProblemIds.add(problemId);
      }
    }
    
    return allProblems.filter(problem => problem.id && incorrectProblemIds.has(problem.id));
  };

  const getIncorrectProblemsForQuizSet = async (quizSetId: number, useLatestOnly: boolean = true): Promise<Problem[]> => {
    const quizSet = await quizSetService.getById(quizSetId);
    if (!quizSet) return [];

    const history = await historyService.getAll();
    const incorrectProblemIds = new Set<number>();
    
    if (useLatestOnly) {
      // 最新の回答履歴から間違えた問題を取得
      const problemAnswers = new Map<number, boolean>();
      const sortedHistory = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      for (const entry of sortedHistory) {
        if (quizSet.problemIds.includes(entry.problemId) && !problemAnswers.has(entry.problemId)) {
          problemAnswers.set(entry.problemId, entry.isCorrect);
        }
      }
      
      for (const [problemId, isCorrect] of problemAnswers) {
        if (!isCorrect) {
          incorrectProblemIds.add(problemId);
        }
      }
    } else {
      // 過去に一度でも間違えた問題を取得
      const incorrectEntries = history.filter(entry => 
        !entry.isCorrect && quizSet.problemIds.includes(entry.problemId)
      );
      incorrectEntries.forEach(entry => incorrectProblemIds.add(entry.problemId));
    }
    
    return allProblems.filter(problem => 
      problem.id && incorrectProblemIds.has(problem.id) && quizSet.problemIds.includes(problem.id)
    );
  };

  const startQuizWithParams = async (type: QuizType, category?: string, quizSetId?: number, useLatestOnly: boolean = true) => {
    let problems: Problem[] = [];
    
    try {
      switch (type) {
        case 'all':
          problems = [...allProblems];
          break;
        case 'category':
          if (category) {
            console.log('カテゴリークイズ開始:', { category, quizSetId });
            if (quizSetId) {
              // 問題集内のカテゴリー別クイズ
              console.log('問題集内カテゴリークイズ:', quizSetId);
              const quizSet = await quizSetService.getById(quizSetId);
              console.log('取得した問題集:', quizSet);
              if (quizSet) {
                const quizSetProblems = await problemService.getByIds(quizSet.problemIds);
                console.log('問題集の全問題:', quizSetProblems);
                problems = quizSetProblems.filter(p => p.category === category);
                console.log('フィルタリング後の問題:', problems);
              }
            } else {
              // 全問題からのカテゴリー別クイズ
              problems = allProblems.filter(p => p.category === category);
            }
          }
          break;
        case 'quizSet':
          if (quizSetId) {
            const quizSet = await quizSetService.getById(quizSetId);
            if (quizSet) {
              problems = await problemService.getByIds(quizSet.problemIds);
            }
          }
          break;
        case 'quizSetIncorrect':
          if (quizSetId) {
            problems = await getIncorrectProblemsForQuizSet(quizSetId, useLatestOnly);
          }
          break;
        case 'quizSetWorstProblems':
          if (quizSetId) {
            const allHistory = await historyService.getAll();
            const quizSet = await quizSetService.getById(quizSetId);
            
            if (quizSet) {
              const quizSetProblems = await problemService.getByIds(quizSet.problemIds);
              
              const problemStats = quizSetProblems.map(problem => {
                const histories = allHistory.filter(h => h.problemId === problem.id);
                
                if (useLatestOnly && histories.length > 0) {
                  const latestHistory = histories.reduce((latest, current) => 
                    new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
                  );
                  const correctRate = latestHistory.isCorrect ? 1 : 0;
                  return { problem, correctRate, historyCount: 1 };
                } else {
                  const correctCount = histories.filter(h => h.isCorrect).length;
                  const totalCount = histories.length;
                  const correctRate = totalCount > 0 ? correctCount / totalCount : 0.5;
                  return { problem, correctRate, historyCount: totalCount };
                }
              });
              
              problemStats.sort((a, b) => a.correctRate - b.correctRate);
              problems = problemStats.slice(0, 20).map(stat => stat.problem);
            }
          }
          break;
        case 'incorrect':
          problems = await getIncorrectProblems();
          break;
      }
      
      if (problems.length === 0) {
        console.log('No problems found:', { type, category, quizSetId, allProblems: allProblems.length });
        alert(t[currentLang].messages.noProblemsFound);
        return;
      }
      
      // 問題をシャッフル
      const shuffledProblems = [...problems].sort(() => Math.random() - 0.5);
      
      // セッション管理
      const sessionId = Date.now().toString();
      try {
        const session = {
          id: sessionId,
          problems: shuffledProblems,
          currentIndex: 0,
          score: 0,
          answers: [],
          startTime: new Date(),
          isCompleted: false,
          isPaused: false
        };
        
        await quizSessionService.save(session);
        setCurrentSessionId(sessionId);
      } catch (sessionError) {
        console.warn('セッション保存に失敗しましたが、クイズは続行します:', sessionError);
        setCurrentSessionId(null);
      }
      
      setCurrentProblems(shuffledProblems);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers([]);
      setShowFeedback(false);
      setStartTime(new Date());
      setMode('playing');
      
      // 自動保存タイマーを開始（30秒間隔）
      const interval = setInterval(async () => {
        if (currentSessionId) {
          await saveSession();
          setLastSaved(new Date());
        }
      }, 30000);
      setAutoSaveInterval(interval);
      
    } catch (error) {
      console.error('Quiz start error:', error);
      alert(t[currentLang].messages.quizStartError);
    }
  };

  const startQuiz = async (type: QuizType, useLatestOnly: boolean = true) => {
    return startQuizWithParams(type, selectedCategory, selectedQuizSet || undefined, useLatestOnly);
  };

  const resumeSession = async (sessionId: string) => {
    try {
      const session = await quizSessionService.getById(sessionId);
      if (!session) {
        alert(t[currentLang].messages.sessionNotFound);
        return;
      }

      // セッション再開の確認
      const progressPercent = ((session.currentIndex / session.problems.length) * 100).toFixed(0);
      const confirmMessage = `${t[currentLang].messages.confirmResumeSession}\n\n` +
        `${t[currentLang].labels.totalQuestions}: ${session.problems.length}${currentLang === 'ja' ? '問' : ''}\n` +
        `${t[currentLang].sections.savedSessions.progress} ${session.currentIndex + 1}${currentLang === 'ja' ? '問目' : ''} (${progressPercent}%)\n` +
        `${t[currentLang].sections.savedSessions.correct} ${session.score}${currentLang === 'ja' ? '問' : ''}\n` +
        `${currentLang === 'ja' ? '開始日時' : 'Start Time'}: ${session.startTime.toLocaleString()}`;
      
      if (!confirm(confirmMessage)) {
        return;
      }

      // セッションの再開処理
      await quizSessionService.save({
        ...session,
        isPaused: false,
        pausedAt: undefined,
        resumedAt: new Date()
      });

      setCurrentSessionId(sessionId);
      setCurrentProblems(session.problems);
      setCurrentIndex(session.currentIndex);
      setScore(session.score);
      setUserAnswers(session.answers);
      setShowFeedback(false);
      setStartTime(session.startTime);
      setIsResuming(true);
      setMode('playing');
      
      // 自動保存タイマーを再開
      const interval = setInterval(async () => {
        if (currentSessionId) {
          await saveSession();
          setLastSaved(new Date());
        }
      }, 30000);
      setAutoSaveInterval(interval);
      
      // 再開通知
      setTimeout(() => {
        const notification = document.createElement('div');
        notification.textContent = `${t[currentLang].messages.sessionResumed} (${session.currentIndex + 1}${currentLang === 'ja' ? '問目から' : ' onwards'})`;
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        document.body.appendChild(notification);
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 3000);
      }, 500);
    } catch (error) {
      console.error('Session resume error:', error);
      alert(t[currentLang].messages.sessionResumeError);
    }
  };

  const saveSession = async (showNotification: boolean = false) => {
    if (!currentSessionId) return;

    try {
      const session = await quizSessionService.getById(currentSessionId);
      if (session) {
        session.currentIndex = currentIndex;
        session.score = score;
        session.answers = userAnswers;
        session.isPaused = true;
        session.pausedAt = new Date();
        session.lastSaved = new Date();
        
        await quizSessionService.save(session);
        setLastSaved(new Date());
        
        if (showNotification) {
          const notification = document.createElement('div');
          notification.textContent = t[currentLang].messages.sessionSaved;
          notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-lg shadow-lg z-50 text-sm';
          document.body.appendChild(notification);
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 1500);
        }
      }
    } catch (error) {
      console.error('セッション保存エラー:', error);
      if (showNotification) {
        const notification = document.createElement('div');
        notification.textContent = t[currentLang].messages.sessionSaveError;
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-lg shadow-lg z-50 text-sm';
        document.body.appendChild(notification);
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 2000);
      }
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await quizSessionService.delete(sessionId);
      await loadData(); // Reload to update saved sessions list
    } catch (error) {
      console.error('セッション削除エラー:', error);
    }
  };

  const handleAnswer = async (answer: boolean | number) => {
    const currentProblem = currentProblems[currentIndex];
    if (!currentProblem) return;

    const isCorrect = currentProblem.type === 'multiple-choice' 
      ? answer === currentProblem.correctAnswer
      : answer === currentProblem.answer;

    if (isCorrect) {
      setScore(score + 1);
    }

    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    // 履歴に記録
    try {
      await historyService.add({
        problemId: currentProblem.id!,
        category: currentProblem.category,
        isCorrect,
        userAnswer: answer,
        questionText: currentProblem.question
      });
    } catch (error) {
      console.error('履歴記録エラー:', error);
    }

    setShowFeedback(true);
  };

  const nextQuestion = async () => {
    if (currentIndex < currentProblems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
      setIsResuming(false); // 次の問題に進んだら再開状態を解除
      // セッションの進捗を自動保存
      await saveSession();
    } else {
      // クイズ完了時
      if (currentSessionId) {
        try {
          const session = await quizSessionService.getById(currentSessionId);
          if (session) {
            session.isCompleted = true;
            session.isPaused = false;
            session.completedAt = new Date();
            await quizSessionService.save(session);
            
            // 完了通知
            const notification = document.createElement('div');
            notification.textContent = t[currentLang].messages.sessionCompleted;
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            document.body.appendChild(notification);
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 2000);
          }
        } catch (error) {
          console.error('セッション完了処理エラー:', error);
        }
      }
      
      // 自動保存タイマーをクリア
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        setAutoSaveInterval(null);
      }
      
      setMode('result');
    }
  };

  const resetQuiz = async () => {
    // 自動保存タイマーをクリア
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      setAutoSaveInterval(null);
    }
    
    // 進行中のセッションを保存
    if (currentSessionId && mode === 'playing') {
      await saveSession();
    }
    
    setMode('selection');
    setCurrentProblems([]);
    setCurrentIndex(0);
    setScore(0);
    setUserAnswers([]);
    setShowFeedback(false);
    setStartTime(null);
    setSelectedCategory('');
    setSelectedQuizSet(null);
    setCurrentSessionId(null);
    setIsResuming(false);
    setLastSaved(null);
    
    // セッション一覧を更新
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
        </div>
      </div>
    );
  }

  if (mode === 'selection') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <button
              onClick={onBack}
              className="mb-4 px-4 py-2 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
            >
              {t[currentLang].buttons.backToMenu}
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t[currentLang].pageTitle.selection}</h1>
          </header>

          {/* 保存されたセッション */}
          {savedSessions.length > 0 && (
            <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-md p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100">
                  {t[currentLang].sections.savedSessions.title}
                </h2>
                <span className="text-sm text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded">
                  {savedSessions.length}{t[currentLang].sections.savedSessions.count}
                </span>
              </div>
              <div className="space-y-3">
                {savedSessions.map((session) => {
                  const progress = ((session.currentIndex / session.problems.length) * 100).toFixed(0);
                  const timeElapsed = session.pausedAt ? 
                    Math.floor((session.pausedAt.getTime() - session.startTime.getTime()) / (1000 * 60)) : 
                    Math.floor((new Date().getTime() - session.startTime.getTime()) / (1000 * 60));
                  
                  return (
                    <div key={session.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-100 dark:border-purple-700 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {session.quizSetId ? 
                                quizSets.find(qs => qs.id === session.quizSetId)?.name || (currentLang === 'ja' ? '問題集' : 'Quiz Set') :
                                session.category || (currentLang === 'ja' ? '全問題' : 'All Problems')
                              }
                            </span>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                              {session.currentIndex + 1}/{session.problems.length}{currentLang === 'ja' ? '問' : ''} ({progress}%)
                            </span>
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                              {t[currentLang].sections.savedSessions.correct} {session.score}
                            </span>
                          </div>
                          
                          {/* プログレスバー */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-3">
                              <span>📅 {session.startTime.toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              <span>⏱️ {timeElapsed}{t[currentLang].sections.savedSessions.timeElapsed}</span>
                              {session.pausedAt && (
                                <span className="text-orange-600 dark:text-orange-400">{t[currentLang].sections.savedSessions.paused}</span>
                              )}
                            </div>
                            {session.currentIndex > 0 && (
                              <span className="text-purple-600 dark:text-purple-400">
                                {t[currentLang].sections.savedSessions.accuracyRate} {((session.score / session.currentIndex) * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1 ml-4">
                          <button
                            onClick={() => resumeSession(session.id)}
                            className="px-4 py-2 bg-cyan-500 dark:bg-cyan-600 text-white border border-cyan-400 dark:border-cyan-500 hover:bg-cyan-600 dark:hover:bg-cyan-700 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm text-sm font-medium"
                          >
                            {t[currentLang].buttons.resumeSession}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t[currentLang].messages.confirmDeleteSession)) {
                                deleteSession(session.id);
                              }
                            }}
                            className="px-4 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-all text-xs shadow-md hover:shadow-lg backdrop-blur-sm"
                          >
                            {t[currentLang].buttons.deleteSession}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 一括操作 */}
              {savedSessions.length > 1 && (
                <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                  <button
                    onClick={() => {
                      if (confirm(t[currentLang].messages.confirmDeleteAllSessions)) {
                        savedSessions.forEach(session => deleteSession(session.id));
                      }
                    }}
                    className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-all text-xs shadow-md hover:shadow-lg backdrop-blur-sm"
                  >
                    {t[currentLang].buttons.deleteAllSessions}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* カテゴリー別クイズ */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
                {t[currentLang].sections.categoryQuiz.title}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].labels.selectCategory}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t[currentLang].labels.selectCategoryOption}</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={() => startQuiz('category')}
                    disabled={!selectedCategory}
                    className="quiz-action-button w-full px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                  >
                    {t[currentLang].buttons.startQuiz}
                  </button>
                  <button
                    onClick={() => startQuiz('incorrect')}
                    disabled={!selectedCategory}
                    className="quiz-action-button w-full px-4 py-2 rounded-md transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none backdrop-blur-sm"
                  >
                    {t[currentLang].buttons.startIncorrect}
                  </button>
                </div>
              </div>
            </div>

            {/* 問題集クイズ */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">
                {t[currentLang].sections.quizSetQuiz.title}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].labels.selectQuizSet}
                  </label>
                  <select
                    value={selectedQuizSet || ''}
                    onChange={(e) => setSelectedQuizSet(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t[currentLang].labels.selectQuizSetOption}</option>
                    {quizSets.map((quizSet) => (
                      <option key={quizSet.id} value={quizSet.id}>
                        {quizSet.name} ({quizSet.problemIds.length}{currentLang === 'ja' ? '問' : ' questions'})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={() => startQuiz('quizSet')}
                    disabled={!selectedQuizSet}
                    className="quiz-action-button w-full px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                  >
                    {t[currentLang].buttons.startQuizSet}
                  </button>
                  <button
                    onClick={() => startQuiz('quizSetIncorrect', true)}
                    disabled={!selectedQuizSet}
                    className="quiz-action-button w-full px-4 py-2 rounded-md transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none backdrop-blur-sm"
                  >
                    {t[currentLang].buttons.startIncorrectLatest}
                  </button>
                  <button
                    onClick={() => startQuiz('quizSetIncorrect', false)}
                    disabled={!selectedQuizSet}
                    className="quiz-action-button w-full px-4 py-2 rounded-md transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none backdrop-blur-sm"
                  >
                    {t[currentLang].buttons.startIncorrectAll}
                  </button>
                </div>
              </div>
            </div>

            {/* 全問題・間違い問題 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">
                {t[currentLang].sections.otherQuiz.title}
              </h2>
              
              <div className="space-y-2">
                <button
                  onClick={() => startQuiz('all')}
                  disabled={allProblems.length === 0}
                  className="w-full px-4 py-2 bg-cyan-500 dark:bg-cyan-600 text-white border border-cyan-400 dark:border-cyan-500 hover:bg-cyan-600 dark:hover:bg-cyan-700 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                >
                  {t[currentLang].buttons.startAllProblems} ({allProblems.length}{currentLang === 'ja' ? '問' : ' questions'})
                </button>
                <button
                  onClick={() => startQuiz('incorrect')}
                  className="quiz-action-button w-full px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg backdrop-blur-sm"
                >
                  {t[currentLang].buttons.startIncorrectOnly}
                </button>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-orange-900 dark:text-orange-100 mb-4">
                {t[currentLang].sections.statistics.title}
              </h2>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>{t[currentLang].sections.statistics.totalProblems}</span>
                  <span className="font-semibold">{allProblems.length}{currentLang === 'ja' ? '問' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t[currentLang].sections.statistics.totalCategories}</span>
                  <span className="font-semibold">{categories.length}{currentLang === 'ja' ? '個' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t[currentLang].sections.statistics.totalQuizSets}</span>
                  <span className="font-semibold">{quizSets.length}{currentLang === 'ja' ? '個' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'playing') {
    const currentProblem = currentProblems[currentIndex];
    if (!currentProblem) return null;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex flex-wrap space-x-2 mb-4">
              <button
                onClick={() => {
                  if (confirm(t[currentLang].messages.confirmEndQuiz)) {
                    resetQuiz();
                  }
                }}
                className="px-4 py-2 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all shadow-md hover:shadow-lg backdrop-blur-sm"
              >
                {t[currentLang].buttons.endQuiz}
              </button>
              <button
                onClick={async () => {
                  await saveSession(true);
                  setTimeout(() => {
                    resetQuiz();
                  }, 1500);
                }}
                className="px-4 py-2 bg-cyan-500 dark:bg-cyan-600 text-white border border-cyan-400 dark:border-cyan-500 hover:bg-cyan-600 dark:hover:bg-cyan-700 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
              >
                {t[currentLang].buttons.saveAndExit}
              </button>
              {isResuming && (
                <div className="px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-300 dark:border-amber-700 text-sm">
                  {t[currentLang].messages.resumedSession}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t[currentLang].pageTitle.playing}</h1>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t[currentLang].labels.questionNumber} {currentIndex + 1} / {currentProblems.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t[currentLang].labels.correctCount} {score} / {currentIndex + (showFeedback ? 1 : 0)}
                </p>
                {lastSaved && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {t[currentLang].labels.lastSaved} {lastSaved.toLocaleTimeString(currentLang === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </header>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm mb-4">
                {currentProblem.category}
              </span>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {currentProblem.question}
              </h2>
            </div>

            {!showFeedback ? (
              <div className="space-y-4">
                {currentProblem.type === 'multiple-choice' && currentProblem.options ? (
                  <div className="space-y-3">
                    {currentProblem.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswer(index)}
                        className="quiz-action-button w-full p-4 text-left rounded-lg transition-all transform hover:scale-102 shadow-md hover:shadow-lg backdrop-blur-sm"
                      >
                        <span className="font-bold text-white drop-shadow-sm">
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleAnswer(true)}
                      className="quiz-action-button flex-1 p-6 rounded-lg transition-all transform hover:scale-105 shadow-md hover:shadow-lg backdrop-blur-sm"
                    >
                      <span className="text-3xl font-bold text-white drop-shadow-md">○</span>
                      <p className="text-white/95 mt-2 font-medium">{t[currentLang].labels.correct}</p>
                    </button>
                    <button
                      onClick={() => handleAnswer(false)}
                      className="quiz-action-button flex-1 p-6 rounded-lg transition-all transform hover:scale-105 shadow-md hover:shadow-lg backdrop-blur-sm"
                    >
                      <span className="text-3xl font-bold text-white drop-shadow-md">×</span>
                      <p className="text-white/95 mt-2 font-medium">{t[currentLang].labels.incorrect}</p>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className={`p-4 rounded-lg ${
                  (currentProblem.type === 'multiple-choice' 
                    ? userAnswers[currentIndex] === currentProblem.correctAnswer
                    : userAnswers[currentIndex] === currentProblem.answer)
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  <h3 className="font-semibold text-lg mb-2">
                    {(currentProblem.type === 'multiple-choice' 
                      ? userAnswers[currentIndex] === currentProblem.correctAnswer
                      : userAnswers[currentIndex] === currentProblem.answer)
                      ? t[currentLang].feedback.correct : t[currentLang].feedback.incorrect}
                  </h3>
                  <p>
                    {t[currentLang].labels.yourAnswer} {
                      currentProblem.type === 'multiple-choice' && currentProblem.options
                        ? `${String.fromCharCode(65 + (userAnswers[currentIndex] as number))}. ${currentProblem.options[userAnswers[currentIndex] as number]}`
                        : userAnswers[currentIndex] ? `○ (${t[currentLang].labels.correct})` : `× (${t[currentLang].labels.incorrect})`
                    }
                  </p>
                  {(currentProblem.type === 'multiple-choice' 
                    ? userAnswers[currentIndex] !== currentProblem.correctAnswer
                    : userAnswers[currentIndex] !== currentProblem.answer) && (
                    <p>
                      {t[currentLang].labels.correctAnswer} {
                        currentProblem.type === 'multiple-choice' && currentProblem.options
                          ? `${String.fromCharCode(65 + currentProblem.correctAnswer!)}. ${currentProblem.options[currentProblem.correctAnswer!]}`
                          : currentProblem.answer ? `○ (${t[currentLang].labels.correct})` : `× (${t[currentLang].labels.incorrect})`
                      }
                    </p>
                  )}
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">{t[currentLang].labels.explanation}</h4>
                  <p className="text-blue-700 dark:text-blue-300">{currentProblem.explanation}</p>
                </div>
                
                <button
                  onClick={nextQuestion}
                  className="w-full px-6 py-3 bg-cyan-500 dark:bg-cyan-600 text-white border border-cyan-400 dark:border-cyan-500 hover:bg-cyan-600 dark:hover:bg-cyan-700 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm font-semibold"
                >
                  {currentIndex < currentProblems.length - 1 ? t[currentLang].buttons.nextQuestion : t[currentLang].buttons.finishQuiz}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'result') {
    const accuracy = currentProblems.length > 0 ? (score / currentProblems.length * 100) : 0;
    const endTime = new Date();
    const playTime = startTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">{t[currentLang].pageTitle.result}</h1>
          </header>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {score} / {currentProblems.length}
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {t[currentLang].labels.accuracy} {accuracy.toFixed(1)}%
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                {t[currentLang].labels.playTime} {Math.floor(playTime / 60)}{t[currentLang].labels.minutes}{playTime % 60}{t[currentLang].labels.seconds}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{score}</div>
                <div className="text-green-800 dark:text-green-200">{t[currentLang].labels.correctAnswers}</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{currentProblems.length - score}</div>
                <div className="text-red-800 dark:text-red-200">{t[currentLang].labels.incorrectAnswers}</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentProblems.length}</div>
                <div className="text-blue-800 dark:text-blue-200">{t[currentLang].labels.totalQuestions}</div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={resetQuiz}
                className="flex-1 px-6 py-3 bg-cyan-500 dark:bg-cyan-600 text-white border border-cyan-400 dark:border-cyan-500 hover:bg-cyan-600 dark:hover:bg-cyan-700 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm font-semibold"
              >
                {t[currentLang].buttons.retryQuiz}
              </button>
              <button
                onClick={onBack}
                className="flex-1 px-6 py-3 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
              >
                {t[currentLang].buttons.backToMenu}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}