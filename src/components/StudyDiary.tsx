import { useState, useEffect } from 'react';
import { studyDiaryService, quizSessionService } from '../lib/database';
import { StudyDiaryEditor } from './StudyDiaryEditor';
import type { StudyDiaryEntry, QuizSession } from '../types';

interface StudyDiaryProps {
  onBack: () => void;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

const getMoodOptions = (language: 'ja' | 'en') => ({
  'excellent': {
    label: language === 'ja' ? '最高' : 'Excellent',
    emoji: '🤩',
    color: 'text-green-600 dark:text-green-400'
  },
  'good': {
    label: language === 'ja' ? '良い' : 'Good',
    emoji: '😊',
    color: 'text-blue-600 dark:text-blue-400'
  },
  'okay': {
    label: language === 'ja' ? '普通' : 'Okay',
    emoji: '😐',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  'challenging': {
    label: language === 'ja' ? '大変' : 'Challenging',
    emoji: '😰',
    color: 'text-orange-600 dark:text-orange-400'
  },
  'difficult': {
    label: language === 'ja' ? '困難' : 'Difficult',
    emoji: '😣',
    color: 'text-red-600 dark:text-red-400'
  },
});

export function StudyDiary({ onBack, isDarkMode = false, language = 'ja' }: StudyDiaryProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      title: '📖 学習日記',
      subtitle: '学習の記録と振り返りを管理しましょう',
      backButton: '← メインメニューに戻る',
      newEntryButton: '✏️ 新しい日記を書く',
      loading: '日記を読み込み中...',
      searchLabel: '検索',
      searchPlaceholder: 'タイトル、内容、トピックで検索...',
      periodLabel: '期間',
      periodAll: 'すべて',
      periodWeek: '過去1週間',
      periodMonth: '過去1ヶ月',
      entriesFound: '件の日記が見つかりました',
      editButton: '編集',
      deleteButton: '削除',
      deleteConfirm: 'この日記を削除しますか？',
      deleteError: '削除に失敗しました',
      studyTopics: '📚 学習トピック',
      achievements: '🎉 達成したこと',
      challenges: '🤔 課題・困ったこと',
      goals: '🎯 明日の目標',
      relatedSessions: '🎯 関連するクイズセッション',
      questionsQuiz: '問のクイズ',
      accuracy: '正答率',
      questionsCorrect: '問正解',
      noEntries: 'まだ日記がありません',
      noEntriesDesc: '最初の学習日記を書いて、学習の記録を始めましょう！',
      sessionLoadError: 'セッション',
      loadingError: '日記の読み込みエラー:',
      hours: '時間',
      minutes: '分'
    },
    en: {
      title: '📖 Study Diary',
      subtitle: 'Manage your learning records and reflections',
      backButton: '← Back to Main Menu',
      newEntryButton: '✏️ Write New Entry',
      loading: 'Loading diary entries...',
      searchLabel: 'Search',
      searchPlaceholder: 'Search by title, content, or topics...',
      periodLabel: 'Period',
      periodAll: 'All',
      periodWeek: 'Past Week',
      periodMonth: 'Past Month',
      entriesFound: ' entries found',
      editButton: 'Edit',
      deleteButton: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this entry?',
      deleteError: 'Failed to delete entry',
      studyTopics: '📚 Study Topics',
      achievements: '🎉 Achievements',
      challenges: '🤔 Challenges & Difficulties',
      goals: '🎯 Tomorrow\'s Goals',
      relatedSessions: '🎯 Related Quiz Sessions',
      questionsQuiz: ' question quiz',
      accuracy: 'Accuracy',
      questionsCorrect: ' correct',
      noEntries: 'No diary entries yet',
      noEntriesDesc: 'Write your first study diary entry to start recording your learning journey!',
      sessionLoadError: 'Session',
      loadingError: 'Error loading diary entries:',
      hours: 'h',
      minutes: 'm'
    }
  };

  const currentLang = language as keyof typeof t;
  const MOOD_OPTIONS = getMoodOptions(language);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<StudyDiaryEntry[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'editor'>('list');
  const [editingEntry, setEditingEntry] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'week' | 'month'>('all');
  const [linkedSessions, setLinkedSessions] = useState<Record<string, QuizSession>>({});

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const allEntries = await studyDiaryService.getAll();
      setEntries(allEntries);
      
      // Load linked quiz sessions
      const allSessionIds = allEntries.flatMap(entry => entry.quizSessionIds || []);
      const uniqueSessionIds = [...new Set(allSessionIds)];
      
      const sessionsMap: Record<string, QuizSession> = {};
      for (const sessionId of uniqueSessionIds) {
        try {
          const session = await quizSessionService.getById(sessionId);
          if (session) {
            sessionsMap[sessionId] = session;
          }
        } catch (error) {
          console.warn(`${t[currentLang].sessionLoadError} ${sessionId} の読み込みに失敗:`, error);
        }
      }
      setLinkedSessions(sessionsMap);
    } catch (error) {
      console.error(t[currentLang].loadingError, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewEntry = () => {
    setEditingEntry(undefined);
    setCurrentView('editor');
  };

  const handleEditEntry = (id: number) => {
    setEditingEntry(id);
    setCurrentView('editor');
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm(t[currentLang].deleteConfirm)) return;
    
    try {
      await studyDiaryService.delete(id);
      await loadEntries();
    } catch (error) {
      console.error(t[currentLang].deleteError + ':', error);
      alert(t[currentLang].deleteError);
    }
  };

  const handleSaveEntry = async () => {
    await loadEntries();
    setCurrentView('list');
  };

  const handleCancelEdit = () => {
    setCurrentView('list');
    setEditingEntry(undefined);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatStudyTime = (minutes?: number): string => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}${t[currentLang].minutes}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}${t[currentLang].hours}${remainingMinutes}${t[currentLang].minutes}` : `${hours}${t[currentLang].hours}`;
  };

  const getFilteredEntries = () => {
    let filtered = entries;

    // 日付範囲でフィルタ
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      if (selectedDateRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedDateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      }
      
      filtered = filtered.filter(entry => new Date(entry.date) >= startDate);
    }

    // 検索クエリでフィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        entry.topics.some(topic => topic.toLowerCase().includes(query)) ||
        entry.achievements.some(achievement => achievement.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  if (currentView === 'editor') {
    return (
      <StudyDiaryEditor
        diaryId={editingEntry}
        onSave={handleSaveEntry}
        onCancel={handleCancelEdit}
        isDarkMode={isDarkMode}
        language={language}
      />
    );
  }

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

  const filteredEntries = getFilteredEntries();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="quiz-action-button px-4 py-2 rounded-lg transition-colors"
            >
              {t[currentLang].backButton}
            </button>
            <button
              onClick={handleNewEntry}
              className="quiz-action-button px-4 py-2 rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t[currentLang].newEntryButton}
            </button>
          </div>
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
            {t[currentLang].title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t[currentLang].subtitle}
          </p>
        </header>

        {/* フィルターとサーチ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[currentLang].searchLabel}
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t[currentLang].searchPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[currentLang].periodLabel}
              </label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value as 'all' | 'week' | 'month')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="all">{t[currentLang].periodAll}</option>
                <option value="week">{t[currentLang].periodWeek}</option>
                <option value="month">{t[currentLang].periodMonth}</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {filteredEntries.length}{t[currentLang].entriesFound}
              </div>
            </div>
          </div>
        </div>

        {/* 日記一覧 */}
        {filteredEntries.length > 0 ? (
          <div className="space-y-6">
            {filteredEntries.map((entry) => {
              const mood = MOOD_OPTIONS[entry.mood || 'okay'];
              
              return (
                <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-2xl ${mood.color}`}>
                          {mood.emoji}
                        </span>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {entry.title}
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(entry.date)}
                            {entry.studyTime && (
                              <span className="ml-2">• ⏱️ {formatStudyTime(entry.studyTime)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditEntry(entry.id!)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        {t[currentLang].editButton}
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id!)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        {t[currentLang].deleteButton}
                      </button>
                    </div>
                  </div>

                  <div className="prose dark:prose-invert max-w-none mb-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>

                  {/* タグ表示 */}
                  <div className="space-y-3">
                    {entry.topics.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t[currentLang].studyTopics}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {entry.topics.map((topic, index) => (
                            <span key={index} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.achievements.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t[currentLang].achievements}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {entry.achievements.map((achievement, index) => (
                            <span key={index} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-sm">
                              {achievement}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.challenges.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t[currentLang].challenges}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {entry.challenges.map((challenge, index) => (
                            <span key={index} className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full text-sm">
                              {challenge}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.goals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t[currentLang].goals}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {entry.goals.map((goal, index) => (
                            <span key={index} className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-sm">
                              {goal}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* リンクされたクイズセッション */}
                    {entry.quizSessionIds && entry.quizSessionIds.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t[currentLang].relatedSessions}
                        </h4>
                        <div className="space-y-2">
                          {entry.quizSessionIds.map((sessionId) => {
                            const session = linkedSessions[sessionId];
                            if (!session) return null;
                            
                            const accuracy = session.problems.length > 0 ? Math.round((session.score / session.problems.length) * 100) : 0;
                            return (
                              <div key={sessionId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {session.problems.length}{t[currentLang].questionsQuiz}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      {t[currentLang].accuracy}: {accuracy}% ({session.score}/{session.problems.length}{t[currentLang].questionsCorrect})
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(session.completedAt!).toLocaleTimeString(language === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t[currentLang].noEntries}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t[currentLang].noEntriesDesc}
            </p>
            <button
              onClick={handleNewEntry}
              className="quiz-action-button px-6 py-3 rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t[currentLang].newEntryButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}