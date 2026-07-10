/**
 * LevelCheckQuiz - レベルチェックテスト
 *
 * 学習履歴がないユーザーがプランを作成する際に、
 * 正確な currentLevel を判定するための軽量インラインクイズ。
 *
 * 3フェーズ構成:
 *   - intro: テスト説明 + 開始/スキップボタン
 *   - quiz: 10問の問題を1問ずつ表示（プログレスバー付き）
 *   - result: 正答率表示 + 「プラン作成に進む」ボタン
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { problemService } from '../lib/database';
import type { Problem } from '../types';

// ============================================================
// 国際化テキスト
// ============================================================

const t = {
  ja: {
    // intro
    introTitle: 'レベルチェックテスト',
    introDesc: '選択したカテゴリーから10問出題し、現在の実力を判定します。結果に基づいて最適な学習プランを作成します。',
    introNote: '※ この結果は学習履歴には記録されません',
    startTest: 'テスト開始',
    skipTest: 'スキップ（デフォルト値で作成）',
    // quiz
    questionOf: '問',
    trueLabel: '正しい',
    falseLabel: '誤り',
    // result
    resultTitle: 'テスト結果',
    accuracy: '正答率',
    correct: '正解',
    incorrect: '不正解',
    outOf: '問中',
    resultDesc: 'この結果を元に学習プランを作成します',
    continueToPreview: 'プラン作成に進む',
    retryTest: 'もう一度テストする',
    // errors
    notEnoughProblems: '選択したカテゴリーに十分な問題がありません（最低3問必要）。デフォルト値でプランを作成します。',
    loadingProblems: '問題を読み込み中...',
  },
  en: {
    introTitle: 'Level Check Test',
    introDesc: '10 questions from your selected categories to assess your current level. The result will be used to create an optimal study plan.',
    introNote: '* Results are NOT recorded in your study history',
    startTest: 'Start Test',
    skipTest: 'Skip (use default values)',
    questionOf: 'Q',
    trueLabel: 'True',
    falseLabel: 'False',
    resultTitle: 'Test Results',
    accuracy: 'Accuracy',
    correct: 'Correct',
    incorrect: 'Incorrect',
    outOf: 'out of',
    resultDesc: 'Your study plan will be based on this result',
    continueToPreview: 'Continue to Plan',
    retryTest: 'Retry Test',
    notEnoughProblems: 'Not enough problems in selected categories (min 3 required). Plan will use default values.',
    loadingProblems: 'Loading problems...',
  },
};

// ============================================================
// Props
// ============================================================

interface LevelCheckQuizProps {
  categories: string[];
  problemIds?: number[];       // 特定の問題IDのみ出題（問題集選択時）
  onComplete: (score: number) => void; // 0-100
  onSkip: () => void;
  lang: 'ja' | 'en';
}

// ============================================================
// ユーティリティ
// ============================================================

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// メインコンポーネント
// ============================================================

type Phase = 'intro' | 'quiz' | 'result';

export function LevelCheckQuiz({ categories, problemIds, onComplete, onSkip, lang }: LevelCheckQuizProps) {
  const text = t[lang];

  const [phase, setPhase] = useState<Phase>('intro');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // --- 問題読み込み ---
  const loadProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      let allProblems: Problem[] = [];

      if (problemIds && problemIds.length > 0) {
        // 問題集指定時: 指定IDの問題のみ取得
        const all = await problemService.getAll();
        const idSet = new Set(problemIds);
        allProblems = all.filter(p => p.id !== undefined && idSet.has(p.id));
      } else {
        // カテゴリーベース（従来の動作）
        for (const cat of categories) {
          const catProblems = await problemService.getByCategory(cat);
          allProblems.push(...catProblems);
        }
      }

      if (allProblems.length < 3) {
        // 問題数が不足 → 自動スキップ
        onSkip();
        return;
      }

      const selected = shuffleArray(allProblems).slice(0, 10);
      setProblems(selected);
      setCurrentIndex(0);
      setCorrectCount(0);
      setPhase('quiz');
    } catch (e) {
      console.error('レベルチェック問題読み込みエラー:', e);
      onSkip();
    } finally {
      setIsLoading(false);
    }
  }, [categories, problemIds, onSkip]);

  // --- 回答処理 ---
  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (feedback) return; // 連打防止

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    }

    // 1秒後に次の問題へ
    setTimeout(() => {
      setFeedback(null);
      if (currentIndex + 1 < problems.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        // テスト完了
        const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
        setCorrectCount(finalCorrect);
        setPhase('result');
      }
    }, 800);
  }, [feedback, currentIndex, problems.length, correctCount]);

  // --- ○×問題の判定 ---
  const handleTrueFalse = useCallback((userAnswer: boolean) => {
    const problem = problems[currentIndex];
    const isCorrect = userAnswer === problem.answer;
    handleAnswer(isCorrect);
  }, [problems, currentIndex, handleAnswer]);

  // --- 選択肢問題の判定 ---
  const handleMultipleChoice = useCallback((selectedIndex: number) => {
    const problem = problems[currentIndex];
    const isCorrect = selectedIndex === problem.correctAnswer;
    handleAnswer(isCorrect);
  }, [problems, currentIndex, handleAnswer]);

  // --- リトライ ---
  const handleRetry = useCallback(() => {
    setPhase('intro');
    setProblems([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setFeedback(null);
  }, []);

  const currentProblem = problems[currentIndex];
  const score = problems.length > 0 ? Math.round((correctCount / problems.length) * 100) : 0;

  // ============================================================
  // Intro Phase
  // ============================================================
  if (phase === 'intro') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            {text.introTitle}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {text.introDesc}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {text.introNote}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={loadProblems}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {text.loadingProblems}
              </>
            ) : (
              text.startTest
            )}
          </button>
          <button
            onClick={onSkip}
            className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium py-2 transition-colors"
          >
            {text.skipTest}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Quiz Phase
  // ============================================================
  if (phase === 'quiz' && currentProblem) {
    const progress = ((currentIndex + 1) / problems.length) * 100;
    const isTrueFalse = currentProblem.type === 'true-false' || !currentProblem.type;

    return (
      <div className="space-y-5">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {text.questionOf} {currentIndex + 1} / {problems.length}
            </span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Category Badge */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          {currentProblem.category}
        </span>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`p-4 rounded-lg border-2 transition-colors ${
              feedback === 'correct'
                ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-600'
                : feedback === 'incorrect'
                ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
            }`}>
              <p className="text-base font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
                {currentProblem.question}
              </p>
            </div>

            {/* Answer Buttons */}
            <div className="mt-4 space-y-2">
              {isTrueFalse ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTrueFalse(true)}
                    disabled={feedback !== null}
                    className="py-3 px-4 rounded-lg font-medium text-sm border-2 transition-all
                      border-green-300 dark:border-green-700 text-green-700 dark:text-green-300
                      hover:bg-green-50 dark:hover:bg-green-900/20
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ⭕ {text.trueLabel}
                  </button>
                  <button
                    onClick={() => handleTrueFalse(false)}
                    disabled={feedback !== null}
                    className="py-3 px-4 rounded-lg font-medium text-sm border-2 transition-all
                      border-red-300 dark:border-red-700 text-red-700 dark:text-red-300
                      hover:bg-red-50 dark:hover:bg-red-900/20
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ❌ {text.falseLabel}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentProblem.options?.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleMultipleChoice(idx)}
                      disabled={feedback !== null}
                      className="w-full text-left py-3 px-4 rounded-lg font-medium text-sm border-2 transition-all
                        border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300
                        hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ============================================================
  // Result Phase
  // ============================================================
  if (phase === 'result') {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const scoreColor = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';
    const strokeColor = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 text-center">
          {text.resultTitle}
        </h2>

        {/* Circle Chart */}
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-gray-200 dark:text-gray-700"
              />
              <motion.circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke={strokeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${scoreColor}`}>{score}%</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{text.accuracy}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</p>
            <p className="text-xs text-green-700 dark:text-green-300">{text.correct}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{problems.length - correctCount}</p>
            <p className="text-xs text-red-700 dark:text-red-300">{text.incorrect}</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {text.resultDesc}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => onComplete(score)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors shadow-sm"
          >
            {text.continueToPreview}
          </button>
          <button
            onClick={handleRetry}
            className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium py-2 transition-colors"
          >
            {text.retryTest}
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}

export default LevelCheckQuiz;
