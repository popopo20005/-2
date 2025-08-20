import { useState, useEffect } from 'react';
import { historyService } from '../lib/database';
import type { Problem, QuizSet, HistoryEntry } from '../types';

interface HistoryProps {
  onBack: () => void;
}

interface DetailedHistoryEntry {
  entry: HistoryEntry;
  problem: Problem | null;
  quizSet: QuizSet | null;
}

interface HistoryStats {
  totalEntries: number;
  correctEntries: number;
  incorrectEntries: number;
  accuracy: number;
  categoriesAnswered: number;
  firstAnswer: Date | null;
  lastAnswer: Date | null;
}

export function History({ onBack }: HistoryProps) {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  const [isLoading, setIsLoading] = useState(true);
  const [historyData, setHistoryData] = useState<DetailedHistoryEntry[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCorrectOnly, setShowCorrectOnly] = useState(false);
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);

  const itemsPerPage = 20;

  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('language') || 'ja');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 定期的に言語設定をチェック
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

  const t = {
    ja: {
      pageTitle: '📝 解答履歴',
      backToMenu: '← メインメニューに戻る',
      loading: '解答履歴を読み込み中...',
      stats: {
        title: '📊 履歴統計',
        totalAnswers: '総回答数',
        correctAnswers: '正解数',
        incorrectAnswers: '不正解数',
        accuracy: '正答率',
        categories: 'カテゴリ数',
        firstAnswer: '初回回答',
        lastAnswer: '最新回答'
      },
      filters: {
        title: '🔍 フィルター・検索',
        category: 'カテゴリ',
        allCategories: '全カテゴリ',
        date: '日付',
        searchProblem: '問題文検索',
        searchPlaceholder: '問題文で検索...',
        resultFilter: '結果フィルタ',
        correctOnly: '正解のみ',
        incorrectOnly: '不正解のみ',
        actions: '操作',
        clearAll: '🗑️ 全履歴削除'
      },
      history: {
        title: '📋 履歴一覧',
        itemCount: '件',
        correct: '✅ 正解',
        incorrect: '❌ 不正解',
        yourAnswer: 'あなたの回答',
        trueAnswer: '○ (正しい)',
        falseAnswer: '× (間違い)',
        choice: '選択肢',
        delete: '削除',
        loadMore: 'もっと読み込む',
        noHistory: '解答履歴がありません',
        noMatchingHistory: '条件に一致する履歴がありません',
        problemNotFound: '問題が見つかりません'
      },
      confirmations: {
        deleteEntry: 'この履歴エントリを削除しますか？',
        clearAllHistory: '⚠️ 全ての解答履歴を削除しますか？\n\nこの操作は元に戻せません。'
      },
      errors: {
        loadHistory: '履歴データの読み込みエラー:',
        loadStats: '履歴統計の読み込みエラー:',
        deleteHistory: '履歴削除エラー:',
        deleteHistoryAlert: '履歴の削除に失敗しました',
        clearHistory: '履歴クリアエラー:',
        clearHistoryAlert: '履歴のクリアに失敗しました'
      }
    },
    en: {
      pageTitle: '📝 Answer History',
      backToMenu: '← Back to Main Menu',
      loading: 'Loading answer history...',
      stats: {
        title: '📊 History Statistics',
        totalAnswers: 'Total Answers',
        correctAnswers: 'Correct',
        incorrectAnswers: 'Incorrect',
        accuracy: 'Accuracy Rate',
        categories: 'Categories',
        firstAnswer: 'First Answer',
        lastAnswer: 'Latest Answer'
      },
      filters: {
        title: '🔍 Filter & Search',
        category: 'Category',
        allCategories: 'All Categories',
        date: 'Date',
        searchProblem: 'Search Problem',
        searchPlaceholder: 'Search by problem text...',
        resultFilter: 'Result Filter',
        correctOnly: 'Correct Only',
        incorrectOnly: 'Incorrect Only',
        actions: 'Actions',
        clearAll: '🗑️ Clear All History'
      },
      history: {
        title: '📋 History List',
        itemCount: 'items',
        correct: '✅ Correct',
        incorrect: '❌ Incorrect',
        yourAnswer: 'Your Answer',
        trueAnswer: '○ (True)',
        falseAnswer: '× (False)',
        choice: 'Choice',
        delete: 'Delete',
        loadMore: 'Load More',
        noHistory: 'No answer history available',
        noMatchingHistory: 'No history matches the criteria',
        problemNotFound: 'Problem not found'
      },
      confirmations: {
        deleteEntry: 'Are you sure you want to delete this history entry?',
        clearAllHistory: '⚠️ Delete all answer history?\n\nThis action cannot be undone.'
      },
      errors: {
        loadHistory: 'History data loading error:',
        loadStats: 'History statistics loading error:',
        deleteHistory: 'History deletion error:',
        deleteHistoryAlert: 'Failed to delete history',
        clearHistory: 'History clear error:',
        clearHistoryAlert: 'Failed to clear history'
      }
    }
  };

  const currentLang = language as keyof typeof t;

  useEffect(() => {
    loadHistoryData();
    loadHistoryStats();
  }, []);

  const loadHistoryData = async (page: number = 0, reset: boolean = true) => {
    try {
      const newData = await historyService.getDetailedHistory(itemsPerPage, page * itemsPerPage);
      setHistoryData(prev => reset ? newData : [...prev, ...newData]);
      setHasMore(newData.length === itemsPerPage);
      setCurrentPage(page);
    } catch (error) {
      console.error(t[currentLang].errors.loadHistory, error);
    } finally {
      if (reset) setIsLoading(false);
    }
  };

  const loadHistoryStats = async () => {
    try {
      const stats = await historyService.getHistoryStats();
      setHistoryStats(stats);
    } catch (error) {
      console.error(t[currentLang].errors.loadStats, error);
    }
  };

  const loadMore = () => {
    loadHistoryData(currentPage + 1, false);
  };

  const deleteEntry = async (id: number) => {
    if (!confirm(t[currentLang].confirmations.deleteEntry)) return;
    
    try {
      await historyService.deleteHistoryEntry(id);
      setHistoryData(prev => prev.filter(item => item.entry.id !== id));
      await loadHistoryStats(); // 統計を更新
    } catch (error) {
      console.error(t[currentLang].errors.deleteHistory, error);
      alert(t[currentLang].errors.deleteHistoryAlert);
    }
  };

  const clearAllHistory = async () => {
    if (!confirm(t[currentLang].confirmations.clearAllHistory)) return;
    
    try {
      await historyService.clear();
      setHistoryData([]);
      setHistoryStats(null);
      await loadHistoryStats();
    } catch (error) {
      console.error(t[currentLang].errors.clearHistory, error);
      alert(t[currentLang].errors.clearHistoryAlert);
    }
  };

  const formatDate = (date: Date): string => {
    const locale = currentLang === 'ja' ? 'ja-JP' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatAccuracy = (accuracy: number): string => {
    return `${accuracy.toFixed(1)}%`;
  };

  const getFilteredData = (): DetailedHistoryEntry[] => {
    return historyData.filter(item => {
      const matchesCategory = !selectedCategory || item.entry.category === selectedCategory;
      const matchesDate = !selectedDate || item.entry.timestamp.toISOString().split('T')[0] === selectedDate;
      const matchesSearch = !searchTerm || 
        item.entry.questionText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.problem?.question.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCorrect = !showCorrectOnly || item.entry.isCorrect;
      const matchesIncorrect = !showIncorrectOnly || !item.entry.isCorrect;
      
      return matchesCategory && matchesDate && matchesSearch && matchesCorrect && matchesIncorrect;
    });
  };

  const getCategories = (): string[] => {
    const categories = new Set(historyData.map(item => item.entry.category));
    return Array.from(categories).sort();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="quiz-action-button mb-4 px-4 py-2 rounded-lg transition-colors"
          >
            {t[currentLang].backToMenu}
          </button>
          <h1 className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">{t[currentLang].pageTitle}</h1>
        </header>

        {/* 統計情報 */}
        {historyStats && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">{t[currentLang].stats.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{historyStats.totalEntries}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{t[currentLang].stats.totalAnswers}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{historyStats.correctEntries}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{t[currentLang].stats.correctAnswers}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{historyStats.incorrectEntries}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{t[currentLang].stats.incorrectAnswers}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatAccuracy(historyStats.accuracy)}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{t[currentLang].stats.accuracy}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{historyStats.categoriesAnswered}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{t[currentLang].stats.categories}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {historyStats.firstAnswer ? formatDate(historyStats.firstAnswer).split(' ')[0] : '-'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{t[currentLang].stats.firstAnswer}</div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {historyStats.lastAnswer ? formatDate(historyStats.lastAnswer).split(' ')[0] : '-'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{t[currentLang].stats.lastAnswer}</div>
              </div>
            </div>
          </div>
        )}

        {/* フィルター */}
        <div className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">{t[currentLang].filters.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t[currentLang].filters.category}</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">{t[currentLang].filters.allCategories}</option>
                {getCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t[currentLang].filters.date}</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t[currentLang].filters.searchProblem}</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t[currentLang].filters.searchPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t[currentLang].filters.resultFilter}</label>
              <div className="space-y-1">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={showCorrectOnly}
                    onChange={(e) => {
                      setShowCorrectOnly(e.target.checked);
                      if (e.target.checked) setShowIncorrectOnly(false);
                    }}
                    className="mr-2"
                  />
                  {t[currentLang].filters.correctOnly}
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={showIncorrectOnly}
                    onChange={(e) => {
                      setShowIncorrectOnly(e.target.checked);
                      if (e.target.checked) setShowCorrectOnly(false);
                    }}
                    className="mr-2"
                  />
                  {t[currentLang].filters.incorrectOnly}
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t[currentLang].filters.actions}</label>
              <button
                onClick={clearAllHistory}
                className="w-full px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
              >
                {t[currentLang].filters.clearAll}
              </button>
            </div>
          </div>
        </div>

        {/* 履歴一覧 */}
        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t[currentLang].history.title}</h2>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {filteredData.length}{t[currentLang].history.itemCount} / {historyData.length}{t[currentLang].history.itemCount}
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {historyData.length === 0 ? t[currentLang].history.noHistory : t[currentLang].history.noMatchingHistory}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((item) => (
                <div key={item.entry.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.entry.isCorrect 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {item.entry.isCorrect ? t[currentLang].history.correct : t[currentLang].history.incorrect}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                          {item.entry.category}
                        </span>
                        {item.quizSet && (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                            📖 {item.quizSet.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(item.entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-white mb-2">
                        {item.problem?.question || item.entry.questionText || t[currentLang].history.problemNotFound}
                      </p>
                      {item.entry.userAnswer !== undefined && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {t[currentLang].history.yourAnswer}: {
                            typeof item.entry.userAnswer === 'boolean' 
                              ? (item.entry.userAnswer ? t[currentLang].history.trueAnswer : t[currentLang].history.falseAnswer)
                              : `${t[currentLang].history.choice} ${item.entry.userAnswer + 1}`
                          }
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => item.entry.id && deleteEntry(item.entry.id)}
                      className="ml-4 px-2 py-1 text-red-500 hover:text-red-700 text-sm"
                    >
                      {t[currentLang].history.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* もっと読み込む */}
          {hasMore && filteredData.length === historyData.length && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                className="quiz-action-button px-6 py-2 rounded-lg transition-colors"
              >
                {t[currentLang].history.loadMore}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}