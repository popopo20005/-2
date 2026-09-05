import { useState, useEffect, useRef, memo } from 'react';
import toast from 'react-hot-toast';
import { categoryService, problemService, quizSetService, historyService, quizSessionService, statisticsService, spacedRepetitionService } from '../lib/database';
import { updateAllGoalProgress } from '../services/goalService';
import { AnalyticsManager, AnalyticsTracker } from '../lib/analyticsTracker';
import { SubjectiveFeedback } from './SubjectiveFeedback';
import { LevelUpModal } from './LevelUpModal';
import { startSession, endSession } from '../lib/studyTimeService';
import { updateCardAfterReview, createNewCard } from '../lib/sm2Algorithm';
import { autoPersonalizeSettings } from '../services/responseTimeService';
import { recordCompletion } from '../services/quizCompletionService';
import { debugLog } from '../utils/debug';
import { PerformanceMonitor } from '../services/performanceOptimizer';
import type { ReviewResult } from '../types';

// Performance monitoring instance
const performanceMonitor = new PerformanceMonitor();
// QuizProgress moved inline into header
import { QuizCard } from './quiz/QuizCard';
import { AnswerButton } from './quiz/AnswerButton';
import { NeumorphicButton } from './ui/NeumorphicButton';
import { GlassCard } from './ui/GlassCard';
// RingChart removed - result screen now uses inline circle display
import { FavoriteButton } from './FavoriteButton';
import { favoritesService } from '../services/favoritesService';
import { MarkdownPreview } from './MarkdownPreview';
import { FlashcardView } from './FlashcardView';
import { NoteEditor } from './NoteEditor';
import { MistakeReasonTagger } from './MistakeReasonTagger';
import { saveMistakeReason } from '../services/mistakeReasonService';
import { recordQuizCompletion } from '../services/gamificationService';
import { dailyGoalService, studyPlanService, mockExamService, db } from '../lib/database';
import { recalculatePlanProgress } from '../services/studyPlanGenerator';
import { performDailyAdjustment, performWeeklyRebalance, shouldAutoRebalance } from '../services/pdcaAdjustmentService';
import { BadgeUnlockToast } from './gamification/BadgeUnlockToast';
import { XPFloatAnimation } from './gamification/XPFloatAnimation';
import { DifficultyGrading, type DifficultyGrade } from './quiz/DifficultyGrading';
import type { BadgeDefinition } from '../types/gamification';
import { BADGE_DEFINITIONS } from '../types/gamification';
import type { MistakeReasonTag } from '../types/smartNote';
import { BookOpen, Layers, Target, Clock, Trash2, HelpCircle, CreditCard, Grid3x3, Edit, Volume2, VolumeX, Play, Pause, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Problem, QuizSet, QuizSession, SubjectiveFeedbackData, QuizParams } from '../types';
import { speechService, type SpeechState } from '../services/speechService';

interface QuizViewProps {
  onBack: () => void;
  initialParams?: QuizParams | null;
}

type QuizMode = 'selection' | 'playing' | 'result';
type QuizType = 'all' | 'category' | 'quizSet' | 'incorrect' | 'quizSetIncorrect' | 'quizSetWorstProblems';
type DisplayMode = 'normal' | 'flashcard';

const QuizView = ({ onBack, initialParams }: QuizViewProps) => {
  const [mode, setMode] = useState<QuizMode>('selection');
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('normal');

  // Speech (Quiz Mode Only)
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);

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
  const [userAnswers, setUserAnswers] = useState<(boolean | number | number[])[]>([]);
  const [multiSelectSelections, setMultiSelectSelections] = useState<number[]>([]); // 複数選択問題の現在の選択状態
  const [strikethroughStates, setStrikethroughStates] = useState<boolean[][]>([]); // Track strikethrough for each question's options
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date()); // 各問題の開始時刻
  // SM-2スナップショット: セッション開始時の各問題のSM-2状態（新規/復習の判定用）
  const [sm2Snapshot, setSm2Snapshot] = useState<Map<number, { isNew: boolean; repetitions: number }>>(new Map());

  // Modals & Feedback
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showSubjectiveFeedback, setShowSubjectiveFeedback] = useState(false);
  const [pendingSubjectiveFeedback, setPendingSubjectiveFeedback] = useState<{
    problemIndex: number;
    answer: boolean | number | number[];
  } | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showMistakeReason, setShowMistakeReason] = useState(true); // 不正解時に理由タグUIを表示
  const [unlockedBadge, setUnlockedBadge] = useState<BadgeDefinition | null>(null); // バッジ解除通知
  const [xpFloatTrigger, setXpFloatTrigger] = useState(0); // +XP animation trigger

  // Session Management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);
  // const [lastSaved, setLastSaved] = useState<Date | null>(null);



  // Tracking
  const [analyticsTracker, setAnalyticsTracker] = useState<AnalyticsTracker | null>(null);
  const [studyTimeSessionId, setStudyTimeSessionId] = useState<number | null>(null);

  /**
   * ○×問題の正解を boolean で返すヘルパー。
   * answer (boolean | string) → correctAnswer (number 0=○,1=×) の両方に対応。
   * 判定不能時は undefined。
   */
  const getTrueFalseCorrectAnswer = (problem: Problem): boolean | undefined => {
    const raw = problem.answer as unknown;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      const lower = raw.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
    }
    // answer が未設定の場合、correctAnswer (0=True, 1=False) から推定
    if (problem.correctAnswer === 0) return true;
    if (problem.correctAnswer === 1) return false;
    return undefined;
  };

  // Track which initialParams object was last processed (by reference)
  const lastProcessedParams = useRef<QuizParams | null | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, []);

  // Firestore同期完了後にデータを再読み込み（選択画面で新しい問題を反映）
  useEffect(() => {
    const handleSyncCompleted = () => {
      if (mode === 'selection') {
        loadData();
      }
    };
    window.addEventListener('syncCompleted', handleSyncCompleted);
    return () => window.removeEventListener('syncCompleted', handleSyncCompleted);
  }, [mode]);

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
    // Check sessionStorage for pending params
    const pendingParamsStr = sessionStorage.getItem('pendingQuizParams');
    let effectiveParams = initialParams;

    if (pendingParamsStr && lastProcessedParams.current !== initialParams) {
      try {
        const pendingParams = JSON.parse(pendingParamsStr);
        debugLog('🔄 Found pending params in sessionStorage:', pendingParams);
        effectiveParams = pendingParams;
        // Don't clear sessionStorage yet - wait until we actually process the params
      } catch (e) {
        debugLog('❌ Failed to parse pending params from sessionStorage:', e);
      }
    }

    debugLog('🎯 QuizView initialParams effect:', { initialParams, effectiveParams, isLoading, alreadyProcessed: lastProcessedParams.current === initialParams });
    debugLog('🔍 Detailed params check:', {
      hasInitialParams: !!initialParams,
      hasEffectiveParams: !!effectiveParams,
      mode: effectiveParams?.mode,
      problemIds: effectiveParams?.problemIds,
      problemIdsLength: effectiveParams?.problemIds?.length,
      quizSetId: effectiveParams?.quizSetId,
    });

    // Only process params once per unique initialParams object
    const alreadyProcessed = lastProcessedParams.current === initialParams;
    if (effectiveParams && !isLoading && !alreadyProcessed) {
      lastProcessedParams.current = initialParams;
      debugLog('✅ Processing params (new params detected)');

      // Clear sessionStorage now that we're processing the params
      if (pendingParamsStr) {
        sessionStorage.removeItem('pendingQuizParams');
        debugLog('🧹 Cleared pending params from sessionStorage');
      }

      if (effectiveParams.mode === 'resume' && effectiveParams.sessionId) {
        debugLog('📝 Resuming session:', effectiveParams.sessionId);
        resumeSession(effectiveParams.sessionId);
      } else if (effectiveParams.mode === 'quizSetWorstProblems' && effectiveParams.quizSetId) {
        debugLog('📝 Starting quizSetWorstProblems mode');
        debugLog('📊 Problem count:', effectiveParams.problemCount);
        setSelectedQuizSet(effectiveParams.quizSetId);
        if (effectiveParams.category) {
          setSelectedCategory(effectiveParams.category);
          startQuizSetCategoryWorstProblems(effectiveParams.quizSetId, effectiveParams.category, effectiveParams.useLatestOnly || true);
        } else {
          startQuizWithParams('quizSetWorstProblems', undefined, effectiveParams.quizSetId, effectiveParams.useLatestOnly || true, effectiveParams.problemCount);
        }
      } else if (effectiveParams.mode === 'categoryQuiz' && effectiveParams.category) {
        debugLog('📝 Starting categoryQuiz mode');
        setSelectedCategory(effectiveParams.category);
        if (effectiveParams.quizSetId) setSelectedQuizSet(effectiveParams.quizSetId);
        startQuizWithParams('category', effectiveParams.category, effectiveParams.quizSetId);
      } else if (effectiveParams.mode === 'review' && effectiveParams.problemIds && effectiveParams.problemIds.length > 0) {
        debugLog('📝 Starting review mode with problemIds:', effectiveParams.problemIds.length);
        startReviewQuiz(effectiveParams.problemIds);
      } else if (effectiveParams.mode === 'review' && (!effectiveParams.problemIds || effectiveParams.problemIds.length === 0)) {
        // SM-2 review without explicit problemIds — fetch due cards
        debugLog('📝 Review mode without problemIds, fetching due cards...');
        spacedRepetitionService.getDueCards(200).then(dueCards => {
          const ids = dueCards.map(c => c.problemId);
          if (ids.length > 0) {
            debugLog('📝 Found due cards:', ids.length);
            startReviewQuiz(ids);
          } else {
            debugLog('⚠️ No due cards found for review');
          }
        });
      } else if (effectiveParams.quizSetId && !effectiveParams.mode) {
        debugLog('📝 Starting quizSet mode with ID:', effectiveParams.quizSetId);
        setSelectedQuizSet(effectiveParams.quizSetId);
        // selectedQuizSetが更新されるまで待つために、直接IDを渡す
        startQuizWithParams('quizSet', undefined, effectiveParams.quizSetId);
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
      const [categoriesData, quizSetsData, problemsData] = await performanceMonitor.measure('QuizView: Load Initial Data', () =>
        Promise.all([
          categoryService.getAll(),
          quizSetService.getAll(),
          problemService.getAll()
        ])
      );
      setCategories(categoriesData);
      setQuizSets(quizSetsData);
      setAllProblems(problemsData);
      try {
        // 既存の重複セッションをクリーンアップ
        const deletedCount = await performanceMonitor.measure('QuizView: Cleanup Duplicate Sessions', () =>
          quizSessionService.cleanupDuplicateSessions()
        );
        if (deletedCount > 0) {
          debugLog(`🧹 Cleaned up ${deletedCount} duplicate sessions`);
        }

        const sessionsData = await performanceMonitor.measure('QuizView: Load Active Sessions', () =>
          quizSessionService.getActiveSessions()
        );
        setSavedSessions(sessionsData);

        // Log performance summary
        const summaryStats = performanceMonitor.getAllStats();
        debugLog('📊 QuizView Performance Summary:', summaryStats);
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

  // ========================================
  // 読み上げ機能関連
  // ========================================

  // 読み上げサービスの初期化
  useEffect(() => {
    speechService.loadSettings();
    speechService.setMode('quiz'); // Always quiz mode
    speechService.setCallbacks({
      onStateChange: (state) => {
        setSpeechState(state);
      },
      onWaitingAnswer: () => {
        setWaitingForAnswer(true);
      },
      onQuestionEnd: () => {
        // Quiz mode doesn't auto-advance
      }
    });

    return () => {
      speechService.stop();
    };
  }, []);

  // 読み上げ開始（問題が変わったとき）
  useEffect(() => {
    if (!speechEnabled || mode !== 'playing' || !currentProblems[currentIndex]) return;

    const currentProblem = currentProblems[currentIndex];

    // 少し遅延を入れてUIが表示されてから読み上げ
    const timer = setTimeout(() => {
      if (currentProblem.type === 'multiple-choice') {
        // クイズモード：問題と選択肢のみ読み上げ
        speechService.speakProblemQuiz(
          currentProblem.question,
          currentProblem.options || [],
          currentProblem.category
        );
      } else {
        // ○×問題：問題のみ読み上げ
        speechService.speakTrueFalseQuiz(
          currentProblem.question,
          currentProblem.category
        );
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [speechEnabled, mode, currentIndex, currentProblems]);

  // 解答後のフィードバック読み上げ（クイズモード）
  useEffect(() => {
    if (!speechEnabled || !waitingForAnswer || !showFeedback) return;

    const currentProblem = currentProblems[currentIndex];
    const userAnswer = userAnswers[currentIndex];

    if (currentProblem.type === 'multi-select') {
      const correctSet = new Set(currentProblem.correctAnswers || []);
      const answerSet = new Set(Array.isArray(userAnswer) ? userAnswer as number[] : []);
      const isCorrect = correctSet.size === answerSet.size && [...correctSet].every(v => answerSet.has(v));
      speechService.speakAnswerFeedback(
        isCorrect,
        (currentProblem.correctAnswers || [])[0] || 0,
        currentProblem.options || [],
        currentProblem.explanation
      );
    } else if (currentProblem.type === 'multiple-choice') {
      const isCorrect = userAnswer === currentProblem.correctAnswer;
      speechService.speakAnswerFeedback(
        isCorrect,
        currentProblem.correctAnswer || 0,
        currentProblem.options || [],
        currentProblem.explanation
      );
    } else {
      const isCorrect = userAnswer === currentProblem.answer;
      speechService.speakTrueFalseFeedback(
        isCorrect,
        currentProblem.answer ?? false,
        currentProblem.explanation
      );
    }

    setWaitingForAnswer(false);
  }, [showFeedback, waitingForAnswer, speechEnabled, currentProblems, currentIndex, userAnswers]);

  // 読み上げ制御関数
  const toggleSpeech = () => {
    if (speechEnabled) {
      speechService.stop();
      setSpeechEnabled(false);
    } else {
      setSpeechEnabled(true);
    }
  };

  const pauseSpeech = () => {
    if (speechState === 'speaking') {
      speechService.pause();
    } else if (speechState === 'paused') {
      speechService.resume();
    }
  };

  const skipSpeech = () => {
    speechService.skipToNext();
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
      setStrikethroughStates(shuffledProblems.map(p =>
        p.options ? new Array(p.options.length).fill(false) : []
      ));
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
      setStrikethroughStates(shuffledProblems.map(p =>
        p.options ? new Array(p.options.length).fill(false) : []
      ));
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
      setStrikethroughStates(shuffledProblems.map(p =>
        p.options ? new Array(p.options.length).fill(false) : []
      ));
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
      // 学習プランからの新規開始 or 最初から開始の場合は確認不要
      const isNewPlanSession = sessionId.startsWith('study-plan-') && session.currentIndex === 0;
      if (!isNewPlanSession) {
        const progressPercent = ((session.currentIndex / session.problems.length) * 100).toFixed(0);
        const confirmMessage = `${t[currentLang].messages.confirmResumeSession} \n\n` +
          `${t[currentLang].labels.totalQuestions}: ${session.problems.length}${currentLang === 'ja' ? '問' : ''} \n` +
          `${t[currentLang].sections.savedSessions.progress} ${session.currentIndex + 1}${currentLang === 'ja' ? '問目' : ''} (${progressPercent}%) \n` +
          `${t[currentLang].sections.savedSessions.correct} ${session.score}${currentLang === 'ja' ? '問' : ''} \n` +
          `${currentLang === 'ja' ? '開始日時' : 'Start Time'}: ${session.startTime.toLocaleString()} `;

        if (!confirm(confirmMessage)) return;
      }

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
      setStrikethroughStates(session.problems.map(p =>
        p.options ? new Array(p.options.length).fill(false) : []
      ));
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

      // 学習プランセッション開始時: SM-2スナップショットを取得（新規/復習の判定用）
      if (sessionId.startsWith('study-plan-') && session.currentIndex === 0) {
        const snapshot = new Map<number, { isNew: boolean; repetitions: number }>();
        for (const problem of session.problems) {
          if (problem.id) {
            try {
              const card = await spacedRepetitionService.getCardByProblemId(problem.id);
              snapshot.set(problem.id, {
                isNew: !card || card.repetitions === 0,
                repetitions: card?.repetitions ?? 0,
              });
            } catch {
              snapshot.set(problem.id, { isNew: true, repetitions: 0 });
            }
          }
        }
        setSm2Snapshot(snapshot);
        debugLog('📸 SM-2 snapshot taken:', snapshot.size, 'problems,',
          Array.from(snapshot.values()).filter(s => s.isNew).length, 'new,',
          Array.from(snapshot.values()).filter(s => !s.isNew).length, 'review');
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

  const handleAnswer = async (answer: boolean | number | number[]) => {
    if (showFeedback) return;
    const currentProblem = currentProblems[currentIndex];
    let isCorrect: boolean;
    if (Array.isArray(answer)) {
      // multi-select: 正解配列と完全一致チェック
      const correctSet = new Set(currentProblem.correctAnswers || []);
      const answerSet = new Set(answer);
      isCorrect = correctSet.size === answerSet.size && [...correctSet].every(v => answerSet.has(v));
    } else if (typeof answer === 'boolean') {
      const correctAnswer = getTrueFalseCorrectAnswer(currentProblem);
      isCorrect = correctAnswer !== undefined && answer === correctAnswer;
    } else {
      isCorrect = answer === currentProblem.correctAnswer;
    }
    const newUserAnswers = [...userAnswers, answer];
    setUserAnswers(newUserAnswers);
    if (isCorrect) {
      setScore(prev => prev + 1);
      setXpFloatTrigger(prev => prev + 1); // Trigger +XP animation
    }
    setLastAnswerCorrect(isCorrect);
    setShowMistakeReason(!isCorrect); // 不正解時のみ理由タグを表示

    // 解答時間を計算
    const responseTime = Date.now() - questionStartTime.getTime();

    if (analyticsTracker && currentProblem.id) {
      const analyticsAnswer = Array.isArray(answer) ? answer[0] ?? 0 : answer;
      analyticsTracker.recordAnswer(analyticsAnswer, isCorrect, undefined);
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

    // SM-2カードを更新（復習モード + 学習プランセッション）
    const shouldUpdateSM2 = currentSessionId && currentProblem.id && (
      currentSessionId.startsWith('review-') ||
      currentSessionId.startsWith('study-plan-')
    );
    if (shouldUpdateSM2) {
      try {
        debugLog('🔄 Updating SM-2 card:', currentProblem.id, 'isCorrect:', isCorrect);

        // カードを取得（なければ新規作成）
        let card = await spacedRepetitionService.getCardByProblemId(currentProblem.id!);
        if (!card && currentSessionId!.startsWith('study-plan-')) {
          // 学習プランセッション: 新規問題のSM-2カードを作成
          const newCard = createNewCard(
            currentProblem.id!,
            currentProblem.category,
            undefined,
            currentProblem.question?.substring(0, 50)
          );
          const cardId = await spacedRepetitionService.createCard(newCard);
          card = { ...newCard, id: cardId };
          debugLog('✨ New SM-2 card created for problemId:', currentProblem.id);
        }

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

  const handleToggleStrikethrough = (optionIndex: number) => {
    if (showFeedback) return; // Don't allow strikethrough after answer is shown

    const newStrikethroughStates = [...strikethroughStates];
    if (!newStrikethroughStates[currentIndex]) {
      newStrikethroughStates[currentIndex] = [];
    }
    const currentStrikethrough = [...(newStrikethroughStates[currentIndex] || [])];
    currentStrikethrough[optionIndex] = !currentStrikethrough[optionIndex];
    newStrikethroughStates[currentIndex] = currentStrikethrough;
    setStrikethroughStates(newStrikethroughStates);
  };

  const handleNext = async () => {
    if (pendingSubjectiveFeedback) {
      setShowSubjectiveFeedback(true);
      return;
    }
    proceedToNextQuestion();
  };

  // Keyboard shortcuts for quiz play
  useEffect(() => {
    if (mode !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const problem = currentProblems[currentIndex];
      if (!problem) return;

      // Escape → quit quiz
      if (e.key === 'Escape') {
        e.preventDefault();
        handleQuitQuiz();
        return;
      }

      // After answering: Enter/Space/→ → next question
      if (showFeedback) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      // True/False questions: T/F keys
      if (problem.type === 'true-false') {
        if (e.key === 't' || e.key === 'T') { e.preventDefault(); handleAnswer(true); }
        if (e.key === 'f' || e.key === 'F') { e.preventDefault(); handleAnswer(false); }
        return;
      }

      // Multiple choice / multi-select questions
      const options = problem.options;
      if (!options) return;

      // Map key to option index (1-9 or A-I)
      let idx = -1;
      if (e.key >= '1' && e.key <= '9') {
        idx = parseInt(e.key) - 1;
      } else {
        const lower = e.key.toLowerCase();
        if (lower >= 'a' && lower <= 'i') {
          idx = lower.charCodeAt(0) - 97; // a=0, b=1, ...
        }
      }

      if (idx >= 0 && idx < options.length) {
        e.preventDefault();
        if (problem.type === 'multi-select') {
          // Toggle selection
          setMultiSelectSelections(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx].sort((a, b) => a - b)
          );
        } else {
          // Single choice → immediate answer
          handleAnswer(idx);
        }
        return;
      }

      // Multi-select: Enter/Space to confirm
      if (problem.type === 'multi-select' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (multiSelectSelections.length > 0) {
          handleAnswer([...multiSelectSelections]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showFeedback, currentIndex, currentProblems, multiSelectSelections]);

  const handleSaveNote = async (note: string, tags: string[]) => {
    const currentProblem = currentProblems[currentIndex];
    if (!currentProblem.id) return;

    try {
      // 更新されたProblemオブジェクトを作成
      const updatedProblem: Problem = {
        ...currentProblem,
        userNotes: note,
        noteUpdatedAt: new Date(),
        noteTags: tags,
      };

      // IndexedDBのProblemを更新
      await problemService.update(updatedProblem);

      // ローカルの状態も更新
      const updatedProblems = [...currentProblems];
      updatedProblems[currentIndex] = updatedProblem;
      setCurrentProblems(updatedProblems);

      setShowNoteEditor(false);
      toast.success(currentLang === 'ja' ? 'メモを保存しました' : 'Note saved successfully');
    } catch (error) {
      console.error('[QuizView] メモの保存に失敗:', error);
      toast.error(currentLang === 'ja' ? 'メモの保存に失敗しました' : 'Failed to save note');
    }
  };

  const proceedToNextQuestion = async () => {
    setShowFeedback(false);
    setMultiSelectSelections([]);
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
    localStorage.setItem('quizPlayed', 'true');
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

        // 目標進捗を自動更新
        updateAllGoalProgress().then(() => {
          debugLog('✅ Goal progress updated');
        }).catch(error => {
          debugLog('❌ Goal progress update failed:', error);
        });

        // 学習プランの進捗を更新（プランベースのセッションの場合）
        if (currentSessionId.startsWith('study-plan-')) {
          (async () => {
            try {
              const allPlans = await studyPlanService.getAll();
              const activePlans = allPlans.filter(p => p.isActive && !p.isCompleted);
              const completedCount = currentProblems.length;
              const accuracy = completedCount > 0 ? (score / completedCount) * 100 : 0;

              // SM-2スナップショットを使い、新規と復習の問題数を分離
              let newCount = 0;
              let reviewCount = 0;
              for (const problem of currentProblems) {
                if (problem.id && sm2Snapshot.size > 0) {
                  const snap = sm2Snapshot.get(problem.id);
                  if (snap && !snap.isNew) {
                    reviewCount++;
                  } else {
                    newCount++;
                  }
                } else {
                  // スナップショットがない場合は全て新規として扱う
                  newCount++;
                }
              }
              debugLog(`📊 Problem breakdown: ${newCount} new, ${reviewCount} review (total: ${completedCount})`);

              // 1. 今日のDailyGoalがあれば更新（新規/復習を分離して記録）
              const todayGoals = await dailyGoalService.getTodayGoals();
              const updatedPlanIds = new Set<number>();

              for (const goal of todayGoals) {
                if (!activePlans.some(p => p.id === goal.planId)) continue;
                const updatedNew = (goal.actualNewProblems || 0) + newCount;
                const updatedReview = (goal.actualReviewProblems || 0) + reviewCount;
                const totalActual = updatedNew + updatedReview;
                const isNowCompleted = totalActual >= goal.totalProblemsTarget;

                await dailyGoalService.update(goal.id!, {
                  actualNewProblems: updatedNew,
                  actualReviewProblems: updatedReview,
                  accuracy,
                  isCompleted: isNowCompleted,
                });
                updatedPlanIds.add(goal.planId);
                debugLog(`✅ DailyGoal ${goal.id} updated: new=${updatedNew}, review=${updatedReview}, total=${totalActual}/${goal.totalProblemsTarget}`);
              }

              // 1.5. DailyGoalがなかったプラン → 休息日学習として動的にDailyGoalを作成
              for (const plan of activePlans) {
                if (!plan.id || updatedPlanIds.has(plan.id)) continue;
                // 休息日判定: 今日がstudyDaysOfWeekに含まれていない
                const todayDow = new Date().getDay();
                const isRestDayForPlan = plan.studyDaysOfWeek && !plan.studyDaysOfWeek.includes(todayDow);
                if (isRestDayForPlan) {
                  try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    await db.dailyGoals.add({
                      planId: plan.id,
                      date: today,
                      dayNumber: 0,
                      isStudyDay: false,
                      newProblemsTarget: 0,
                      reviewProblemsTarget: 0,
                      totalProblemsTarget: 0,
                      categories: [],
                      estimatedTime: 0,
                      isCompleted: true,
                      completedAt: new Date(),
                      actualNewProblems: newCount,
                      actualReviewProblems: reviewCount,
                      accuracy,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    });
                    updatedPlanIds.add(plan.id);
                    debugLog(`✅ Rest day DailyGoal created for plan ${plan.id}: new=${newCount}, review=${reviewCount}`);
                  } catch (restDayError) {
                    debugLog('⚠️ Rest day DailyGoal creation failed:', restDayError);
                  }
                }
              }

              // 2. DailyGoalがないプランも含め、全アクティブプランの進捗を直接更新
              for (const plan of activePlans) {
                if (!plan.id) continue;

                // DailyGoalで更新されなかったプランの場合、progress.completedProblemsを直接加算
                if (!updatedPlanIds.has(plan.id)) {
                  const currentNewCompleted = plan.progress?.completedNewProblems || 0;
                  const currentReviewCompleted = plan.progress?.completedReviewProblems || 0;
                  const updatedNewCompleted = currentNewCompleted + newCount;
                  const updatedReviewCompleted = currentReviewCompleted + reviewCount;
                  const totalTarget = plan.totalProblemsTarget || 1;
                  // メイン進捗は新規問題ベース
                  const newPercentage = Math.min(100, (updatedNewCompleted / totalTarget) * 100);

                  await studyPlanService.update(plan.id, {
                    progress: {
                      ...plan.progress,
                      completedProblems: updatedNewCompleted + updatedReviewCompleted,
                      completedNewProblems: updatedNewCompleted,
                      completedReviewProblems: updatedReviewCompleted,
                      remainingProblems: Math.max(0, totalTarget - updatedNewCompleted),
                      progressPercentage: newPercentage,
                    },
                  });
                  debugLog(`✅ Plan ${plan.id} progress directly updated: new=${updatedNewCompleted}, review=${updatedReviewCompleted}/${totalTarget} (${newPercentage.toFixed(1)}%)`);
                }

                // プラン進捗を再計算
                await recalculatePlanProgress(plan.id);
                debugLog(`✅ Plan ${plan.id} progress recalculated`);
              }

              window.dispatchEvent(new CustomEvent('study-plan-updated'));
              window.dispatchEvent(new CustomEvent('daily-goal-completed'));

              // PDCA日次調整: 翌日のDailyGoalを自動調整
              for (const plan of activePlans) {
                if (!plan.id) continue;
                try {
                  const adjustResult = await performDailyAdjustment(plan.id);
                  if (adjustResult.carryOver > 0 || adjustResult.reviewExpansion > 0 || adjustResult.extraReviewAdded) {
                    debugLog(`🔄 Daily adjustment for plan ${plan.id}:`, adjustResult);
                  }

                  // 週次リバランスチェック
                  if (shouldAutoRebalance(plan)) {
                    const rebalanceResult = await performWeeklyRebalance(plan.id);
                    debugLog(`🔄 Weekly rebalance for plan ${plan.id}:`, rebalanceResult.summary);
                  }
                } catch (adjustError) {
                  debugLog('⚠️ PDCA adjustment error:', adjustError);
                }
              }
            } catch (e) {
              debugLog('❌ Study plan progress update failed:', e);
            }
          })();
        }

        // 模試セッションの結果保存 + DailyGoal更新
        if (currentSessionId.startsWith('mock-exam-')) {
          (async () => {
            try {
              // セッションIDからplanIdを抽出: mock-exam-{planId}-{timestamp}
              const parts = currentSessionId.split('-');
              const planId = parseInt(parts[2], 10);
              if (isNaN(planId)) {
                debugLog('⚠️ Invalid mock exam session ID:', currentSessionId);
                return;
              }

              const plan = await studyPlanService.getById(planId);
              if (!plan) return;

              // カテゴリ別結果を集計
              const categoryMap = new Map<string, { total: number; correct: number }>();
              currentProblems.forEach((problem, i) => {
                const cat = problem.category || 'その他';
                const existing = categoryMap.get(cat) || { total: 0, correct: 0 };
                existing.total++;
                let isAnswerCorrect: boolean;
                if (problem.type === 'multi-select' && Array.isArray(userAnswers[i])) {
                  const correctSet = new Set(problem.correctAnswers || []);
                  const answerSet = new Set(userAnswers[i] as number[]);
                  isAnswerCorrect = correctSet.size === answerSet.size && [...correctSet].every(v => answerSet.has(v));
                } else {
                  isAnswerCorrect = typeof userAnswers[i] === 'boolean'
                    ? userAnswers[i] === getTrueFalseCorrectAnswer(problem)
                    : (typeof userAnswers[i] === 'number' && userAnswers[i] === problem.correctAnswer);
                }
                if (isAnswerCorrect) {
                  existing.correct++;
                }
                categoryMap.set(cat, existing);
              });

              const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
                category,
                total: data.total,
                correct: data.correct,
                accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
              }));

              const mockScore = currentProblems.length > 0 ? Math.round((score / currentProblems.length) * 100) : 0;

              await mockExamService.create({
                planId,
                examDate: new Date(),
                scope: currentProblems.length >= 50 ? 'full' : 'short',
                totalQuestions: currentProblems.length,
                correctAnswers: score,
                score: mockScore,
                categoryBreakdown,
                createdAt: new Date(),
              });

              debugLog(`✅ Mock exam result saved: ${mockScore}% (${score}/${currentProblems.length})`);

              // #1: 模試でもDailyGoalを更新（模試日が「未消化」として繰越されるバグ防止）
              // 模試で解いた問題は復習問題として計上し、DailyGoalをisCompleted=trueにマーク
              const todayGoals = await dailyGoalService.getTodayGoals();
              const mockGoal = todayGoals.find(g => g.planId === planId);
              if (mockGoal && mockGoal.id) {
                const completedCount = currentProblems.length;
                const accuracy = completedCount > 0 ? (score / completedCount) * 100 : 0;
                await dailyGoalService.update(mockGoal.id, {
                  actualReviewProblems: (mockGoal.actualReviewProblems || 0) + completedCount,
                  accuracy,
                  isCompleted: true, // 模試完了で該当日を完了扱い
                  completedAt: new Date(),
                  updatedAt: new Date(),
                });
                debugLog(`✅ Mock exam DailyGoal ${mockGoal.id} marked completed`);
              }

              // プラン進捗を再計算
              await recalculatePlanProgress(planId);

              // #3: 模試後リバランスは lastWeeklyRebalance を考慮して二重実行を防止
              if (plan.autoRebalanceWeekly !== false && shouldAutoRebalance(plan)) {
                const rebalanceResult = await performWeeklyRebalance(planId);
                debugLog(`🔄 Post-mock rebalance:`, rebalanceResult.summary);
              }

              window.dispatchEvent(new CustomEvent('study-plan-updated'));
              window.dispatchEvent(new CustomEvent('daily-goal-completed'));
            } catch (e) {
              debugLog('❌ Mock exam result save failed:', e);
            }
          })();
        }

        // ゲーミフィケーション: XP/ストリーク/バッジ更新
        recordQuizCompletion(score, currentProblems.length).then((result) => {
          debugLog('✅ Gamification updated:', {
            xp: result.xpResult.xpAwarded,
            leveledUp: result.xpResult.leveledUp,
            streak: result.streakResult.streak,
            newBadges: result.newBadges.length,
          });
          // バッジ解除通知を表示
          if (result.newBadges.length > 0) {
            const badgeDef = BADGE_DEFINITIONS.find(b => b.id === result.newBadges[0].badgeId);
            if (badgeDef) setUnlockedBadge(badgeDef);
          }
        }).catch(error => {
          debugLog('❌ Gamification update failed:', error);
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
        <GlassCard className="p-4 sm:p-6 space-y-6">
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
        <GlassCard className="p-4 sm:p-6 space-y-6">
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

  const handleToggleFavorite = async (problemId: number) => {
    try {
      await favoritesService.toggleFavorite(problemId);
      // Update the current problems array with the new favorite status
      setCurrentProblems(prevProblems =>
        prevProblems.map(p =>
          p.id === problemId
            ? { ...p, isFavorite: !p.isFavorite, favoritedAt: !p.isFavorite ? new Date() : undefined }
            : p
        )
      );
      toast.success(currentProblems[currentIndex].isFavorite ? 'お気に入りから削除しました' : 'お気に入りに追加しました', {
        position: 'top-center',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('お気に入りの更新に失敗しました', {
        position: 'top-center',
        duration: 2000,
      });
    }
  };

  const renderPlayingMode = () => {
    const currentProblem = currentProblems[currentIndex];
    if (!currentProblem) return <div>Loading...</div>;

    // Flashcard Mode
    if (displayMode === 'flashcard') {
      return (
        <FlashcardView
          problems={currentProblems}
          currentIndex={currentIndex}
          onNext={handleNext}
          onPrev={() => {
            if (currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
            }
          }}
          onExit={() => setDisplayMode('normal')}
          language={currentLang as 'ja' | 'en'}
        />
      );
    }

    // Normal Quiz Mode
    return (
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header - モック2d準拠 */}
        <div className="flex items-center gap-3 mb-7">
          <button
            onClick={handleQuitQuiz}
            className="text-[15px] text-[#64748B] hover:text-[#94A3B8] transition-colors p-1"
          >
            ✕
          </button>

          {/* Inline Progress (モック準拠: ✕ [bar] 3/8) */}
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              initial={false}
              animate={{ width: `${((currentIndex + (showFeedback ? 1 : 0)) / currentProblems.length) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ background: '#6366F1', boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}
            />
          </div>
          <span className="text-[13px] font-semibold text-[#94A3B8] tabular-nums whitespace-nowrap">
            {currentIndex + (showFeedback ? 1 : 0)}/{currentProblems.length}
          </span>

          {/* Secondary controls */}
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => setDisplayMode(displayMode === 'normal' ? 'flashcard' : 'normal')}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[#64748B] hover:text-[#94A3B8]"
            >
              {displayMode === 'normal' ? <CreditCard size={16} /> : <Grid3x3 size={16} />}
            </button>
            <FavoriteButton
              problemId={currentProblem.id!}
              isFavorite={currentProblem.isFavorite || false}
              onToggle={handleToggleFavorite}
              size="sm"
            />
          </div>
        </div>

        {/* Speech Control Panel */}
        <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-2 p-4 rounded-2xl bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              📝 読み上げ
            </span>
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-lg transition-all ${
                speechEnabled
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
              }`}
              title={speechEnabled ? '読み上げを停止' : '読み上げを開始'}
            >
              {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>

          {speechEnabled && (
            <div className="flex flex-col gap-2">
              {/* Playback Controls */}
              <div className="flex gap-2">
                <button
                  onClick={pauseSpeech}
                  className="flex-1 p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                  title={speechState === 'speaking' ? '一時停止' : '再生'}
                  disabled={speechState === 'idle'}
                >
                  {speechState === 'speaking' ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={skipSpeech}
                  className="flex-1 p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                  title="次へスキップ"
                  disabled={speechState === 'idle'}
                >
                  <SkipForward size={16} />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="text-xs text-center text-text-secondary mt-1">
                {speechState === 'speaking' && '🔊 読み上げ中...'}
                {speechState === 'paused' && '⏸️ 一時停止'}
                {speechState === 'waiting-answer' && '⏳ 解答待ち'}
                {speechState === 'idle' && '⏹️ 停止中'}
              </div>
            </div>
          )}
        </div>

        {/* Quiz Card */}
        <div className="mb-8">
          <QuizCard
            category={currentProblem.category}
            question={currentProblem.question}
            showFeedback={showFeedback}
            isCorrect={
              currentProblem.type === 'multi-select'
                ? (() => {
                    const correctSet = new Set(currentProblem.correctAnswers || []);
                    const answerSet = new Set(Array.isArray(userAnswers[currentIndex]) ? userAnswers[currentIndex] as number[] : []);
                    return correctSet.size === answerSet.size && [...correctSet].every(v => answerSet.has(v));
                  })()
                : currentProblem.type === 'true-false' || typeof userAnswers[currentIndex] === 'boolean'
                  ? userAnswers[currentIndex] === getTrueFalseCorrectAnswer(currentProblem)
                  : userAnswers[currentIndex] === currentProblem.correctAnswer
            }
          >
            <div className="grid grid-cols-1 gap-4">
              {currentProblem.type === 'multi-select' && currentProblem.options ? (
                <>
                  <div className="text-xs text-[#818CF8] font-medium mb-1">
                    {language === 'ja'
                      ? `正解を全て選択してください（${(currentProblem.correctAnswers || []).length}つ）`
                      : `Select all correct answers (${(currentProblem.correctAnswers || []).length})`}
                  </div>
                  {currentProblem.options.map((option, idx) => (
                    <AnswerButton
                      key={idx}
                      index={idx}
                      label={option}
                      onClick={() => {
                        if (showFeedback) return;
                        setMultiSelectSelections(prev =>
                          prev.includes(idx)
                            ? prev.filter(i => i !== idx)
                            : [...prev, idx].sort((a, b) => a - b)
                        );
                      }}
                      disabled={showFeedback}
                      showResult={showFeedback}
                      isCorrect={(currentProblem.correctAnswers || []).includes(idx)}
                      isSelected={
                        showFeedback
                          ? (Array.isArray(userAnswers[currentIndex]) ? (userAnswers[currentIndex] as number[]).includes(idx) : false)
                          : multiSelectSelections.includes(idx)
                      }
                      isStrikedThrough={strikethroughStates[currentIndex]?.[idx] || false}
                      onStrikethrough={() => handleToggleStrikethrough(idx)}
                    />
                  ))}
                  {!showFeedback && (
                    <button
                      onClick={() => handleAnswer([...multiSelectSelections])}
                      disabled={multiSelectSelections.length === 0}
                      className={`w-full rounded-2xl h-[48px] flex items-center justify-center text-[15px] font-bold text-white transition-all ${
                        multiSelectSelections.length === 0
                          ? 'opacity-40 cursor-not-allowed'
                          : 'shadow-lg shadow-[#6366F1]/30'
                      }`}
                      style={{ background: multiSelectSelections.length === 0 ? '#475569' : '#6366F1' }}
                    >
                      {language === 'ja' ? `確定する (${multiSelectSelections.length}つ選択中)` : `Confirm (${multiSelectSelections.length} selected)`}
                    </button>
                  )}
                </>
              ) : currentProblem.options ? (
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
                    isStrikedThrough={strikethroughStates[currentIndex]?.[idx] || false}
                    onStrikethrough={() => handleToggleStrikethrough(idx)}
                  />
                ))
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <AnswerButton
                    label="True"
                    onClick={() => handleAnswer(true)}
                    disabled={showFeedback}
                    showResult={showFeedback}
                    isCorrect={getTrueFalseCorrectAnswer(currentProblem) === true}
                    isSelected={userAnswers[currentIndex] === true}
                  />
                  <AnswerButton
                    label="False"
                    onClick={() => handleAnswer(false)}
                    disabled={showFeedback}
                    showResult={showFeedback}
                    isCorrect={getTrueFalseCorrectAnswer(currentProblem) === false}
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
                      <div className="text-text-secondary leading-relaxed">
                        {currentProblem.explanation ? (
                          <MarkdownPreview content={currentProblem.explanation} className="text-text-secondary [&_strong]:text-white [&_em]:text-[#818CF8]" />
                        ) : (
                          <p>No explanation available.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Difficulty Grading (正解時のみ - Anki style) */}
                {lastAnswerCorrect === true && (
                  <div className="mb-4">
                    <DifficultyGrading
                      isVisible={true}
                      onGrade={(grade: DifficultyGrade) => {
                        // Store grade for later SM-2 integration
                        debugLog('📊 Difficulty grade:', grade, 'for problem:', currentProblems[currentIndex]?.id);
                        // The grade could be stored in localStorage or passed to SM-2 update
                        const gradeKey = `diffGrade_${currentProblems[currentIndex]?.id}`;
                        localStorage.setItem(gradeKey, grade);
                      }}
                      language={currentLang}
                    />
                  </div>
                )}

                {/* Mistake Reason Tagger (不正解時のみ) */}
                {lastAnswerCorrect === false && showMistakeReason && (
                  <MistakeReasonTagger
                    problemId={currentProblem.id!}
                    category={currentProblem.category}
                    language={currentLang}
                    onSave={async (reasonTag: MistakeReasonTag, note?: string) => {
                      try {
                        // 最新の履歴エントリーのIDを取得
                        const allHistory = await historyService.getAll();
                        const latestEntry = allHistory.find(h => h.problemId === currentProblem.id!);
                        if (latestEntry?.id) {
                          await saveMistakeReason({
                            historyId: latestEntry.id,
                            problemId: currentProblem.id!,
                            category: currentProblem.category,
                            reasonTag,
                            note,
                            createdAt: new Date(),
                          });
                          toast.success(currentLang === 'ja' ? '理由を保存しました' : 'Reason saved');
                        }
                      } catch (error) {
                        debugLog('❌ Mistake reason save error:', error);
                      }
                      setShowMistakeReason(false);
                    }}
                    onSkip={() => setShowMistakeReason(false)}
                  />
                )}

                {/* User Notes */}
                <div className="mb-6 p-6 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>📝</span>
                      <span>{currentLang === 'ja' ? 'あなたのメモ' : 'Your Notes'}</span>
                    </h3>
                    <button
                      onClick={() => setShowNoteEditor(true)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                      <Edit size={14} />
                      <span>{currentLang === 'ja' ? 'メモを編集' : 'Edit Note'}</span>
                    </button>
                  </div>
                  {currentProblem.userNotes ? (
                    <MarkdownPreview content={currentProblem.userNotes} className="text-gray-900 dark:text-gray-100" />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      {currentLang === 'ja' ? 'メモはまだありません。「メモを編集」をクリックしてメモを追加できます。' : 'No notes yet. Click "Edit Note" to add notes.'}
                    </p>
                  )}
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

  const renderResultMode = () => {
    const incorrectCount = currentProblems.length - score;
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const xpEarned = score * 10;

    return (
      <div className="max-w-md mx-auto flex flex-col items-center pt-4 animate-in fade-in zoom-in duration-500">
        {/* Header */}
        <div className="text-[13px] font-bold tracking-[0.12em] mb-6" style={{ color: '#34D399' }}>
          {currentLang === 'ja' ? '今日の1歩 完了!' : 'Session Complete!'}
        </div>

        {/* Score Circle */}
        <div
          className="w-[150px] h-[150px] rounded-full flex flex-col items-center justify-center mb-6"
          style={{
            border: '6px solid rgba(16,185,129,0.25)',
            boxShadow: '0 0 30px rgba(16,185,129,0.25), inset 0 0 20px rgba(16,185,129,0.1)',
          }}
        >
          <div className="text-[40px] font-bold" style={{ color: '#34D399' }}>
            {score}<span className="text-[20px] text-[#64748B]">/{currentProblems.length}</span>
          </div>
          <div className="text-[12px] text-[#94A3B8]">
            {currentLang === 'ja' ? '正解' : 'Correct'}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 w-full mb-5">
          <div
            className="flex-1 rounded-[14px] p-[14px] text-center"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-[18px] font-bold text-[#818CF8]">+{xpEarned}</div>
            <div className="text-[11px] text-[#64748B]">XP</div>
          </div>
          <div
            className="flex-1 rounded-[14px] p-[14px] text-center"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-[18px] font-bold text-[#34D399]">
              {minutes}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-[#64748B]">
              {currentLang === 'ja' ? '学習時間' : 'Time'}
            </div>
          </div>
          <div
            className="flex-1 rounded-[14px] p-[14px] text-center"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-[18px] font-bold text-[#F8FAFC]">
              {Math.round((score / currentProblems.length) * 100)}%
            </div>
            <div className="text-[11px] text-[#64748B]">
              {currentLang === 'ja' ? '正答率' : 'Accuracy'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full mt-auto flex flex-col gap-3 pt-6">
          {/* Share to X */}
          <button
            onClick={() => {
              const accuracy = Math.round((score / currentProblems.length) * 100);
              const text = [
                `Minguellaでクイズに挑戦！`,
                `${currentProblems.length}問中${score}問正解（正答率${accuracy}%）`,
                ``,
                `無料で使えるクイズ学習アプリ`,
                `https://minguella-quiz-v4.netlify.app`,
                `#Minguella #クイズ #学習`,
              ].join('\n');
              window.open(
                `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
                '_blank',
                'noopener,noreferrer,width=550,height=420'
              );
            }}
            className="w-full rounded-2xl h-[48px] flex items-center justify-center gap-2 text-[15px] font-bold"
            style={{
              background: 'rgba(30,41,59,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#94A3B8',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {currentLang === 'ja' ? '結果をXでシェア' : 'Share on X'}
          </button>
          <button
            onClick={onBack}
            className="w-full rounded-2xl h-[56px] flex items-center justify-center text-[17px] font-bold text-white"
            style={{ background: '#6366F1', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
          >
            {currentLang === 'ja' ? 'ホームへ' : 'Home'}
          </button>
          {incorrectCount > 0 && (
            <button
              onClick={() => {
                const incorrectIds: number[] = [];
                currentProblems.forEach((problem, i) => {
                  let isCorrect: boolean;
                  if (problem.type === 'multi-select' && Array.isArray(userAnswers[i])) {
                    const correctSet = new Set(problem.correctAnswers || []);
                    const answerSet = new Set(userAnswers[i] as number[]);
                    isCorrect = correctSet.size === answerSet.size && [...correctSet].every(v => answerSet.has(v));
                  } else {
                    isCorrect = typeof userAnswers[i] === 'boolean'
                      ? userAnswers[i] === getTrueFalseCorrectAnswer(problem)
                      : (typeof userAnswers[i] === 'number' && userAnswers[i] === problem.correctAnswer);
                  }
                  if (!isCorrect && problem.id) {
                    incorrectIds.push(problem.id);
                  }
                });
                if (incorrectIds.length > 0) {
                  startReviewQuiz(incorrectIds);
                }
              }}
              className="w-full text-center text-[13px] font-semibold text-[#64748B] py-2"
            >
              {currentLang === 'ja'
                ? `間違えた${incorrectCount}問を復習する`
                : `Review ${incorrectCount} incorrect`}
            </button>
          )}
        </div>
      </div>
    );
  };

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

      {/* +XP Float Animation */}
      {mode === 'playing' && (
        <XPFloatAnimation trigger={xpFloatTrigger} amount={10} />
      )}

      <LevelUpModal
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        score={score}
        totalQuestions={currentProblems.length}
        language={currentLang}
      />

      {/* Badge Unlock Toast */}
      {unlockedBadge && (
        <BadgeUnlockToast
          badge={unlockedBadge}
          onClose={() => setUnlockedBadge(null)}
          language={currentLang}
        />
      )}

      <SubjectiveFeedback
        isEnabled={showSubjectiveFeedback}
        onSkip={() => {
          setShowSubjectiveFeedback(false);
          setPendingSubjectiveFeedback(null);
          proceedToNextQuestion();
        }}
        onSubmit={handleSubjectiveFeedbackSubmit}
      />

      {/* Note Editor Modal */}
      {showNoteEditor && mode === 'playing' && currentProblems[currentIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNoteEditor(false)} />
          <div className="relative z-10 w-full max-w-4xl flex flex-col max-h-[90vh]">
            {/* Close Button - Fixed at top */}
            <button
              onClick={() => setShowNoteEditor(false)}
              className="flex-shrink-0 self-end mb-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm"
            >
              <span className="text-lg">✕ 閉じる</span>
            </button>
            {/* Scrollable Note Editor */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-24">
              <NoteEditor
                problemId={currentProblems[currentIndex].id!}
                initialNote={currentProblems[currentIndex].userNotes || ''}
                initialTags={currentProblems[currentIndex].noteTags || []}
                onSave={handleSaveNote}
                className="shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// React.memoでラップしてパフォーマンス最適化
export default memo(QuizView);