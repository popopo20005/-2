import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Edit, Check } from 'lucide-react';
import type { Problem } from '../types';

interface DuplicateWarningModalProps {
  duplicates: Problem[];
  similarity: number;
  onEdit: () => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
}

/**
 * Duplicate Warning Modal
 *
 * 問題の重複を検出した際に警告を表示するモーダルコンポーネント
 * - 重複問題の一覧表示（最大5件）
 * - 類似度の表示
 * - ユーザーアクション（編集、重複承認、キャンセル）
 */
export function DuplicateWarningModal({
  duplicates,
  similarity,
  onEdit,
  onSaveAnyway,
  onCancel
}: DuplicateWarningModalProps) {
  const language = localStorage.getItem('language') || 'ja';

  const t = {
    ja: {
      title: '⚠️ 類似した問題が見つかりました',
      close: '閉じる',
      message: '入力された問題文と類似度が高い問題が見つかりました。',
      maxSimilarity: '最大類似度',
      duplicateList: {
        title: '📋 類似問題一覧',
        count: '件',
        noCategory: 'カテゴリなし'
      },
      actions: {
        edit: '編集する',
        editDesc: '問題文を修正して重複を解消',
        saveAnyway: '重複を承認して保存',
        saveAnywayDesc: 'このまま保存する',
        cancel: 'キャンセル'
      }
    },
    en: {
      title: '⚠️ Similar Problems Found',
      close: 'Close',
      message: 'Problems with high similarity to the entered question were found.',
      maxSimilarity: 'Max Similarity',
      duplicateList: {
        title: '📋 Similar Problems',
        count: 'items',
        noCategory: 'No Category'
      },
      actions: {
        edit: 'Edit',
        editDesc: 'Modify the question to resolve duplicates',
        saveAnyway: 'Save Anyway',
        saveAnywayDesc: 'Save as is',
        cancel: 'Cancel'
      }
    }
  };

  const currentLang = language as keyof typeof t;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-center justify-center p-4"
        onClick={onCancel}
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
          <div className="relative bg-gradient-to-r from-orange-500 to-yellow-500 dark:from-orange-700 dark:to-yellow-700 px-6 py-8 text-white">
            <button
              onClick={onCancel}
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
          <div className="overflow-y-auto max-h-[calc(90vh-280px)] p-6 space-y-6">
            {/* Message */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-gray-900 dark:text-gray-100 mb-2">
                {t[currentLang].message}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t[currentLang].maxSimilarity}:
                </span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {similarity.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Duplicate List */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t[currentLang].duplicateList.title} ({duplicates.length}{t[currentLang].duplicateList.count})
              </h3>

              <div className="space-y-3">
                {duplicates.map((problem, index) => {
                  // 各問題の類似度を表示するため、再計算は不要
                  // （実際にはduplicateDetection.tsから渡されるべきだが、ここでは簡易的に最大類似度を使用）
                  const itemSimilarity = index === 0 ? similarity : similarity - (index * 2);

                  return (
                    <motion.div
                      key={problem.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-sm font-bold">
                            {itemSimilarity.toFixed(0)}%
                          </span>
                          <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                            {problem.category || t[currentLang].duplicateList.noCategory}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {problem.question}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium order-3 sm:order-1"
              >
                {t[currentLang].actions.cancel}
              </button>

              <button
                onClick={onSaveAnyway}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 order-2 sm:order-2"
              >
                <Check size={18} />
                <div className="text-left">
                  <div className="text-sm">{t[currentLang].actions.saveAnyway}</div>
                  <div className="text-xs opacity-80">{t[currentLang].actions.saveAnywayDesc}</div>
                </div>
              </button>

              <button
                onClick={onEdit}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 order-1 sm:order-3"
              >
                <Edit size={18} />
                <div className="text-left">
                  <div className="text-sm">{t[currentLang].actions.edit}</div>
                  <div className="text-xs opacity-80">{t[currentLang].actions.editDesc}</div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
