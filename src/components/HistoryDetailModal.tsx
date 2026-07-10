import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Brain, Target, Lightbulb, Calendar, Bookmark, RotateCcw } from 'lucide-react';
import type { HistoryEntry, Problem, QuizSet } from '../types';

interface HistoryDetailModalProps {
  entry: HistoryEntry;
  problem: Problem | null;
  quizSet: QuizSet | null;
  onClose: () => void;
  onRetry?: (problemId: number) => void;
  onAddToReview?: (problemId: number) => void;
}

/**
 * History Detail Modal
 *
 * 学習履歴エントリの詳細を表示するモーダルコンポーネント
 * - 問題の完全な内容
 * - 正解/不正解の詳細
 * - ユーザーの回答と正解の比較
 * - 正解の説明
 * - 解答時間
 * - 主観的フィードバック（自信度、体感難易度、推測フラグ）
 * - 再挑戦・復習リスト追加機能
 */
export function HistoryDetailModal({
  entry,
  problem,
  quizSet,
  onClose,
  onRetry,
  onAddToReview
}: HistoryDetailModalProps) {
  const language = localStorage.getItem('language') || 'ja';

  const t = {
    ja: {
      title: {
        correct: '✅ 正解！',
        incorrect: '❌ 不正解'
      },
      close: '閉じる',
      sections: {
        problemInfo: '📋 問題情報',
        answerInfo: '💡 回答情報',
        feedback: '📊 主観的フィードバック',
        metadata: '🕒 メタデータ'
      },
      problem: {
        question: '問題',
        type: 'タイプ',
        category: 'カテゴリ',
        quizSet: '問題集',
        types: {
          'multiple-choice': '選択式',
          'true-false': '〇×'
        },
        notFound: '❌ 問題が削除されました',
        noQuizSet: '単独問題'
      },
      answer: {
        yourAnswer: 'あなたの回答',
        correctAnswer: '正解',
        explanation: '正解の説明',
        responseTime: '解答時間',
        seconds: '秒',
        noTime: '記録なし',
        trueLabel: '○ (正しい)',
        falseLabel: '× (間違い)',
        option: '選択肢'
      },
      feedback: {
        confidence: '自信度',
        difficulty: '体感難易度',
        guessing: '推測',
        noData: 'データなし',
        confidenceLevels: {
          high: '高い',
          medium: '中程度',
          low: '低い'
        },
        yes: 'はい',
        no: 'いいえ',
        stars: '★'
      },
      metadata: {
        answeredAt: '解答日時',
        problemId: '問題ID'
      },
      actions: {
        retry: '再挑戦',
        addToReview: '復習リスト追加'
      }
    },
    en: {
      title: {
        correct: '✅ Correct!',
        incorrect: '❌ Incorrect'
      },
      close: 'Close',
      sections: {
        problemInfo: '📋 Problem Information',
        answerInfo: '💡 Answer Information',
        feedback: '📊 Subjective Feedback',
        metadata: '🕒 Metadata'
      },
      problem: {
        question: 'Question',
        type: 'Type',
        category: 'Category',
        quizSet: 'Quiz Set',
        types: {
          'multiple-choice': 'Multiple Choice',
          'true-false': 'True/False'
        },
        notFound: '❌ Problem has been deleted',
        noQuizSet: 'Standalone Problem'
      },
      answer: {
        yourAnswer: 'Your Answer',
        correctAnswer: 'Correct Answer',
        explanation: 'Explanation',
        responseTime: 'Response Time',
        seconds: 's',
        noTime: 'Not recorded',
        trueLabel: '○ (True)',
        falseLabel: '× (False)',
        option: 'Option'
      },
      feedback: {
        confidence: 'Confidence',
        difficulty: 'Perceived Difficulty',
        guessing: 'Guessing',
        noData: 'No data',
        confidenceLevels: {
          high: 'High',
          medium: 'Medium',
          low: 'Low'
        },
        yes: 'Yes',
        no: 'No',
        stars: '★'
      },
      metadata: {
        answeredAt: 'Answered At',
        problemId: 'Problem ID'
      },
      actions: {
        retry: 'Retry',
        addToReview: 'Add to Review'
      }
    }
  };

  const currentLang = language as keyof typeof t;
  const isCorrect = entry.isCorrect;

  // 解答時間を秒に変換
  const responseTimeSeconds = entry.responseTime
    ? (entry.responseTime / 1000).toFixed(1)
    : null;

  // ユーザーの回答を整形
  const formatUserAnswer = () => {
    if (!problem) return '-';

    if (problem.type === 'true-false') {
      const userAnswer = entry.userAnswer as boolean | undefined;
      return userAnswer
        ? t[currentLang].answer.trueLabel
        : t[currentLang].answer.falseLabel;
    } else if (problem.type === 'multiple-choice') {
      const answerIndex = entry.userAnswer as number | undefined;
      if (answerIndex !== undefined && problem.options) {
        return `${t[currentLang].answer.option} ${answerIndex + 1}: ${problem.options[answerIndex]}`;
      }
      return '-';
    }
    return '-';
  };

  // 正解を整形
  const formatCorrectAnswer = () => {
    if (!problem) return '-';

    if (problem.type === 'true-false') {
      return problem.answer
        ? t[currentLang].answer.trueLabel
        : t[currentLang].answer.falseLabel;
    } else if (problem.type === 'multiple-choice') {
      const correctIndex = problem.correctAnswer;
      if (correctIndex !== undefined && problem.options) {
        return `${t[currentLang].answer.option} ${correctIndex + 1}: ${problem.options[correctIndex]}`;
      }
      return '-';
    }
    return '-';
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`relative px-6 py-8 text-white ${
              isCorrect
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-700 dark:to-green-800'
                : 'bg-gradient-to-r from-red-500 to-rose-600 dark:from-red-700 dark:to-rose-800'
            }`}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label={t[currentLang].close}
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold">
              {isCorrect ? t[currentLang].title.correct : t[currentLang].title.incorrect}
            </h2>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-240px)] p-6 space-y-6">
            {/* Problem Information */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                {t[currentLang].sections.problemInfo}
              </h3>

              {problem ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t[currentLang].problem.question}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {problem.question}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t[currentLang].problem.type}
                      </div>
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {t[currentLang].problem.types[problem.type as keyof typeof t.ja.problem.types] || problem.type}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t[currentLang].problem.category}
                      </div>
                      <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                        {problem.category}
                      </span>
                    </div>
                  </div>

                  {quizSet && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t[currentLang].problem.quizSet}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {quizSet.name}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center text-red-700 dark:text-red-300">
                  {t[currentLang].problem.notFound}
                </div>
              )}
            </section>

            {/* Answer Information */}
            {problem && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  {t[currentLang].sections.answerInfo}
                </h3>

                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t[currentLang].answer.yourAnswer}
                      </div>
                      <div
                        className={`text-sm px-3 py-2 rounded ${
                          isCorrect
                            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}
                      >
                        {formatUserAnswer()}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t[currentLang].answer.correctAnswer}
                      </div>
                      <div className="text-sm px-3 py-2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                        {formatCorrectAnswer()}
                      </div>
                    </div>
                  </div>

                  {problem.explanation && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Lightbulb size={14} />
                        {t[currentLang].answer.explanation}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                        {problem.explanation}
                      </div>
                    </div>
                  )}

                  {responseTimeSeconds && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Clock size={14} />
                        {t[currentLang].answer.responseTime}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {responseTimeSeconds} {t[currentLang].answer.seconds}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Subjective Feedback */}
            {entry.subjectiveFeedback && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  {t[currentLang].sections.feedback}
                </h3>

                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
                  {entry.subjectiveFeedback.confidence && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain size={16} className="text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t[currentLang].feedback.confidence}
                        </span>
                      </div>
                      <span className="text-sm px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                        {t[currentLang].feedback.confidenceLevels[entry.subjectiveFeedback.confidence]}
                      </span>
                    </div>
                  )}

                  {entry.subjectiveFeedback.perceivedDifficulty && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target size={16} className="text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t[currentLang].feedback.difficulty}
                        </span>
                      </div>
                      <span className="text-sm">
                        {t[currentLang].feedback.stars.repeat(entry.subjectiveFeedback.perceivedDifficulty)}
                        <span className="text-gray-400 dark:text-gray-500">
                          {t[currentLang].feedback.stars.repeat(5 - entry.subjectiveFeedback.perceivedDifficulty)}
                        </span>
                      </span>
                    </div>
                  )}

                  {entry.subjectiveFeedback.wasGuessing !== undefined && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t[currentLang].feedback.guessing}
                        </span>
                      </div>
                      <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                        {entry.subjectiveFeedback.wasGuessing
                          ? t[currentLang].feedback.yes
                          : t[currentLang].feedback.no}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Metadata */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                {t[currentLang].sections.metadata}
              </h3>

              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {t[currentLang].metadata.answeredAt}:
                  </span>
                  <span className="text-xs text-gray-900 dark:text-gray-100">
                    {new Date(entry.timestamp).toLocaleString(currentLang === 'ja' ? 'ja-JP' : 'en-US')}
                  </span>
                </div>

                {entry.problemId && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {t[currentLang].metadata.problemId}:
                    </span>
                    <span className="text-xs font-mono text-gray-900 dark:text-gray-100">
                      #{entry.problemId}
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                {t[currentLang].close}
              </button>

              {problem && onAddToReview && (
                <button
                  onClick={() => {
                    onAddToReview(entry.problemId);
                    onClose();
                  }}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                >
                  <Bookmark size={18} />
                  {t[currentLang].actions.addToReview}
                </button>
              )}

              {problem && onRetry && (
                <button
                  onClick={() => {
                    onRetry(entry.problemId);
                    onClose();
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                >
                  <RotateCcw size={18} />
                  {t[currentLang].actions.retry}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
