import { useState, useEffect, useRef, memo } from 'react';
import toast from 'react-hot-toast';
import { categoryService, problemService, quizSetService, historyService, quizSessionService, statisticsService, spacedRepetitionService } from '../lib/database';
import { AnalyticsManager, AnalyticsTracker } from '../lib/analyticsTracker';
import { SubjectiveFeedback } from './SubjectiveFeedback';
import { LevelUpModal } from './LevelUpModal';
import { startSession, endSession } from '../lib/studyTimeService';
import { updateCardAfterReview } from '../lib/sm2Algorithm';
import { autoPersonalizeSettings } from '../services/responseTimeService';
import { recordCompletion } from '../services/quizCompletionService';
import { debugLog } from '../utils/debug';
import type { ReviewResult } from '../types';
import { QuizProgress } from './quiz/QuizProgress';
import { QuizCard } from './quiz/QuizCard';
import { AnswerButton } from './quiz/AnswerButton';
import { NeumorphicButton } from './ui/NeumorphicButton';
import { GlassCard } from './ui/GlassCard';
import { RingChart } from './dashboard/RingChart';
import { BookOpen, Layers, Target, Clock, Trash2, HelpCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Problem, QuizSet, QuizSession, SubjectiveFeedbackData, QuizParams } from '../types';

interface QuizViewProps {
  onBack: () => void;
  initialParams?: QuizParams | null;
}

type QuizMode = 'selection' | 'playing' | 'result';
type QuizType = 'all' | 'category' | 'quizSet' | 'incorrect' | 'quizSetIncorrect' | 'quizSetWorstProblems';

const QuizView = ({ onBack, initialParams }: QuizViewProps) => {
  const [mode, setMode] = useState<QuizMode>('selection');
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');

  // Data
  const [categories, setCategories] = useState<string[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [savedSessions, setSavedSessions] = useState<QuizSession[]>([]);

  // Selection
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedQuizSet, setSelectedQuizSet] = useState<number | null>(null);

  // Playing State
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(boolean | number)[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date()); // 各問題の開始時刻

  // Modals & Feedback
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showSubjectiveFeedback, setShowSubjectiveFeedback] = useState(false);
  const [pendingSubjectiveFeedback, setPendingSubjectiveFeedback] = useState<{
    problemIndex: number;
    answer: boolean | number;
  } | null>(null);

  // Session Management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);
  // const [lastSaved, setLastSaved] = useState<Date | null>(null);



  // Tracking
  const [analyticsTracker, setAnalyticsTracker] = useState<AnalyticsTracker | null>(null);
  const [studyTimeSessionId, setStudyTimeSessionId] = useState<number | null>(null);

  // Track if initialParams have been processed
  const initialParamsProcessed = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  // Timer
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (mode === 'playing' && startTime) {
      const initialElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setElapsedTime(initialElapsed);
      intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode, startTime]);

  // Language
  useEffect(() => {
    const handleStorageChange = () => setLanguage(localStorage.getItem('language') || 'ja');
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(() => {
      const currentLang = localStorage.getItem('language') || 'ja';
      if (currentLang !== language) setLanguage(currentLang);
    }, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  // Result Modal
  useEffect(() => {
    if (mode === 'result') setShowLevelUpModal(true);
  }, [mode]);

  // Auto-save on unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (mode === 'playing' && currentSessionId) {
        e.preventDefault();
        e.returnValue = '';
        saveSession();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && mode === 'playing' && currentSessionId) {
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

  // Initial Params
  useEffect(() => {
    debugLog('🎯 QuizView initialParams effect:', { initialParams, isLoading, processed: initialParamsProcessed.current });
    debugLog('🔍 Detailed params check:', {
      hasInitialParams: !!initialParams,
      mode: initialParams?.mode,
      problemIds: initialParams?.problemIds,
      problemIdsLength: initialParams?.problemIds?.length,
      quizSetId: initialParams?.quizSetId,
    });

    // Only process initialParams once
    if (initialParams && !isLoading && !initialParamsProcessed.current) {
      initialParamsProcessed.current = true;
      debugLog('✅ Processing initialParams (first time only)');

      if (initialParams.mode === 'resume' && initialParams.sessionId) {
        debugLog('📝 Resuming session:', initialParams.sessionId);
        resumeSession(initialParams.sessionId);
      } else if (initialParams.mode === 'quizSetWorstProblems' && initialParams.quizSetId) {
        debugLog('📝 Starting quizSetWorstProblems mode');
        debugLog('📊 Problem count:', initialParams.problemCount);
        setSelectedQuizSet(initialParams.quizSetId);
        if (initialParams.category) {
          setSelectedCategory(initialParams.category);
          startQuizSetCategoryWorstProblems(initialParams.quizSetId, initialParams.category, initialParams.useLatestOnly || true);
        } else {
          startQuizWithParams('quizSetWorstProblems', undefined, initialParams.quizSetId, initialParams.useLatestOnly || true, initialParams.problemCount);
        }
      } else if (initialParams.mode === 'categoryQuiz' && initialParams.category) {
        debugLog('📝 Starting categoryQuiz mode');
        setSelectedCategory(initialParams.category);
        if (initialParams.quizSetId) setSelectedQuizSet(initialParams.quizSetId);
        startQuizWithParams('category', initialParams.category, initialParams.quizSetId);
      } else if (initialParams.mode === 'review' && initialParams.problemIds && initialParams.problemIds.length > 0) {
        debugLog('📝 Starting review mode with problemIds:', initialParams.problemIds.length);
        startReviewQuiz(initialParams.problemIds);
      } else if (initialParams.quizSetId && !initialParams.mode) {
        debugLog('📝 Starting quizSet mode with ID:', initialParams.quizSetId);
        setSelectedQuizSet(initialParams.quizSetId);
        // selectedQuizSetが更新されるまで待つために、直接IDを渡す
        startQuizWithParams('quizSet', undefined, initialParams.quizSetId);
      }
    }
  }, [initialParams, isLoading]);

  const t = {
    ja: {
      loading: 'データを読み込み中...',
      pageTitle: { selection: 'クイズ開始', playing: 'クイズプレイ', result: 'クイズ結果' },
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
        categoryQuiz: { title: '📚 カテゴリー別クイズ' },
        quizSetQuiz: { title: '📖 問題集クイズ' },
        otherQuiz: { title: '🎯 その他のクイズ' },
        statistics: { title: '📊 統計情報', totalProblems: '総問題数:', totalCategories: 'カテゴリー数:', totalQuizSets: '問題集数:' },
        savedSessions: { title: '💾 保存されたクイズセッション', count: '件', progress: '進捗:', correct: '正解:', timeElapsed: '分経過', paused: '⏸️ 一時停止中', accuracyRate: '正答率:' }
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
      }
    },
    en: {
      loading: 'Loading data...',
      pageTitle: { selection: 'Start Quiz', playing: 'Quiz Play', result: 'Quiz Result' },
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
        categoryQuiz: { title: '📚 Category Quiz' },
        quizSetQuiz: { title: '📖 Quiz Set Quiz' },
        otherQuiz: { title: '🎯 Other Quiz' },
        statistics: { title: '📊 Statistics', totalProblems: 'Total Problems:', totalCategories: 'Categories:', totalQuizSets: 'Quiz Sets:' },
        savedSessions: { title: '💾 Saved Quiz Sessions', count: 'sessions', progress: 'Progress:', correct: 'Correct:', timeElapsed: 'min elapsed', paused: '⏸️ Paused', accuracyRate: 'Accuracy:' }
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
      }
    }
  };

  const currentLang = language as keyof typeof t;

  const loadData = async () => {
    try {
      const [categoriesData, quizSetsData, problemsData] = await Promise.all([
        categoryService.getAll(),
        quizSetService.getAll(),
        problemService.getAll()
      ]);
      setCategories(categoriesData);
      setQuizSets(quizSetsData);
      setAllProblems(problemsData);
      try {
        // 既存の重複セッションをクリーンアップ
        const deletedCount = await quizSessionService.cleanupDuplicateSessions();
        if (deletedCount > 0) {
          debugLog(`🧹 Cleaned up ${deletedCount} duplicate sessions`);
        }

        const sessionsData = await quizSessionService.getActiveSessions();
        setSavedSessions(sessionsData);
      } catch (sessionError) {
        debugLog('Session data loading failed:', sessionError);
        setSavedSessions([]);
      }
    } catch (error) {
      debugLog('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIncorrectProblems = async (): Promise<Problem[]> => {
    const history = await historyService.getAll();
    const incorrectProblemIds = new Set<number>();
    const problemAnswers = new Map<number, boolean>();
    const sortedHistory = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    for (const entry of sortedHistory) {
      if (!problemAnswers.has(entry.problemId)) {
        problemAnswers.set(entry.problemId, entry.isCorrect);
      }
    }
    for (const [problemId, isCorrect] of problemAnswers) {
      if (!isCorrect) incorrectProblemIds.add(problemId);
    }
    return allProblems.filter(problem => problem.id && incorrectProblemIds.has(problem.id));
  };

  const getIncorrectProblemsForQuizSet = async (quizSetId: number, useLatestOnly: boolean = true): Promise<Problem[]> => {
    const quizSet = await quizSetService.getById(quizSetId);
    if (!quizSet) return [];
    const history = await historyService.getAll();
    const incorrectProblemIds = new Set<number>();
    if (useLatestOnly) {
      const problemAnswers = new Map<number, boolean>();
      const sortedHistory = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      for (const entry of sortedHistory) {
        if (quizSet.problemIds.includes(entry.problemId) && !problemAnswers.has(entry.problemId)) {
          problemAnswers.set(entry.problemId, entry.isCorrect);
        }
      }
      for (const [problemId, isCorrect] of problemAnswers) {
        if (!isCorrect) incorrectProblemIds.add(problemId);
      }
    } else {
      const incorrectEntries = history.filter(entry => !entry.isCorrect && quizSet.problemIds.includes(entry.problemId));
      incorrectEntries.forEach(entry => incorrectProblemIds.add(entry.problemId));
    }
    return allProblems.filter(problem => problem.id && incorrectProblemIds.has(problem.id) && quizSet.problemIds.includes(problem.id));
  };

  const startQuizWithParams = async (type: QuizType, category?: string, quizSetId?: number, useLatestOnly: boolean = true, problemCount?: number | 'all') => {
    let problems: Problem[] = [];
    try {
      switch (type) {
        case 'all': problems = [...allProblems]; break;
        case 'category':
          if (category) {
            if (quizSetId) {
              const quizSet = await quizSetService.getById(quizSetId);
              if (quizSet) {
                const quizSetProblems = await problemService.getByIds(quizSet.problemIds);
                problems = quizSetProblems.filter(p => p.category === category);
              }
            } else {
              problems = allProblems.filter(p => p.category === category);
            }
          }
          break;
        case 'quizSet':
          if (quizSetId) {
            const quizSet = await quizSetService.getById(quizSetId);
            if (quizSet) problems = await problemService.getByIds(quizSet.problemIds);
          }
          break;
        case 'quizSetIncorrect':
          if (quizSetId) problems = await getIncorrectProblemsForQuizSet(quizSetId, useLatestOnly);
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
                  const latestHistory = histories.reduce((latest, current) => new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest);
                  return { problem, correctRate: latestHistory.isCorrect ? 1 : 0, historyCount: histories.length };
                } else {
                  const correctCount = histories.filter(h => h.isCorrect).length;
                  const totalCount = histories.length;
                  return { problem, correctRate: totalCount > 0 ? correctCount / totalCount : 0.5, historyCount: totalCount };
                }
              });
              problemStats.sort((a, b) => a.correctRate - b.correctRate);

              const extractCount = problemCount === 'all' ? problemStats.length : (problemCount || 20);
              debugLog('🔥 苦手問題抽出結果（正答率が低い順）:');
              debugLog(`📊 モード: ${useLatestOnly ? '最新版（最後の1回のみ）' : '全履歴（平均正答率）'}`);
              debugLog(`📚 問題集: ${quizSet.name}`);
              debugLog(`📝 全問題数: ${quizSetProblems.length}`);
              debugLog(`🎯 抽出問題数: ${extractCount}問`);
              console.table(problemStats.slice(0, extractCount).map((stat, index) => ({
                順位: index + 1,
                問題: stat.problem.question.substring(0, 30) + '...',
                正答率: `${(stat.correctRate * 100).toFixed(0)}%`,
                解答回数: stat.historyCount
              })));

              problems = problemStats.slice(0, extractCount).map(stat => stat.problem);
            }
          }
          break;
        case 'incorrect': problems = await getIncorrectProblems(); break;
      }

      if (problems.length === 0) {
        alert(t[currentLang].messages.noProblemsFound);
        return;
      }

      const shuffledProblems = [...problems].sort(() => Math.random() - 0.5);
      const sessionId = Date.now().toString();
      try {
        const session = {
          id: sessionId,
          quizSetId: quizSetId, // 問題集IDを保存
          category: category, // カテゴリーを保存
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
        debugLog('✅ Session saved with quizSetId:', quizSetId, 'category:', category);
      } catch (sessionError) {
        debugLog('Session save failed:', sessionError);
        setCurrentSessionId(null);
      }

      setCurrentProblems(shuffledProblems);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers([]);
      setShowFeedback(false);
      setStartTime(new Date());
      setMode('playing');

      const tracker = AnalyticsManager.startSession(sessionId);
      setAnalyticsTracker(tracker);
      if (shuffledProblems.length > 0 && shuffledProblems[0].id) {
        tracker.startProblem(shuffledProblems[0].id);
      }

      try {
        const sessionType = type === 'incorrect' || type === 'quizSetIncorrect' ? 'review' : 'quiz';
        const studySessionId = await startSession(sessionType, quizSetId, category);
        setStudyTimeSessionId(studySessionId);
      } catch (studyTimeError) {
        debugLog('Study time tracking failed:', studyTimeError);
      }

      // Clear existing interval before creating a new one
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }

      const interval = setInterval(async () => {
        if (currentSessionId) {
          await saveSession();
        }
      }, 30000);
      setAutoSaveInterval(interval);

    } catch (error) {
      debugLog('Quiz start error:', error);
      alert(t[currentLang].messages.quizStartError);
    }
  };

  const startQuiz = async (type: QuizType, useLatestOnly: boolean = true) => {
    return startQuizWithParams(type, selectedCategory, selectedQuizSet ?? undefined, useLatestOnly);
  };

  const startReviewQuiz = async (problemIds: number[]) => {
    try {
      const reviewProblems = await problemService.getByIds(problemIds);
      if (reviewProblems.length === 0) {
        alert('復習問題が見つかりません');
        return;
      }
      if (reviewProblems.length < problemIds.length * 0.7) {
        const missingCount = problemIds.length - reviewProblems.length;
        alert(`復習問題の一部（${missingCount} 問）が見つかりませんでした。\n利用可能な${reviewProblems.length} 問でクイズを開始します。`);
      }
      const shuffledProblems = [...reviewProblems].sort(() => Math.random() - 0.5);
      setCurrentProblems(shuffledProblems);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers([]);
      setShowFeedback(false);
      setMode('playing');
      const now = new Date();
      setStartTime(now);
      setQuestionStartTime(now); // 最初の問題の開始時刻を記録
      const sessionId = `review-${Date.now()}`;
      setCurrentSessionId(sessionId);
      await quizSessionService.save({
        id: sessionId,
        problems: shuffledProblems,
        currentIndex: 0,
        score: 0,
        answers: [],
        startTime: new Date(),
        isCompleted: false,
        isPaused: false
      });
    } catch (error) {
      debugLog('Review quiz start error:', error);
      alert('復習問題の開始に失敗しました');
    }
  };

  const startQuizSetCategoryWorstProblems = async (quizSetId: number, category: string, useLatestOnly: boolean = true) => {
    try {
      const incorrectProblems = await statisticsService.getQuizSetCategoryWorstProblems(quizSetId, category, 1000, useLatestOnly);
      if (incorrectProblems.length === 0) {
        alert(`「${category}」カテゴリーに間違い問題がありません`);
        return;
      }
      const shuffledProblems = [...incorrectProblems.map(item => item.problem)].sort(() => Math.random() - 0.5);
      const sessionId = quizSessionService.generateSessionId();
      await quizSessionService.save({
        id: sessionId,
        quizSetId,
        category,
        problems: shuffledProblems,
        currentIndex: 0,
        score: 0,
        answers: [],
        startTime: new Date(),
        isCompleted: false,
        isPaused: false
      });
      setCurrentSessionId(sessionId);
      setCurrentProblems(shuffledProblems);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers([]);
      setShowFeedback(false);
      setStartTime(new Date());
      setMode('playing');
      const interval = setInterval(async () => {
        if (currentSessionId) {
          await saveSession();
        }
      }, 10000);
      setAutoSaveInterval(interval);
    } catch (error) {
      debugLog('Category worst problems quiz start error:', error);
      alert('クイズの開始に失敗しました');
    }
  };

  const resumeSession = async (sessionId: string) => {
    try {
      const session = await quizSessionService.getById(sessionId);
      if (!session) {
        alert(t[currentLang].messages.sessionNotFound);
        return;
      }
      const progressPercent = ((session.currentIndex / session.problems.length) * 100).toFixed(0);
      const confirmMessage = `${t[currentLang].messages.confirmResumeSession} \n\n` +
        `${t[currentLang].labels.totalQuestions}: ${session.problems.length}${currentLang === 'ja' ? '問' : ''} \n` +
        `${t[currentLang].sections.savedSessions.progress} ${session.currentIndex + 1}${currentLang === 'ja' ? '問目' : ''} (${progressPercent}%) \n` +
        `${t[currentLang].sections.savedSessions.correct} ${session.score}${currentLang === 'ja' ? '問' : ''} \n` +
        `${currentLang === 'ja' ? '開始日時' : 'Start Time'}: ${session.startTime.toLocaleString()} `;

      if (!confirm(confirmMessage)) return;

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

      // 保存された経過時間を復元
      if (session.elapsedTime !== undefined) {
        // 保存された経過時間がある場合、それを考慮して新しい開始時刻を計算
        const adjustedStartTime = new Date(Date.now() - session.elapsedTime * 1000);
        setStartTime(adjustedStartTime);
        setElapsedTime(session.elapsedTime);
        debugLog(`▶️ Session resumed with elapsed time: ${session.elapsedTime}s`);
      } else {
        // 保存された経過時間がない場合（古いセッション）
        setStartTime(session.startTime);
      }

      setMode('playing');

      // Clear existing interval before creating a new one
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }

      const interval = setInterval(async () => {
        if (currentSessionId) {
          await saveSession();
        }
      }, 30000);
      setAutoSaveInterval(interval);

      const tracker = AnalyticsManager.resumeSession(sessionId);
      setAnalyticsTracker(tracker);
      const problemId = session.problems[session.currentIndex]?.id;
      if (problemId) {
        tracker.startProblem(problemId);
      }
      toast.success(t[currentLang].messages.sessionResumed);
    } catch (error) {
      debugLog('Session resume error:', error);
      alert(t[currentLang].messages.sessionResumeError);
    }
  };

  const handleAnswer = async (answer: boolean | number) => {
    if (showFeedback) return;
    const currentProblem = currentProblems[currentIndex];
    const isCorrect = typeof answer === 'boolean' ? answer : answer === currentProblem.correctAnswer;
    const newUserAnswers = [...userAnswers, answer];
    setUserAnswers(newUserAnswers);
    if (isCorrect) setScore(prev => prev + 1);

    // 解答時間を計算
    const responseTime = Date.now() - questionStartTime.getTime();

    if (analyticsTracker && currentProblem.id) {
      analyticsTracker.recordAnswer(answer, isCorrect, undefined);
    }
    try {
      await historyService.add({
        problemId: currentProblem.id!,
        category: currentProblem.category,
        isCorrect,
        responseTime // 実際の解答時間を保存
      });
      const allHistory = await historyService.getAll();
      debugLog('✅ Answer saved to history:', {
        problemId: currentProblem.id,
        isCorrect,
        responseTime: `${(responseTime / 1000).toFixed(1)}s`,
        totalAnswers: allHistory.length
      });
    } catch (error) {
      debugLog('❌ History save error:', error);
    }

    // SM-2復習モードの場合、カードを更新
    if (currentSessionId && currentSessionId.startsWith('review-') && currentProblem.id) {
      try {
        debugLog('🔄 Updating SM-2 card:', currentProblem.id, 'isCorrect:', isCorrect);

        // カードを取得
        const card = await spacedRepetitionService.getCardByProblemId(currentProblem.id);
        if (card) {
          // 解答時間を計算（実際に計測）
          const responseTime = Date.now() - questionStartTime.getTime();
          const reviewResult: ReviewResult = {
            wasCorrect: isCorrect,
            responseTime: responseTime,
            quality: 0 // Will be calculated by answerToQuality in updateCardAfterReview
          };

          // SM-2アルゴリズムでカードを更新
          const updatedCard = updateCardAfterReview(card, reviewResult);
          await spacedRepetitionService.updateCard(updatedCard);

          debugLog('✅ SM-2 card updated:', {
            problemId: currentProblem.id,
            nextReview: updatedCard.nextReviewDate,
            interval: updatedCard.interval,
            repetitions: updatedCard.repetitions
          });
        } else {
          debugLog('⚠️ SM-2 card not found for problemId:', currentProblem.id);
        }
      } catch (error) {
        debugLog('❌ SM-2 card update error:', error);
      }
    }

    setShowFeedback(true);
    if (Math.random() < 0.2) {
      setPendingSubjectiveFeedback({ problemIndex: currentIndex, answer });
    }
    if (currentSessionId) {
      const session = await quizSessionService.getById(currentSessionId);
      if (session) {
        await quizSessionService.save({
          ...session,
          score: isCorrect ? score + 1 : score,
          answers: newUserAnswers,
          currentIndex: currentIndex
        });
      }
    }
  };

  const handleNext = async () => {
    if (pendingSubjectiveFeedback) {
      setShowSubjectiveFeedback(true);
      return;
    }
    proceedToNextQuestion();
  };

  const proceedToNextQuestion = async () => {
    setShowFeedback(false);
    if (currentIndex < currentProblems.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      // 新しい問題の開始時刻を記録
      setQuestionStartTime(new Date());
      if (analyticsTracker && currentProblems[nextIndex]?.id) {
        analyticsTracker.startProblem(currentProblems[nextIndex].id);
      }
      if (currentSessionId) {
        const session = await quizSessionService.getById(currentSessionId);
        if (session) {
          await quizSessionService.save({ ...session, currentIndex: nextIndex });
        }
      }
    } else {
      finishQuiz();
    }
  };

  const handleSubjectiveFeedbackSubmit = async (data: SubjectiveFeedbackData) => {
    if (pendingSubjectiveFeedback && analyticsTracker) {
      const problemId = currentProblems[pendingSubjectiveFeedback.problemIndex].id;
      if (problemId) {
        debugLog(`Subjective feedback for problem ${problemId}:`, data);
        // Here you would typically save the subjective feedback
        // e.g., await historyService.addSubjectiveFeedback(problemId, data);
      }
    }
    setShowSubjectiveFeedback(false);
    setPendingSubjectiveFeedback(null);
    proceedToNextQuestion();
  };



  const finishQuiz = async () => {
    setMode('result');
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    if (currentSessionId) {
      try {
        // セッション情報を取得してから完了を記録
        const session = await quizSessionService.getById(currentSessionId);

        // 問題集完了を記録（推奨順序の調整用）
        if (session?.quizSetId) {
          recordCompletion(session.quizSetId, score, currentProblems.length);
          debugLog('✅ Quiz completion recorded for set:', session.quizSetId);
        }

        // 完了したセッションは削除（保存しない）
        debugLog('🗑️ Deleting completed session:', currentSessionId);
        await quizSessionService.delete(currentSessionId);

        if (analyticsTracker) AnalyticsManager.endSession();
        if (studyTimeSessionId) await endSession(studyTimeSessionId, currentProblems.length, score);

        // 自動パーソナライゼーション: 解答時間を自動調整
        autoPersonalizeSettings(10).then(wasUpdated => {
          if (wasUpdated) {
            debugLog('✅ Settings auto-personalized based on your response times');
          }
        }).catch(error => {
          debugLog('❌ Auto-personalization failed:', error);
        });
      } catch (error) {
        debugLog('Quiz finish error:', error);
      }
    }
  };

  const saveSession = async () => {
    if (!currentSessionId) return;
    try {
      const session = await quizSessionService.getById(currentSessionId);
      if (session) {
        // 同じ問題集/カテゴリーの古いセッションを削除してから保存
        await quizSessionService.saveWithCleanup({
          ...session,
          isPaused: true,
          pausedAt: new Date(),
          elapsedTime: elapsedTime // 現在の経過時間を保存
        });
        debugLog(`⏸️ Session paused with elapsed time: ${elapsedTime}s`);
        toast.success(t[currentLang].messages.sessionSaved);
      }
    } catch (error) {
      debugLog('Session save error:', error);
      toast.error(t[currentLang].messages.sessionSaveError);
    }
  };

  const handleQuitQuiz = async () => {
    if (confirm(t[currentLang].messages.confirmEndQuiz)) {
      await saveSession();
      if (autoSaveInterval) clearInterval(autoSaveInterval);
      onBack();
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t[currentLang].messages.confirmDeleteSession)) {
      try {
        await quizSessionService.delete(sessionId);
        setSavedSessions(prev => prev.filter(s => s.id !== sessionId));
      } catch (error) {
        debugLog('Session delete error:', error);
      }
    }
  };

  const handleDeleteAllSessions = async () => {
    if (confirm(t[currentLang].messages.confirmDeleteAllSessions)) {
      try {
        await quizSessionService.clearAll();
        setSavedSessions([]);
      } catch (error) {
        debugLog('All sessions delete error:', error);
      }
    }
  };

  // Render Helpers
  const renderSelectionMode = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
          {t[currentLang].pageTitle.selection}
        </h1>
        <NeumorphicButton variant="secondary" onClick={onBack} className="!px-4">
          {t[currentLang].buttons.backToMenu}
        </NeumorphicButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Selection */}
        <GlassCard className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/20 text-primary">
              <BookOpen size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">
              {t[currentLang].sections.categoryQuiz.title}
            </h2>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-text-secondary">
              {t[currentLang].labels.selectCategory}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-4 rounded-xl bg-surfaceHighlight border border-white/10 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="">{t[currentLang].labels.selectCategoryOption}</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <NeumorphicButton
              variant="primary"
              fullWidth
              onClick={() => startQuiz('category')}
              disabled={!selectedCategory}
              className="mt-4"
            >
              {t[currentLang].buttons.startQuiz}
            </NeumorphicButton>
          </div>
        </GlassCard>

        {/* Quiz Set Selection */}
        <GlassCard className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-accent/20 text-accent">
              <Layers size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">
              {t[currentLang].sections.quizSetQuiz.title}
            </h2>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-text-secondary">
              {t[currentLang].labels.selectQuizSet}
            </label>
            <select
              value={selectedQuizSet ?? ''}
              onChange={(e) => setSelectedQuizSet(Number(e.target.value))}
              className="w-full p-4 rounded-xl bg-surfaceHighlight border border-white/10 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="">{t[currentLang].labels.selectQuizSetOption}</option>
              {quizSets.map(set => (
                <option key={set.id} value={set.id}>{set.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-1 gap-3">
              <NeumorphicButton
                variant="primary"
                fullWidth
                onClick={() => startQuiz('quizSet')}
                disabled={!selectedQuizSet}
              >
                {t[currentLang].buttons.startQuizSet}
              </NeumorphicButton>
              <NeumorphicButton
                variant="secondary"
                fullWidth
                onClick={() => startQuiz('quizSetIncorrect')}
                disabled={!selectedQuizSet}
                className="text-sm"
              >
                {t[currentLang].buttons.startIncorrectLatest}
              </NeumorphicButton>
            </div>
          </div>
        </GlassCard>

        {/* Other Options */}
        <GlassCard className="p-6 space-y-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
              <Target size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">
              {t[currentLang].sections.otherQuiz.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NeumorphicButton
              variant="secondary"
              onClick={() => startQuiz('incorrect')}
              className="h-full"
            >
              <div className="flex flex-col items-center gap-2 py-2">
                <span className="text-2xl">🔄</span>
                <span>{t[currentLang].buttons.startIncorrectOnly}</span>
              </div>
            </NeumorphicButton>
            <NeumorphicButton
              variant="secondary"
              onClick={() => startQuiz('all')}
              className="h-full"
            >
              <div className="flex flex-col items-center gap-2 py-2">
                <span className="text-2xl">📚</span>
                <span>{t[currentLang].buttons.startAllProblems}</span>
              </div>
            </NeumorphicButton>
          </div>
        </GlassCard>

        {/* Saved Sessions */}
        {savedSessions.length > 0 && (
          <GlassCard className="p-6 space-y-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                  <Clock size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">
                  {t[currentLang].sections.savedSessions.title}
                  <span className="ml-2 text-sm font-normal text-text-secondary">
                    ({savedSessions.length} {t[currentLang].sections.savedSessions.count})
                  </span>
                </h2>
              </div>
              <button
                onClick={handleDeleteAllSessions}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                {t[currentLang].buttons.deleteAllSessions}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedSessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => resumeSession(session.id)}
                  className="group relative p-4 rounded-xl bg-surfaceHighlight border border-white/5 hover:border-primary/30 hover:bg-surfaceHighlight/80 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white group-hover:text-primary transition-colors">
                      {session.quizSetId ? (quizSets.find(q => q.id === session.quizSetId)?.name || 'Quiz Set') :
                        session.category ? session.category : 'Mixed Quiz'}
                    </h3>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex justify-between">
                      <span>{t[currentLang].sections.savedSessions.progress}</span>
                      <span className="text-white">{session.currentIndex + 1} / {session.problems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t[currentLang].sections.savedSessions.correct}</span>
                      <span className="text-accent">{session.score}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-white/5">
                      <span>{new Date(session.startTime).toLocaleDateString()}</span>
                      <span>{t[currentLang].sections.savedSessions.paused}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );

  const renderPlayingMode = () => {
    const currentProblem = currentProblems[currentIndex];
    if (!currentProblem) return <div>Loading...</div>;

    return (
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <NeumorphicButton variant="secondary" onClick={handleQuitQuiz} className="!px-4 !py-2 text-sm">
            {t[currentLang].buttons.endQuiz}
          </NeumorphicButton>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surfaceHighlight border border-white/10">
              <Clock size={16} className="text-primary" />
              <span className="font-mono font-bold text-white">
                {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surfaceHighlight border border-white/10">
              <span className="text-sm text-text-secondary">{t[currentLang].labels.correctCount}</span>
              <span className="font-bold text-accent">{score}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <QuizProgress
          current={currentIndex}
          total={currentProblems.length}
          showFeedback={showFeedback}
        />

        {/* Quiz Card */}
        <div className="mb-8">
          <QuizCard
            category={currentProblem.category}
            question={currentProblem.question}
            showFeedback={showFeedback}
            isCorrect={userAnswers[currentIndex] === currentProblem.correctAnswer || (typeof userAnswers[currentIndex] === 'boolean' && userAnswers[currentIndex] === true)}
          >
            <div className="grid grid-cols-1 gap-4">
              {currentProblem.options ? (
                currentProblem.options.map((option, idx) => (
                  <AnswerButton
                    key={idx}
                    index={idx}
                    label={option}
                    onClick={() => handleAnswer(idx)}
                    disabled={showFeedback}
                    showResult={showFeedback}
                    isCorrect={idx === currentProblem.correctAnswer}
                    isSelected={userAnswers[currentIndex] === idx}
                  />
                ))
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <AnswerButton
                    label="True"
                    onClick={() => handleAnswer(true)}
                    disabled={showFeedback}
                    showResult={showFeedback}
                    isCorrect={currentProblem.answer === true}
                    isSelected={userAnswers[currentIndex] === true}
                  />
                  <AnswerButton
                    label="False"
                    onClick={() => handleAnswer(false)}
                    disabled={showFeedback}
                    showResult={showFeedback}
                    isCorrect={typeof currentProblem.correctAnswer === 'boolean' ? currentProblem.correctAnswer === false : false}
                    isSelected={userAnswers[currentIndex] === false}
                  />
                </div>
              )}
            </div>
          </QuizCard>
        </div>

        {/* Feedback / Next Button */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 left-0 right-0 p-6 bg-surface/95 backdrop-blur-xl border-t border-white/10 z-50 md:static md:bg-transparent md:border-0 md:p-0"
            >
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 p-6 rounded-2xl bg-surfaceHighlight border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary mt-1">
                      <HelpCircle size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-2">{t[currentLang].labels.explanation}</h3>
                      <p className="text-text-secondary leading-relaxed">
                        {currentProblem.explanation || "No explanation available."}
                      </p>
                    </div>
                  </div>
                </div>

                <NeumorphicButton
                  variant="primary"
                  fullWidth
                  onClick={handleNext}
                  className="shadow-xl shadow-primary/20"
                >
                  {t[currentLang].buttons.nextQuestion}
                </NeumorphicButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderResultMode = () => (
    <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <RingChart
          current={score}
          target={currentProblems.length}
          label="Score"
          color={score / currentProblems.length >= 0.8 ? '#10B981' : '#6366F1'}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-white">{Math.round((score / currentProblems.length) * 100)}%</span>
          <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Accuracy</span>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white">{t[currentLang].messages.sessionCompleted}</h2>
        <p className="text-text-secondary">
          {t[currentLang].labels.correctCount} <span className="text-accent font-bold">{score}</span> / {currentProblems.length}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4 flex flex-col items-center justify-center gap-2">
          <Clock className="text-primary" size={24} />
          <span className="text-2xl font-bold text-white">
            {Math.floor(elapsedTime / 60)}<span className="text-sm text-text-secondary font-normal">m</span> {elapsedTime % 60}<span className="text-sm text-text-secondary font-normal">s</span>
          </span>
          <span className="text-xs text-text-secondary uppercase tracking-wider">Time</span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col items-center justify-center gap-2">
          <Zap className="text-yellow-400" size={24} />
          <span className="text-2xl font-bold text-white">+{score * 10}</span>
          <span className="text-xs text-text-secondary uppercase tracking-wider">XP Earned</span>
        </GlassCard>
      </div>

      <div className="flex flex-col gap-4 pt-8">
        <NeumorphicButton variant="primary" onClick={onBack} fullWidth>
          {t[currentLang].buttons.backToMenu}
        </NeumorphicButton>
        <NeumorphicButton variant="secondary" onClick={() => setMode('selection')} fullWidth>
          {t[currentLang].buttons.retryQuiz}
        </NeumorphicButton>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary/20 rounded-full blur-md animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {mode === 'selection' && renderSelectionMode()}
      {mode === 'playing' && renderPlayingMode()}
      {mode === 'result' && renderResultMode()}

      <LevelUpModal
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        score={score}
        totalQuestions={currentProblems.length}
        language={currentLang}
      />

      <SubjectiveFeedback
        isEnabled={showSubjectiveFeedback}
        onSkip={() => {
          setShowSubjectiveFeedback(false);
          setPendingSubjectiveFeedback(null);
          proceedToNextQuestion();
        }}
        onSubmit={handleSubjectiveFeedbackSubmit}
      />
    </div>
  );
};

// React.memoでラップしてパフォーマンス最適化
export default memo(QuizView);