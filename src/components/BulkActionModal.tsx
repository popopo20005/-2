import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, Trash2, Download, FolderPlus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  bulkUpdateProblems,
  bulkDeleteProblems,
  bulkExportToCSV,
  bulkExportToJSON,
  bulkAddToQuizSet,
  type BulkUpdateData
} from '../lib/bulkOperations';
import type { QuizSet } from '../types';
import { ProgressBar } from './ui/ProgressBar';

/**
 * Bulk action modal props
 */
export interface BulkActionModalProps {
  selectedProblemIds: number[];
  onClose: () => void;
  onComplete: () => void;
  categories: string[];
  quizSets: QuizSet[];
  language?: 'ja' | 'en';
}

type OperationType = 'update' | 'delete' | 'export' | 'addToQuizSet';

const t = {
  ja: {
    title: '一括操作',
    close: '閉じる',
    selectedCount: '件の問題を選択中',
    selectOperation: '操作を選択:',
    operations: {
      update: 'カテゴリを変更',
      delete: '削除',
      export: 'エクスポート',
      addToQuizSet: '問題集に追加'
    },
    category: {
      label: 'カテゴリを変更',
      placeholder: 'カテゴリを選択'
    },
    difficulty: {
      label: '難易度を変更',
      placeholder: '難易度を選択',
      easy: '易',
      medium: '中',
      hard: '難'
    },
    quizSet: {
      label: '追加先の問題集',
      placeholder: '問題集を選択'
    },
    export: {
      label: 'エクスポート形式',
      csv: 'CSV形式',
      json: 'JSON形式'
    },
    delete: {
      warning: 'この操作は取り消せません',
      confirm: '本当に削除しますか？'
    },
    buttons: {
      cancel: 'キャンセル',
      execute: '実行',
      processing: '処理中...'
    },
    messages: {
      updateSuccess: '件の問題を更新しました',
      deleteSuccess: '件の問題を削除しました',
      addToQuizSetSuccess: '件の問題を問題集に追加しました',
      exportSuccess: 'エクスポートしました',
      error: '操作に失敗しました'
    }
  },
  en: {
    title: 'Bulk Actions',
    close: 'Close',
    selectedCount: ' problems selected',
    selectOperation: 'Select operation:',
    operations: {
      update: 'Update Category/Difficulty',
      delete: 'Delete',
      export: 'Export',
      addToQuizSet: 'Add to Quiz Set'
    },
    category: {
      label: 'Change Category',
      placeholder: 'Select category'
    },
    difficulty: {
      label: 'Change Difficulty',
      placeholder: 'Select difficulty',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard'
    },
    quizSet: {
      label: 'Target Quiz Set',
      placeholder: 'Select quiz set'
    },
    export: {
      label: 'Export Format',
      csv: 'CSV',
      json: 'JSON'
    },
    delete: {
      warning: 'This action cannot be undone',
      confirm: 'Are you sure you want to delete?'
    },
    buttons: {
      cancel: 'Cancel',
      execute: 'Execute',
      processing: 'Processing...'
    },
    messages: {
      updateSuccess: ' problems updated',
      deleteSuccess: ' problems deleted',
      addToQuizSetSuccess: ' problems added to quiz set',
      exportSuccess: 'Exported successfully',
      error: 'Operation failed'
    }
  }
};

/**
 * Bulk Action Modal Component
 *
 * 一括操作モーダルコンポーネント
 * - カテゴリ・難易度の一括変更
 * - 一括削除
 * - エクスポート
 * - 問題集への一括追加
 */
export function BulkActionModal({
  selectedProblemIds,
  onClose,
  onComplete,
  categories,
  quizSets,
  language = 'ja'
}: BulkActionModalProps) {
  const currentLang = language;
  const [operation, setOperation] = useState<OperationType>('update');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Update操作のフォーム
  const [updateCategory, setUpdateCategory] = useState<string>('');

  // QuizSet追加操作のフォーム
  const [targetQuizSetId, setTargetQuizSetId] = useState<number | null>(null);

  // Export操作のフォーム
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const handleExecute = async () => {
    setIsProcessing(true);
    setProgress({ current: 0, total: selectedProblemIds.length });

    try {
      if (operation === 'update') {
        const updateData: BulkUpdateData = {};

        if (updateCategory) {
          updateData.category = updateCategory;
        }

        if (!updateCategory) {
          toast.error(currentLang === 'ja' ? 'カテゴリを選択してください' : 'Please select category');
          setIsProcessing(false);
          return;
        }

        const result = await bulkUpdateProblems(
          selectedProblemIds,
          updateData,
          (current, total) => setProgress({ current, total })
        );

        if (result.success) {
          toast.success(`${result.successCount}${t[currentLang].messages.updateSuccess}`);
          onComplete();
          onClose();
        } else {
          toast.error(t[currentLang].messages.error);
        }
      } else if (operation === 'delete') {
        // 確認ダイアログ
        const confirmed = window.confirm(
          `${t[currentLang].delete.confirm}\n${selectedProblemIds.length}${t[currentLang].selectedCount}`
        );

        if (!confirmed) {
          setIsProcessing(false);
          return;
        }

        const result = await bulkDeleteProblems(
          selectedProblemIds,
          (current, total) => setProgress({ current, total })
        );

        if (result.success) {
          toast.success(`${result.successCount}${t[currentLang].messages.deleteSuccess}`);
          onComplete();
          onClose();
        } else {
          toast.error(t[currentLang].messages.error);
        }
      } else if (operation === 'export') {
        let exportData: string;

        if (exportFormat === 'csv') {
          exportData = await bulkExportToCSV(selectedProblemIds);
        } else {
          exportData = await bulkExportToJSON(selectedProblemIds);
        }

        // クリップボードにコピー
        await navigator.clipboard.writeText(exportData);

        // ファイルとしてダウンロード
        const blob = new Blob([exportData], { type: exportFormat === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `problems_export_${Date.now()}.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(t[currentLang].messages.exportSuccess);
        onClose();
      } else if (operation === 'addToQuizSet') {
        if (!targetQuizSetId) {
          toast.error(currentLang === 'ja' ? '問題集を選択してください' : 'Please select a quiz set');
          setIsProcessing(false);
          return;
        }

        const result = await bulkAddToQuizSet(
          selectedProblemIds,
          targetQuizSetId,
          (current, total) => setProgress({ current, total })
        );

        if (result.success) {
          toast.success(`${result.successCount}${t[currentLang].messages.addToQuizSetSuccess}`);
          onComplete();
          onClose();
        } else {
          toast.error(t[currentLang].messages.error);
        }
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast.error(t[currentLang].messages.error);
    } finally {
      setIsProcessing(false);
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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-700 dark:to-indigo-800 px-6 py-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label={t[currentLang].close}
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold">{t[currentLang].title}</h2>
            <p className="text-white/90 mt-2">
              {selectedProblemIds.length}{t[currentLang].selectedCount}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!isProcessing ? (
              <div className="space-y-6">
                {/* 操作選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t[currentLang].selectOperation}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['update', 'delete', 'export', 'addToQuizSet'] as OperationType[]).map((op) => (
                      <button
                        key={op}
                        onClick={() => setOperation(op)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          operation === op
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {op === 'update' && <Edit className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                          {op === 'delete' && <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />}
                          {op === 'export' && <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                          {op === 'addToQuizSet' && <FolderPlus className="w-5 h-5 text-green-600 dark:text-green-400" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {t[currentLang].operations[op]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 操作別フォーム */}
                {operation === 'update' && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t[currentLang].category.label}
                      </label>
                      <select
                        value={updateCategory}
                        onChange={(e) => setUpdateCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">{t[currentLang].category.placeholder}</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {operation === 'delete' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">{t[currentLang].delete.warning}</span>
                    </div>
                  </div>
                )}

                {operation === 'export' && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].export.label}
                    </label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setExportFormat('csv')}
                        className={`flex-1 p-3 rounded-md border-2 transition-all ${
                          exportFormat === 'csv'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {t[currentLang].export.csv}
                      </button>
                      <button
                        onClick={() => setExportFormat('json')}
                        className={`flex-1 p-3 rounded-md border-2 transition-all ${
                          exportFormat === 'json'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {t[currentLang].export.json}
                      </button>
                    </div>
                  </div>
                )}

                {operation === 'addToQuizSet' && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].quizSet.label}
                    </label>
                    <select
                      value={targetQuizSetId ?? ''}
                      onChange={(e) => setTargetQuizSetId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">{t[currentLang].quizSet.placeholder}</option>
                      {quizSets.map((qs) => (
                        <option key={qs.id} value={qs.id}>
                          {qs.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <ProgressBar
                  current={progress.current}
                  total={progress.total}
                  label={t[currentLang].buttons.processing}
                  color="purple"
                  size="lg"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t[currentLang].buttons.cancel}
              </button>
              <button
                onClick={handleExecute}
                disabled={isProcessing}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? t[currentLang].buttons.processing : t[currentLang].buttons.execute}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
