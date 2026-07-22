import { useState, useEffect } from 'react';
import { historyService } from '../lib/database';
import type { Problem, QuizSet, HistoryEntry } from '../types';
import { HistoryDetailModal } from './HistoryDetailModal';
import { StudyCalendar } from './StudyCalendar';
import { List, Calendar } from 'lucide-react';

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

  // 表示モード: 'timeline' (デフォルト) または 'calendar'
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');

  // 詳細モーダル
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<DetailedHistoryEntry | null>(null);

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
      pageTitle: '解答履歴',
      backToMenu: '← メインメニューに戻る',
      loading: '解答履歴を読み込み中...',
      stats: {
        title: '履歴統計',
        totalAnswers: '総回答数',
        correctAnswers: '正解数',
        incorrectAnswers: '不正解数',
        accuracy: '正答率',
        categories: 'カテゴリ数',
        firstAnswer: '初回回答',
        lastAnswer: '最新回答'
      },
      viewMode: {
        timeline: 'タイムライン表示',
        calendar: 'カレンダー表示'
      },
      filters: {
        title: 'フィルター・検索',
        category: 'カテゴリ',
        allCategories: '全カテゴリ',
        date: '日付',
        searchProblem: '問題文検索',
        searchPlaceholder: '問題文で検索...',
        resultFilter: '結果フィルタ',
        correctOnly: '正解のみ',
        incorrectOnly: '不正解のみ',
        actions: '操作',
        clearAll: '全履歴削除'
      },
      history: {
        title: '履歴一覧',
        itemCount: '件',
        correct: '正解',
        incorrect: '不正解',
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
      pageTitle: 'Answer History',
      backToMenu: '← Back to Main Menu',
      loading: 'Loading answer history...',
      stats: {
        title: 'History Statistics',
        totalAnswers: 'Total Answers',
        correctAnswers: 'Correct',
        incorrectAnswers: 'Incorrect',
        accuracy: 'Accuracy Rate',
        categories: 'Categories',
        firstAnswer: 'First Answer',
        lastAnswer: 'Latest Answer'
      },
      viewMode: {
        timeline: 'Timeline View',
        calendar: 'Calendar View'
      },
      filters: {
        title: 'Filter & Search',
        category: 'Category',
        allCategories: 'All Categories',
        date: 'Date',
        searchProblem: 'Search Problem',
        searchPlaceholder: 'Search by problem text...',
        resultFilter: 'Result Filter',
        correctOnly: 'Correct Only',
        incorrectOnly: 'Incorrect Only',
        actions: 'Actions',
        clearAll: 'Clear All History'
      },
      history: {
        title: 'History List',
        itemCount: 'items',
        correct: 'Correct',
        incorrect: 'Incorrect',
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1] mx-auto mb-4"></div>
          <p className="text-[#CBD5E1]">{t[currentLang].loading}</p>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  // Render history component with timeline/calendar view toggle
  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: '#0F172A' }}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 rounded-lg text-[#818CF8] hover:bg-white/5 transition-colors text-sm font-medium"
          >
            {t[currentLang].backToMenu}
          </button>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-[#F8FAFC]">{t[currentLang].pageTitle}</h1>

            {/* 表示モード切り替えボタン */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-[#6366F1] text-white shadow-md'
                    : 'text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-white/5'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">{t[currentLang].viewMode.timeline}</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-[#6366F1] text-white shadow-md'
                    : 'text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-white/5'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">{t[currentLang].viewMode.calendar}</span>
              </button>
            </div>
          </div>
        </header>

        {/* 統計情報 */}
        {historyStats && (
          <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(30,41,59,0.7)' }}>
            <h2 className="text-xl font-semibold text-[#F8FAFC] mb-4">{t[currentLang].stats.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center rounded-xl border border-white/10 p-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
                <div className="text-lg font-bold text-[#818CF8]">{historyStats.totalEntries}</div>
                <div className="text-xs text-[#94A3B8]">{t[currentLang].stats.totalAnswers}</div>
              </div>
              <div className="text-center rounded-xl border border-white/10 p-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
                <div className="text-lg font-bold text-[#34D399]">{historyStats.correctEntries}</div>
                <div className="text-xs text-[#94A3B8]">{t[currentLang].stats.correctAnswers}</div>
              </div>
              <div className="text-center rounded-xl border border-white/10 p-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
                <div className="text-lg font-bold text-[#EF4444]">{historyStats.incorrectEntries}</div>
                <div className="text-xs text-[#94A3B8]">{t[currentLang].stats.incorrectAnswers}</div>
              </div>
              <div className="text-center rounded-xl border border-white/10 p-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
                <div className="text-lg font-bold text-[#A78BFA]">{formatAccuracy(historyStats.accuracy)}</div>
                <div className="text-xs text-[#94A3B8]">{t[currentLang].stats.accuracy}</div>
              </div>
              <div className="text-center rounded-xl border border-white/10 p-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
                <div className="text-lg font-bold text-[#FB923C]">{historyStats.categoriesAnswered}</div>
                <div className="text-xs text-[#94A3B8]">{t[currentLang].stats.categories}</div>
              </div>
              <div className="text-center rounded-xl border border-white/10 p-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
                <div className="text-sm font-bold text-[#818CF8]">
                  {historyStats.firstAnswer ? formatDate(historyStats.firstAnswer).split(' ')[0] : '-'}
                </div>
                <div className="text-xs text-[#94A3B8]">{t[currentLang].stats.firstAnswer}</div>
              </div>
              <div className="text-center rounded-xl border border-white/10 p-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
                <div className="text-sm font-bold text-[#34D399]">
                  {historyStats.lastAnswer ? formatDate(historyStats.lastAnswer).split(' ')[0] : '-'}
                </div>
                <div className="text-xs text-[#94A3B8]">{t[currentLang].stats.lastAnswer}</div>
              </div>
            </div>
          </div>
        )}

        {/* 表示モードに応じたコンテンツ */}
        {viewMode === 'calendar' ? (
          /* カレンダー表示 */
          <StudyCalendar language={currentLang} />
        ) : (
          /* タイムライン表示（既存の履歴機能） */
          <>
            {/* フィルター */}
            <div className="mb-6 rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(30,41,59,0.7)' }}>
              <h2 className="text-xl font-semibold text-[#F8FAFC] mb-4">{t[currentLang].filters.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{t[currentLang].filters.category}</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    style={{ background: 'rgba(15,23,42,0.5)' }}
                  >
                    <option value="">{t[currentLang].filters.allCategories}</option>
                    {getCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{t[currentLang].filters.date}</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    style={{ background: 'rgba(15,23,42,0.5)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{t[currentLang].filters.searchProblem}</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t[currentLang].filters.searchPlaceholder}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-[#F8FAFC] text-sm placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    style={{ background: 'rgba(15,23,42,0.5)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{t[currentLang].filters.resultFilter}</label>
                  <div className="space-y-1">
                    <label className="flex items-center text-sm text-[#CBD5E1] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showCorrectOnly}
                        onChange={(e) => {
                          setShowCorrectOnly(e.target.checked);
                          if (e.target.checked) setShowIncorrectOnly(false);
                        }}
                        className="mr-2 accent-[#6366F1]"
                      />
                      {t[currentLang].filters.correctOnly}
                    </label>
                    <label className="flex items-center text-sm text-[#CBD5E1] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showIncorrectOnly}
                        onChange={(e) => {
                          setShowIncorrectOnly(e.target.checked);
                          if (e.target.checked) setShowCorrectOnly(false);
                        }}
                        className="mr-2 accent-[#6366F1]"
                      />
                      {t[currentLang].filters.incorrectOnly}
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{t[currentLang].filters.actions}</label>
                  <button
                    onClick={clearAllHistory}
                    className="w-full px-3 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] transition-colors text-sm font-medium"
                  >
                    {t[currentLang].filters.clearAll}
                  </button>
                </div>
              </div>
            </div>

            {/* 履歴一覧 */}
            <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(30,41,59,0.7)' }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#F8FAFC]">{t[currentLang].history.title}</h2>
                <div className="text-sm text-[#94A3B8]">
                  {filteredData.length}{t[currentLang].history.itemCount} / {historyData.length}{t[currentLang].history.itemCount}
                </div>
              </div>

              {filteredData.length === 0 ? (
                <div className="text-center py-8 text-[#64748B]">
                  {historyData.length === 0 ? t[currentLang].history.noHistory : t[currentLang].history.noMatchingHistory}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredData.map((item) => (
                    <div
                      key={item.entry.id}
                      className="rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ background: 'rgba(15,23,42,0.5)' }}
                      onClick={() => {
                        setSelectedHistoryEntry(item);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.entry.isCorrect
                                ? 'bg-[#10B981]/20 text-[#34D399]'
                                : 'bg-[#EF4444]/20 text-[#EF4444]'
                            }`}>
                              {item.entry.isCorrect ? t[currentLang].history.correct : t[currentLang].history.incorrect}
                            </span>
                            <span className="px-2 py-1 bg-white/10 text-[#CBD5E1] rounded text-xs">
                              {item.entry.category}
                            </span>
                            {item.quizSet && (
                              <span className="px-2 py-1 bg-[#6366F1]/20 text-[#A78BFA] rounded text-xs">
                                {item.quizSet.name}
                              </span>
                            )}
                            <span className="text-xs text-[#64748B]">
                              {formatDate(item.entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-[#F8FAFC] mb-2">
                            {item.problem?.question || item.entry.questionText || t[currentLang].history.problemNotFound}
                          </p>
                          {item.entry.userAnswer !== undefined && (
                            <div className="text-sm text-[#94A3B8]">
                              {t[currentLang].history.yourAnswer}: {
                                typeof item.entry.userAnswer === 'boolean'
                                  ? (item.entry.userAnswer ? t[currentLang].history.trueAnswer : t[currentLang].history.falseAnswer)
                                  : Array.isArray(item.entry.userAnswer)
                                    ? `${t[currentLang].history.choice} ${item.entry.userAnswer.map((v: number) => v + 1).join(', ')}`
                                    : `${t[currentLang].history.choice} ${(item.entry.userAnswer as number) + 1}`
                              }
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            item.entry.id && deleteEntry(item.entry.id);
                          }}
                          className="ml-4 px-2 py-1 text-[#EF4444] hover:bg-[#EF4444]/10 text-sm rounded transition-colors"
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
                    className="px-6 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#5558E6] transition-colors text-sm font-medium"
                  >
                    {t[currentLang].history.loadMore}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* 詳細モーダル */}
        {isDetailModalOpen && selectedHistoryEntry && (
          <HistoryDetailModal
            entry={selectedHistoryEntry.entry}
            problem={selectedHistoryEntry.problem}
            quizSet={selectedHistoryEntry.quizSet}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedHistoryEntry(null);
            }}
            onRetry={(problemId) => {
              console.log('Retry problem:', problemId);
              // TODO: Implement retry logic (single problem mode)
            }}
            onAddToReview={(problemId) => {
              console.log('Add to review:', problemId);
              // TODO: Implement add to review logic
            }}
          />
        )}
      </div>
    </div>
  );
}
