import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, Download, BarChart3 } from 'lucide-react';
import { comparePeriods, compareCategories, exportComparisonToText, exportCategoryComparisonToText } from '../lib/statsComparison';
import type { ComparisonResult, CategoryComparisonResult } from '../lib/statsComparison';
import toast from 'react-hot-toast';

interface StatsComparisonModalProps {
  onClose: () => void;
  categories: string[];
}

type TabType = 'period' | 'category';
type PeriodType = 'week' | 'month';

/**
 * Stats Comparison Modal
 *
 * 統計の比較機能を提供するモーダルコンポーネント
 * - 期間比較（今週vs先週、今月vs先月）
 * - カテゴリ比較（最大3つ）
 * - 比較バーチャート
 * - データエクスポート
 */
export function StatsComparisonModal({ onClose, categories }: StatsComparisonModalProps) {
  const language = localStorage.getItem('language') || 'ja';
  const [activeTab, setActiveTab] = useState<TabType>('period');
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [periodComparison, setPeriodComparison] = useState<ComparisonResult | null>(null);
  const [categoryComparison, setCategoryComparison] = useState<CategoryComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const t = {
    ja: {
      title: '📊 統計比較',
      close: '閉じる',
      tabs: {
        period: '期間比較',
        category: 'カテゴリ比較'
      },
      period: {
        selector: '比較対象',
        week: '今週 vs 先週',
        month: '今月 vs 先月',
        current: '現在',
        previous: '前回',
        difference: '差分',
        metrics: {
          totalAnswered: '回答数',
          totalCorrect: '正解数',
          accuracy: '正答率',
          categoriesAnswered: 'カテゴリ数'
        },
        trend: {
          up: '上昇',
          down: '下降',
          neutral: '横ばい'
        },
        noData: 'データがありません'
      },
      category: {
        selector: 'カテゴリ選択（最大3つ）',
        select: '選択',
        selected: '選択中',
        compare: '比較する',
        maxSelected: '最大3つまで選択できます',
        noCategories: '比較するカテゴリがありません',
        metrics: {
          name: 'カテゴリ',
          accuracy: '正答率',
          totalAnswered: '回答数',
          totalCorrect: '正解数',
          problemCount: '問題数'
        }
      },
      export: 'エクスポート',
      exportSuccess: 'クリップボードにコピーしました'
    },
    en: {
      title: '📊 Statistics Comparison',
      close: 'Close',
      tabs: {
        period: 'Period Comparison',
        category: 'Category Comparison'
      },
      period: {
        selector: 'Comparison Target',
        week: 'This Week vs Last Week',
        month: 'This Month vs Last Month',
        current: 'Current',
        previous: 'Previous',
        difference: 'Difference',
        metrics: {
          totalAnswered: 'Answered',
          totalCorrect: 'Correct',
          accuracy: 'Accuracy',
          categoriesAnswered: 'Categories'
        },
        trend: {
          up: 'Up',
          down: 'Down',
          neutral: 'Neutral'
        },
        noData: 'No data available'
      },
      category: {
        selector: 'Select Categories (Max 3)',
        select: 'Select',
        selected: 'Selected',
        compare: 'Compare',
        maxSelected: 'You can select up to 3 categories',
        noCategories: 'No categories to compare',
        metrics: {
          name: 'Category',
          accuracy: 'Accuracy',
          totalAnswered: 'Answered',
          totalCorrect: 'Correct',
          problemCount: 'Problems'
        }
      },
      export: 'Export',
      exportSuccess: 'Copied to clipboard'
    }
  };

  const currentLang = language as keyof typeof t;

  // Load period comparison on tab switch or period type change
  useEffect(() => {
    if (activeTab === 'period') {
      loadPeriodComparison();
    }
  }, [activeTab, periodType]);

  const loadPeriodComparison = async () => {
    setIsLoading(true);
    try {
      const currentPeriod = periodType === 'week' ? 'this-week' : 'this-month';
      const previousPeriod = periodType === 'week' ? 'last-week' : 'last-month';
      const result = await comparePeriods(currentPeriod, previousPeriod);
      setPeriodComparison(result);
    } catch (error) {
      console.error('Failed to load period comparison:', error);
      toast.error('Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategoryComparison = async () => {
    if (selectedCategories.length === 0) return;

    setIsLoading(true);
    try {
      const result = await compareCategories(selectedCategories);
      setCategoryComparison(result);
    } catch (error) {
      console.error('Failed to load category comparison:', error);
      toast.error('Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else if (selectedCategories.length < 3) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      toast.error(t[currentLang].category.maxSelected);
    }
  };

  const handleExport = async () => {
    try {
      let text = '';
      if (activeTab === 'period' && periodComparison) {
        text = exportComparisonToText(periodComparison, language as 'ja' | 'en');
      } else if (activeTab === 'category' && categoryComparison) {
        text = exportCategoryComparisonToText(categoryComparison, language as 'ja' | 'en');
      }

      if (text) {
        await navigator.clipboard.writeText(text);
        toast.success(t[currentLang].exportSuccess);
      }
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export');
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="text-green-600 dark:text-green-400" size={18} />;
    if (trend === 'down') return <TrendingDown className="text-red-600 dark:text-red-400" size={18} />;
    return <Minus className="text-gray-600 dark:text-gray-400" size={18} />;
  };

  const formatDifference = (value: number, unit: string = '') => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}${unit}`;
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-start sm:items-center justify-start sm:justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-full sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mx-0 sm:mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-700 dark:to-indigo-800 px-4 sm:px-6 py-3 sm:py-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label={t[currentLang].close}
            >
              <X size={20} className="sm:size-6" />
            </button>

            <h2 className="text-lg sm:text-2xl font-bold pr-10">{t[currentLang].title}</h2>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6">
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => setActiveTab('period')}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === 'period'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t[currentLang].tabs.period}
                {activeTab === 'period' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('category')}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === 'category'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t[currentLang].tabs.category}
                {activeTab === 'category' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-2 py-3 sm:p-6 w-full">
            <AnimatePresence mode="wait">
              {activeTab === 'period' && (
                <motion.div
                  key="period"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 sm:space-y-6 w-full"
                >
                  {/* Period Selector */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].period.selector}
                    </label>
                    <select
                      value={periodType}
                      onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="week">{t[currentLang].period.week}</option>
                      <option value="month">{t[currentLang].period.month}</option>
                    </select>
                  </div>

                  {/* Period Comparison */}
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                  ) : periodComparison ? (
                    <>
                      {/* Metrics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
                        {/* Current Period */}
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-3 sm:p-5 border border-purple-200 dark:border-purple-800 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
                            {t[currentLang].period.current}
                          </h3>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {t[currentLang].period.metrics.totalAnswered}:
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {periodComparison.current.totalAnswered}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {t[currentLang].period.metrics.accuracy}:
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {periodComparison.current.accuracy.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Previous Period */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-3 sm:p-5 border border-gray-200 dark:border-gray-700 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
                            {t[currentLang].period.previous}
                          </h3>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {t[currentLang].period.metrics.totalAnswered}:
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {periodComparison.previous.totalAnswered}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {t[currentLang].period.metrics.accuracy}:
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {periodComparison.previous.accuracy.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Difference Display */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl p-3 sm:p-5 border border-gray-200 dark:border-gray-600 w-full">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-4 flex items-center gap-2">
                          <BarChart3 size={18} className="sm:size-5" />
                          {t[currentLang].period.difference}
                        </h3>
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {t[currentLang].period.metrics.totalAnswered}:
                            </span>
                            <div className="flex items-center gap-2">
                              {getTrendIcon(periodComparison.difference.answerTrend)}
                              <span className={`font-bold ${
                                periodComparison.difference.totalAnswered > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : periodComparison.difference.totalAnswered < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {formatDifference(periodComparison.difference.totalAnswered)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {t[currentLang].period.metrics.accuracy}:
                            </span>
                            <div className="flex items-center gap-2">
                              {getTrendIcon(periodComparison.difference.accuracyTrend)}
                              <span className={`font-bold ${
                                periodComparison.difference.accuracy > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : periodComparison.difference.accuracy < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {formatDifference(periodComparison.difference.accuracy, '%')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bar Chart */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t[currentLang].period.current}
                              </span>
                              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                {periodComparison.current.totalAnswered}
                              </span>
                            </div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${
                                    Math.max(periodComparison.current.totalAnswered, periodComparison.previous.totalAnswered) > 0
                                      ? (periodComparison.current.totalAnswered / Math.max(periodComparison.current.totalAnswered, periodComparison.previous.totalAnswered)) * 100
                                      : 0
                                  }%`
                                }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t[currentLang].period.previous}
                              </span>
                              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                                {periodComparison.previous.totalAnswered}
                              </span>
                            </div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${
                                    Math.max(periodComparison.current.totalAnswered, periodComparison.previous.totalAnswered) > 0
                                      ? (periodComparison.previous.totalAnswered / Math.max(periodComparison.current.totalAnswered, periodComparison.previous.totalAnswered)) * 100
                                      : 0
                                  }%`
                                }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                                className="h-full bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      {t[currentLang].period.noData}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'category' && (
                <motion.div
                  key="category"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 sm:space-y-6 w-full"
                >
                  {/* Category Selector */}
                  {categories.length > 0 ? (
                    <>
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                          {t[currentLang].category.selector}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto w-full">
                          {categories.map((category) => (
                            <button
                              key={category}
                              onClick={() => toggleCategory(category)}
                              className={`px-3 py-2.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-all break-words text-left w-full ${
                                selectedCategories.includes(category)
                                  ? 'bg-purple-600 text-white shadow-lg'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedCategories.length > 0 && (
                        <button
                          onClick={loadCategoryComparison}
                          disabled={isLoading}
                          className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t[currentLang].category.compare}
                        </button>
                      )}

                      {/* Category Comparison Results */}
                      {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        </div>
                      ) : categoryComparison && categoryComparison.categories.length > 0 ? (
                        <div className="space-y-3 sm:space-y-6 w-full">
                          {/* Bar Chart */}
                          <div className="bg-white dark:bg-gray-700 rounded-xl p-3 sm:p-5 border border-gray-200 dark:border-gray-600 w-full">
                            <div className="space-y-3 sm:space-y-4">
                              {categoryComparison.categories.map((cat, index) => (
                                <div key={cat.name}>
                                  <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {cat.name}
                                    </span>
                                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                      {cat.accuracy.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${cat.accuracy}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
                                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Metrics Table */}
                          <div className="bg-white dark:bg-gray-700 rounded-xl p-3 sm:p-5 border border-gray-200 dark:border-gray-600 overflow-x-auto w-full">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-600">
                                  <th className="text-left py-2 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                    {t[currentLang].category.metrics.name}
                                  </th>
                                  <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                    {t[currentLang].category.metrics.accuracy}
                                  </th>
                                  <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                    {t[currentLang].category.metrics.totalAnswered}
                                  </th>
                                  <th className="text-right py-2 px-1 sm:px-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                    {t[currentLang].category.metrics.problemCount}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryComparison.categories.map((cat) => (
                                  <tr key={cat.name} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm text-gray-900 dark:text-white font-medium">
                                      {cat.name}
                                    </td>
                                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm text-right text-gray-900 dark:text-white">
                                      {cat.accuracy.toFixed(1)}%
                                    </td>
                                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm text-right text-gray-900 dark:text-white">
                                      {cat.totalAnswered}
                                    </td>
                                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm text-right text-gray-900 dark:text-white">
                                      {cat.problemCount}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      {t[currentLang].category.noCategories}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-between items-center">
              <button
                onClick={handleExport}
                disabled={
                  (activeTab === 'period' && !periodComparison) ||
                  (activeTab === 'category' && !categoryComparison)
                }
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Download size={18} />
                {t[currentLang].export}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                {t[currentLang].close}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
