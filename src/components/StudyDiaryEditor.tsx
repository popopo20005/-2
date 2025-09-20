import { useState, useEffect } from 'react';
import { studyDiaryService, quizSessionService } from '../lib/database';
import type { StudyDiaryEntry, QuizSession } from '../types';

interface StudyDiaryEditorProps {
  diaryId?: number;
  initialDate?: string;
  onSave: (entry: StudyDiaryEntry) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

const getMoodOptions = (language: 'ja' | 'en') => [
  { value: 'excellent', label: language === 'ja' ? '最高' : 'Excellent', emoji: '🤩', color: 'text-green-600 dark:text-green-400' },
  { value: 'good', label: language === 'ja' ? '良い' : 'Good', emoji: '😊', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'okay', label: language === 'ja' ? '普通' : 'Okay', emoji: '😐', color: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'challenging', label: language === 'ja' ? '大変' : 'Challenging', emoji: '😰', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'difficult', label: language === 'ja' ? '困難' : 'Difficult', emoji: '😣', color: 'text-red-600 dark:text-red-400' },
] as const;

export function StudyDiaryEditor({ diaryId, initialDate, onSave, onCancel, language = 'ja' }: StudyDiaryEditorProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      backButton: '← 戻る',
      cancelButton: 'キャンセル',
      saveButton: '保存',
      savingButton: '保存中...',
      editTitle: '日記を編集',
      newTitle: '新しい日記',
      loading: '読み込み中...',
      dateLabel: '日付',
      titleLabel: 'タイトル',
      titlePlaceholder: '今日の学習について...',
      moodLabel: '今日の気分',
      studyTimeLabel: '学習時間（分）',
      contentLabel: '内容',
      contentPlaceholder: '今日の学習について詳しく書いてみましょう...',
      topicsLabel: '📚 学習トピック',
      topicPlaceholder: '新しいトピックを追加...',
      achievementsLabel: '🎉 達成したこと',
      achievementPlaceholder: '達成したことを追加...',
      challengesLabel: '🤔 課題・困ったこと',
      challengePlaceholder: '課題や困ったことを追加...',
      goalsLabel: '🎯 明日の目標',
      goalPlaceholder: '明日の目標を追加...',
      addButton: '追加',
      sessionsLabel: '🎯 この日のクイズセッション',
      sessionDescription: 'この日に完了したクイズセッションを日記に関連付けることができます。',
      completed: '完了',
      required: '*',
      validationError: 'タイトルと内容を入力してください',
      saveError: '保存に失敗しました',
      loadError: '日記エントリの読み込みエラー:',
      sessionLoadError: 'クイズセッションの読み込みエラー:',
      accuracy: '正答率',
      questions: '問'
    },
    en: {
      backButton: '← Back',
      cancelButton: 'Cancel',
      saveButton: 'Save',
      savingButton: 'Saving...',
      editTitle: 'Edit Diary',
      newTitle: 'New Diary Entry',
      loading: 'Loading...',
      dateLabel: 'Date',
      titleLabel: 'Title',
      titlePlaceholder: 'About today\'s learning...',
      moodLabel: 'Today\'s Mood',
      studyTimeLabel: 'Study Time (minutes)',
      contentLabel: 'Content',
      contentPlaceholder: 'Write about today\'s learning in detail...',
      topicsLabel: '📚 Study Topics',
      topicPlaceholder: 'Add a new topic...',
      achievementsLabel: '🎉 Achievements',
      achievementPlaceholder: 'Add an achievement...',
      challengesLabel: '🤔 Challenges & Difficulties',
      challengePlaceholder: 'Add challenges or difficulties...',
      goalsLabel: '🎯 Tomorrow\'s Goals',
      goalPlaceholder: 'Add tomorrow\'s goals...',
      addButton: 'Add',
      sessionsLabel: '🎯 Quiz Sessions for This Day',
      sessionDescription: 'You can link quiz sessions completed on this day to your diary entry.',
      completed: 'Completed',
      required: '*',
      validationError: 'Please enter both title and content',
      saveError: 'Failed to save',
      loadError: 'Error loading diary entry:',
      sessionLoadError: 'Error loading quiz sessions:',
      accuracy: 'Accuracy',
      questions: ' questions'
    }
  };

  const currentLang = language as keyof typeof t;
  const MOOD_OPTIONS = getMoodOptions(language);
  const [isLoading, setIsLoading] = useState(false);
  const [entry, setEntry] = useState<StudyDiaryEntry>({
    date: initialDate || new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    mood: 'okay',
    studyTime: undefined,
    topics: [],
    achievements: [],
    challenges: [],
    goals: [],
    createdAt: new Date()
  });

  const [newTopic, setNewTopic] = useState('');
  const [newAchievement, setNewAchievement] = useState('');
  const [newChallenge, setNewChallenge] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [availableSessions, setAvailableSessions] = useState<QuizSession[]>([]);

  useEffect(() => {
    if (diaryId) {
      loadEntry();
    }
    loadAvailableSessions();
  }, [diaryId, entry.date]);

  const loadEntry = async () => {
    if (!diaryId) return;
    
    setIsLoading(true);
    try {
      const existingEntry = await studyDiaryService.getById(diaryId);
      if (existingEntry) {
        setEntry(existingEntry);
      }
    } catch (error) {
      console.error(t[currentLang].loadError, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!entry.title.trim() || !entry.content.trim()) {
      alert(t[currentLang].validationError);
      return;
    }

    setIsLoading(true);
    try {
      let savedEntry: StudyDiaryEntry;
      
      if (diaryId) {
        await studyDiaryService.update(diaryId, entry);
        savedEntry = { ...entry, id: diaryId };
      } else {
        const newId = await studyDiaryService.create(entry);
        savedEntry = { ...entry, id: newId };
      }
      
      onSave(savedEntry);
    } catch (error) {
      console.error(t[currentLang].saveError + ':', error);
      alert(t[currentLang].saveError);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSessions = async () => {
    try {
      const sessions = await quizSessionService.getAll();
      const completedSessions = sessions.filter((session: any) =>
        session.isCompleted &&
        new Date(session.completedAt!).toDateString() === new Date(entry.date).toDateString()
      );
      setAvailableSessions(completedSessions);
    } catch (error) {
      console.error(t[currentLang].sessionLoadError, error);
    }
  };

  const addToList = (
    newItem: string,
    setNewItem: (value: string) => void,
    listKey: 'topics' | 'achievements' | 'challenges' | 'goals'
  ) => {
    if (newItem.trim()) {
      setEntry(prev => ({
        ...prev,
        [listKey]: [...prev[listKey], newItem.trim()]
      }));
      setNewItem('');
    }
  };

  const removeFromList = (
    index: number,
    listKey: 'topics' | 'achievements' | 'challenges' | 'goals'
  ) => {
    setEntry(prev => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, i) => i !== index)
    }));
  };

  const toggleSessionLink = (sessionId: string) => {
    setEntry(prev => ({
      ...prev,
      quizSessionIds: prev.quizSessionIds?.includes(sessionId)
        ? prev.quizSessionIds.filter(id => id !== sessionId)
        : [...(prev.quizSessionIds || []), sessionId]
    }));
  };

  const formatSessionSummary = (session: QuizSession): string => {
    const accuracy = session.problems.length > 0 ? Math.round((session.score / session.problems.length) * 100) : 0;
    return `${session.problems.length}${t[currentLang].questions} - ${t[currentLang].accuracy} ${accuracy}%`;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onCancel}
              className="quiz-action-button px-4 py-2 rounded-lg transition-colors"
            >
              {t[currentLang].backButton}
            </button>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t[currentLang].cancelButton}
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? t[currentLang].savingButton : t[currentLang].saveButton}
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            📝 {diaryId ? t[currentLang].editTitle : t[currentLang].newTitle}
          </h1>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          {/* 日付とタイトル */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[currentLang].dateLabel}
              </label>
              <input
                type="date"
                value={entry.date}
                onChange={(e) => setEntry(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[currentLang].titleLabel} <span className="text-red-500">{t[currentLang].required}</span>
              </label>
              <input
                type="text"
                value={entry.title}
                onChange={(e) => setEntry(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t[currentLang].titlePlaceholder}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* 気分と学習時間 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[currentLang].moodLabel}
              </label>
              <select
                value={entry.mood}
                onChange={(e) => setEntry(prev => ({ ...prev, mood: e.target.value as StudyDiaryEntry['mood'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                {MOOD_OPTIONS.map(mood => (
                  <option key={mood.value} value={mood.value}>
                    {mood.emoji} {mood.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[currentLang].studyTimeLabel}
              </label>
              <input
                type="number"
                value={entry.studyTime || ''}
                onChange={(e) => setEntry(prev => ({ ...prev, studyTime: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="60"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t[currentLang].contentLabel} <span className="text-red-500">{t[currentLang].required}</span>
            </label>
            <textarea
              value={entry.content}
              onChange={(e) => setEntry(prev => ({ ...prev, content: e.target.value }))}
              placeholder={t[currentLang].contentPlaceholder}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 学習トピック */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t[currentLang].topicsLabel}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder={t[currentLang].topicPlaceholder}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && addToList(newTopic, setNewTopic, 'topics')}
              />
              <button
                type="button"
                onClick={() => addToList(newTopic, setNewTopic, 'topics')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t[currentLang].addButton}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.topics.map((topic, index) => (
                <span key={index} className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm">
                  {topic}
                  <button
                    onClick={() => removeFromList(index, 'topics')}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 達成したこと */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t[currentLang].achievementsLabel}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                placeholder={t[currentLang].achievementPlaceholder}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && addToList(newAchievement, setNewAchievement, 'achievements')}
              />
              <button
                type="button"
                onClick={() => addToList(newAchievement, setNewAchievement, 'achievements')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t[currentLang].addButton}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.achievements.map((achievement, index) => (
                <span key={index} className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-sm">
                  {achievement}
                  <button
                    onClick={() => removeFromList(index, 'achievements')}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 課題・困ったこと */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t[currentLang].challengesLabel}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newChallenge}
                onChange={(e) => setNewChallenge(e.target.value)}
                placeholder={t[currentLang].challengePlaceholder}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && addToList(newChallenge, setNewChallenge, 'challenges')}
              />
              <button
                type="button"
                onClick={() => addToList(newChallenge, setNewChallenge, 'challenges')}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                {t[currentLang].addButton}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.challenges.map((challenge, index) => (
                <span key={index} className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full text-sm">
                  {challenge}
                  <button
                    onClick={() => removeFromList(index, 'challenges')}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 明日の目標 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t[currentLang].goalsLabel}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder={t[currentLang].goalPlaceholder}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && addToList(newGoal, setNewGoal, 'goals')}
              />
              <button
                type="button"
                onClick={() => addToList(newGoal, setNewGoal, 'goals')}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {t[currentLang].addButton}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.goals.map((goal, index) => (
                <span key={index} className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-sm">
                  {goal}
                  <button
                    onClick={() => removeFromList(index, 'goals')}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* クイズセッション連携 */}
          {availableSessions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t[currentLang].sessionsLabel}
              </label>
              <div className="space-y-2">
                {availableSessions.map((session) => (
                  <label key={session.id} className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entry.quizSessionIds?.includes(session.id) || false}
                      onChange={() => toggleSessionLink(session.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatSessionSummary(session)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(session.completedAt!).toLocaleTimeString(language === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' })} {t[currentLang].completed}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t[currentLang].sessionDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}