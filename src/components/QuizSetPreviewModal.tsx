import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, FileText, BarChart3, Layers } from 'lucide-react';
import type { QuizSet, Problem, HistoryEntry } from '../types';
import { db } from '../lib/database';

interface QuizSetPreviewModalProps {
  quizSet: QuizSet;
  problems: Problem[];
  onClose: () => void;
  onStartQuiz: (quizSetId: number) => void;
}

/**
 * Quiz Set Preview Modal
 *
 * 問題集の内容をプレビューするモーダルコンポーネント
 * - 最初の5問を表示
 * - 統計情報（総問題数、カテゴリ数、平均正答率）
 * - 「学習開始」ボタンでQuizViewへ遷移
 * - Framer Motionアニメーション
 */
export function QuizSetPreviewModal({
  quizSet,
  problems,
  onClose,
  onStartQuiz
}: QuizSetPreviewModalProps) {
  const [averageAccuracy, setAverageAccuracy] = useState<number | null>(null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');

  useEffect(() => {
    // 言語設定の監視
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('language') || 'ja');
    };

    window.addEventListener('storage', handleStorageChange);
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

  useEffect(() => {
    // 平均正答率を計算
    const calculateAccuracy = async () => {
      try {
        const history = await db.history.toArray();
        const problemIds = new Set(quizSet.problemIds);
        const relevantHistory = history.filter((entry: HistoryEntry) =>
          entry.problemId && problemIds.has(entry.problemId)
        );

        if (relevantHistory.length === 0) {
          setAverageAccuracy(null);
          return;
        }

        const correctCount = relevantHistory.filter((entry: HistoryEntry) => entry.isCorrect).length;
        const accuracy = (correctCount / relevantHistory.length) * 100;
        setAverageAccuracy(Math.round(accuracy));
      } catch (error) {
        console.error('Failed to calculate accuracy:', error);
        setAverageAccuracy(null);
      }
    };

    calculateAccuracy();
  }, [quizSet.problemIds]);

  const t = {
    ja: {
      title: '問題集プレビュー',
      close: '閉じる',
      startQuiz: '学習開始',
      statistics: {
        totalProblems: '総問題数',
        categories: 'カテゴリ数',
        averageAccuracy: '平均正答率',
        noData: 'データなし'
      },
      preview: {
        title: 'プレビュー（最初の5問）',
        type: {
          'multiple-choice': '選択式',
          'true-false': '〇×'
        },
        more: '他 {{count}} 問'
      }
    },
    en: {
      title: 'Quiz Set Preview',
      close: 'Close',
      startQuiz: 'Start Quiz',
      statistics: {
        totalProblems: 'Total Problems',
        categories: 'Categories',
        averageAccuracy: 'Average Accuracy',
        noData: 'No Data'
      },
      preview: {
        title: 'Preview (First 5 Problems)',
        type: {
          'multiple-choice': 'Multiple Choice',
          'true-false': 'True/False'
        },
        more: '{{count}} more problems'
      }
    }
  };

  const currentLang = language as keyof typeof t;
  const previewProblems = problems.slice(0, 5);
  const remainingCount = Math.max(0, problems.length - 5);
  const categories = [...new Set(problems.map(p => p.category))];

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
          <div className="relative bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-700 dark:to-indigo-800 px-6 py-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label={t[currentLang].close}
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-2">{quizSet.name}</h2>
            {quizSet.description && (
              <p className="text-white/90 text-sm">{quizSet.description}</p>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-240px)] p-6">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2 text-blue-600 dark:text-blue-400">
                  <FileText size={20} />
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {problems.length}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {t[currentLang].statistics.totalProblems}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2 text-purple-600 dark:text-purple-400">
                  <Layers size={20} />
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {categories.length}
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  {t[currentLang].statistics.categories}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2 text-emerald-600 dark:text-emerald-400">
                  <BarChart3 size={20} />
                </div>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {averageAccuracy !== null ? `${averageAccuracy}%` : '-'}
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  {t[currentLang].statistics.averageAccuracy}
                </div>
              </div>
            </div>

            {/* Preview Problems */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">📋</span>
                {t[currentLang].preview.title}
              </h3>

              <div className="space-y-3">
                {previewProblems.map((problem, index) => (
                  <motion.div
                    key={problem.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            {t[currentLang].preview.type[problem.type as keyof typeof t.ja.preview.type] || problem.type}
                          </span>
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                            {problem.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                          {problem.question}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {remainingCount > 0 && (
                  <div className="text-center py-3 text-sm text-gray-600 dark:text-gray-400">
                    {t[currentLang].preview.more.replace('{{count}}', remainingCount.toString())}
                  </div>
                )}
              </div>
            </div>
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
              <button
                onClick={() => quizSet.id && onStartQuiz(quizSet.id)}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <Play size={18} />
                {t[currentLang].startQuiz}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
