import { CheckSquare, Square, Filter, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SelectionFilter } from '../lib/selectionManager';

/**
 * Bulk selection toolbar props
 */
export interface BulkSelectionToolbarProps {
  selectedCount: number;
  totalCount: number; // 将来の使用のために保持
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkAction: () => void;
  categories: string[];
  onFilterSelect: (filter: SelectionFilter) => void;
  language?: 'ja' | 'en';
}

const t = {
  ja: {
    selected: '件選択中',
    selectAll: 'すべて選択',
    deselectAll: 'すべて解除',
    bulkActions: '一括操作',
    filter: 'フィルタ',
    filterByCategory: 'カテゴリでフィルタ',
    filterByAccuracy: '正答率でフィルタ',
    selectCategory: 'カテゴリを選択',
    applyFilter: 'フィルタを適用',
    clearFilter: 'フィルタをクリア',
    accuracy: {
      all: 'すべて',
      below80: '80%以下',
      below70: '70%以下',
      below60: '60%以下',
      below50: '50%以下',
      below40: '40%以下',
      below30: '30%以下'
    }
  },
  en: {
    selected: ' selected',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    bulkActions: 'Bulk Actions',
    filter: 'Filter',
    filterByCategory: 'Filter by Category',
    filterByAccuracy: 'Filter by Accuracy',
    selectCategory: 'Select category',
    applyFilter: 'Apply Filter',
    clearFilter: 'Clear Filter',
    accuracy: {
      all: 'All',
      below80: '80% or below',
      below70: '70% or below',
      below60: '60% or below',
      below50: '50% or below',
      below40: '40% or below',
      below30: '30% or below'
    }
  }
};

/**
 * Bulk Selection Toolbar Component
 *
 * 一括選択ツールバーコンポーネント
 * - 選択数表示
 * - すべて選択/解除
 * - フィルタ機能
 * - 一括操作ボタン
 */
export function BulkSelectionToolbar({
  selectedCount,
  totalCount: _totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkAction,
  categories,
  onFilterSelect,
  language = 'ja'
}: BulkSelectionToolbarProps) {
  const currentLang = language;
  const [showFilter, setShowFilter] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterAccuracy, setFilterAccuracy] = useState<number | undefined>(undefined);

  const handleApplyFilter = () => {
    const filter: SelectionFilter = {};

    if (filterCategory) {
      filter.category = filterCategory;
    }

    if (filterAccuracy !== undefined) {
      filter.maxAccuracy = filterAccuracy;
    }

    onFilterSelect(filter);
    setShowFilter(false);
  };

  const handleClearFilter = () => {
    setFilterCategory('');
    setFilterAccuracy(undefined);
    onFilterSelect({});
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* 左側: 選択状態 */}
        <div className="flex items-center gap-4">
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedCount}{t[currentLang].selected}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Square className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                0{t[currentLang].selected}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll}
              className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium"
            >
              {t[currentLang].selectAll}
            </button>
            <button
              onClick={onDeselectAll}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t[currentLang].deselectAll}
            </button>
          </div>
        </div>

        {/* 右側: アクション */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium flex items-center gap-2 ${
              showFilter
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
            }`}
          >
            <Filter className="w-4 h-4" />
            {t[currentLang].filter}
          </button>

          <button
            onClick={onBulkAction}
            disabled={selectedCount === 0}
            className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t[currentLang].bulkActions}
          </button>
        </div>
      </div>

      {/* フィルタパネル */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* カテゴリフィルタ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].filterByCategory}
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">{t[currentLang].selectCategory}</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 正答率フィルタ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].filterByAccuracy}
                  </label>
                  <select
                    value={filterAccuracy ?? ''}
                    onChange={(e) => setFilterAccuracy(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">{t[currentLang].accuracy.all}</option>
                    <option value="80">{t[currentLang].accuracy.below80}</option>
                    <option value="70">{t[currentLang].accuracy.below70}</option>
                    <option value="60">{t[currentLang].accuracy.below60}</option>
                    <option value="50">{t[currentLang].accuracy.below50}</option>
                    <option value="40">{t[currentLang].accuracy.below40}</option>
                    <option value="30">{t[currentLang].accuracy.below30}</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={handleClearFilter}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors font-medium flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {t[currentLang].clearFilter}
                </button>
                <button
                  onClick={handleApplyFilter}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium shadow-md"
                >
                  {t[currentLang].applyFilter}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
