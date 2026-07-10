import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import type { Problem } from '../types';

interface DuplicateResolveModalProps {
  problem: Problem;
  duplicates: Problem[];
  onDeleteProblem: (problemId: number) => Promise<void>;
  onClose: () => void;
  language?: 'ja' | 'en';
}

/**
 * Duplicate Resolve Modal
 *
 * 重複問題の解消モーダルコンポーネント
 * - 選択された問題とその重複問題を表示
 * - 各問題の削除機能
 */
export function DuplicateResolveModal({
  problem,
  duplicates,
  onDeleteProblem,
  onClose,
  language = 'ja'
}: DuplicateResolveModalProps) {
  const t = {
    ja: {
      title: '⚠️ 重複問題の解消',
      close: '閉じる',
      currentProblem: '📍 現在の問題',
      duplicateProblems: '🔄 重複している問題',
      category: 'カテゴリー',
      question: '問題文',
      actions: {
        delete: '削除',
        deleteConfirm: 'この問題を削除してもよろしいですか？',
        close: '閉じる'
      },
      noCategory: 'カテゴリなし'
    },
    en: {
      title: '⚠️ Resolve Duplicate Problems',
      close: 'Close',
      currentProblem: '📍 Current Problem',
      duplicateProblems: '🔄 Duplicate Problems',
      category: 'Category',
      question: 'Question',
      actions: {
        delete: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this problem?',
        close: 'Close'
      },
      noCategory: 'No Category'
    }
  };

  const currentLang = language;

  const handleDelete = async (problemId: number) => {
    if (!confirm(t[currentLang].actions.deleteConfirm)) return;

    try {
      await onDeleteProblem(problemId);
    } catch (error) {
      console.error('Failed to delete problem:', error);
    }
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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-red-500 to-orange-500 dark:from-red-700 dark:to-orange-700 px-6 py-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label={t[currentLang].close}
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-3">
              <AlertTriangle size={32} />
              <h2 className="text-2xl font-bold">{t[currentLang].title}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">
            {/* Current Problem */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                {t[currentLang].currentProblem}
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="mb-2">
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm font-medium">
                    {problem.category || t[currentLang].noCategory}
                  </span>
                </div>
                <p className="text-gray-900 dark:text-gray-100">
                  {problem.question}
                </p>
              </div>
            </section>

            {/* Duplicate Problems */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t[currentLang].duplicateProblems} ({duplicates.length})
              </h3>

              <div className="space-y-3">
                {duplicates.map((duplicateProblem, index) => (
                  <motion.div
                    key={duplicateProblem.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2">
                          <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                            {duplicateProblem.category || t[currentLang].noCategory}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {duplicateProblem.question}
                        </p>
                      </div>
                      <button
                        onClick={() => duplicateProblem.id && handleDelete(duplicateProblem.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <Trash2 size={16} />
                        <span>{t[currentLang].actions.delete}</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                {t[currentLang].actions.close}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
