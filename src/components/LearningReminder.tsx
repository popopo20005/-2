import { useState, useEffect } from 'react';
import { analyticsStatisticsService } from '../lib/analyticsStatistics';
import type { LearningPatternAnalysis } from '../lib/analyticsStatistics';

interface ReminderRule {
  id: string;
  name: string;
  type: 'time_based' | 'performance_based' | 'habit_based' | 'adaptive';
  isActive: boolean;
  schedule: {
    days: number[]; // 0-6 (Sunday-Saturday)
    times: string[]; // "HH:MM" format
    frequency: 'daily' | 'weekly' | 'custom';
  };
  conditions: {
    minTimeSinceLastStudy?: number; // hours
    performanceThreshold?: number; // percentage
    streakThreshold?: number; // days
    focusLevelThreshold?: number; // 0-100
  };
  message: {
    title: string;
    body: string;
    actionText: string;
    motivationType: 'encouragement' | 'urgency' | 'achievement' | 'gentle';
  };
  sounds: {
    enabled: boolean;
    soundType: 'chime' | 'bell' | 'notification' | 'custom';
  };
  created: Date;
  lastTriggered?: Date;
}

interface ReminderStats {
  totalReminders: number;
  responseRate: number; // percentage of reminders that led to study
  optimalTimes: string[];
  effectiveMessages: string[];
  averageResponseTime: number; // minutes
}

interface LearningReminderProps {
  onBack?: () => void;
  onStartStudy?: () => void;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

export function LearningReminder({ onBack, language = 'ja' }: LearningReminderProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      title: '🔔 学習リマインダー',
      backButton: '← 戻る',
      loading: 'リマインダー設定を読み込み中...',
      // 通知許可
      enableNotifications: '通知を有効化',
      notificationPermissionDesc: 'リマインダーを受け取るには、ブラウザの通知を許可してください',
      allowPermission: '許可する',
      // タブ
      activeTab: '🏃 アクティブ',
      createTab: '➕ 新規作成',
      statsTab: '📊 統計',
      settingsTab: '⚙️ 設定',
      // リマインダータイプ
      timeBased: '時間ベース',
      performanceBased: 'パフォーマンスベース',
      habitBased: '習慣ベース',
      adaptive: '適応型',
      unknown: '不明',
      // アクション
      test: 'テスト',
      disable: '無効化',
      enable: '有効化',
      delete: '削除',
      // スケジュール
      schedule: 'スケジュール',
      days: '曜日',
      time: '時間',
      message: 'メッセージ',
      conditions: '条件',
      // 曜日
      dayNames: ['日', '月', '火', '水', '木', '金', '土'],
      // 条件
      minTimeSinceLastStudy: '最終学習から{hours}時間以上',
      performanceThreshold: '正答率{threshold}%以下',
      streakThreshold: '連続記録{days}日以上',
      // 空状態
      noActiveReminders: 'アクティブなリマインダーがありません',
      createHabitsDesc: '学習習慣を作るためにリマインダーを設定しましょう',
      createReminder: 'リマインダーを作成',
      // 新規作成
      createNewReminder: '新しいリマインダーを作成',
      reminderName: 'リマインダー名',
      reminderNamePlaceholder: '例: 夕方の復習',
      reminderType: 'リマインダータイプ',
      notificationTime: '通知時間',
      addTime: '+ 時間追加',
      daySelection: '曜日選択',
      notificationTitle: '通知タイトル',
      notificationTitlePlaceholder: '例: 学習時間です！',
      messageContent: 'メッセージ内容',
      messageContentPlaceholder: '例: クイズで知識を深めましょう',
      cancel: 'キャンセル',
      create: '作成',
      // 統計
      totalReminders: '総リマインダー数',
      responseRate: '反応率',
      averageResponseTime: '平均反応時間',
      minutes: '分',
      effectiveSettings: '📊 効果的な設定',
      optimalTimes: '最適な通知時間',
      dataInsufficient: 'データ不足',
      effectiveMessageTypes: '効果的なメッセージタイプ',
      encouragement: '励まし系',
      achievement: '達成系',
      urgency: '緊急系',
      gentle: '優しい系',
      // 設定
      globalSettings: '🔧 全体設定',
      disabledReminders: '無効なリマインダー',
      noDisabledReminders: '無効なリマインダーはありません',
      dangerousOperations: '危険な操作',
      deleteAllReminders: '全リマインダーを削除',
      deleteAllConfirm: '全てのリマインダーを削除しますか？この操作は取り消せません。',
      resetToDefaults: 'デフォルトに戻す',
      // デフォルトリマインダー
      morningHabit: '朝の学習習慣',
      morningGreeting: '🌅 おはようございます！',
      morningMessage: '新しい一日を学習でスタートしませんか？',
      morningAction: '朝の学習を始める',
      optimalTimeAlert: '最適時間アラート',
      optimalTimeTitle: '⏰ 最適な学習時間です',
      optimalTimeMessage: 'あなたのパフォーマンスが最も高い時間帯です',
      optimalTimeAction: '最適時間で学習',
      streakMaintenance: '連続学習維持',
      streakTitle: '🔥 連続学習を維持しよう！',
      streakMessage: '今日もあと少しで学習完了です',
      streakAction: '連続記録を継続',
      performanceBoost: 'パフォーマンス向上',
      performanceTitle: '📈 成績向上のチャンス',
      performanceMessage: '最近の正答率が少し下がっています。復習しませんか？',
      performanceAction: '復習で向上',
      // デフォルト新規作成
      defaultReminderTitle: '学習時間です！',
      defaultReminderBody: 'クイズで知識を深めましょう',
      defaultReminderAction: '学習開始'
    },
    en: {
      title: '🔔 Learning Reminders',
      backButton: '← Back',
      loading: 'Loading reminder settings...',
      // Notification permission
      enableNotifications: 'Enable Notifications',
      notificationPermissionDesc: 'Allow browser notifications to receive reminders',
      allowPermission: 'Allow',
      // Tabs
      activeTab: '🏃 Active',
      createTab: '➕ Create New',
      statsTab: '📊 Statistics',
      settingsTab: '⚙️ Settings',
      // Reminder types
      timeBased: 'Time-based',
      performanceBased: 'Performance-based',
      habitBased: 'Habit-based',
      adaptive: 'Adaptive',
      unknown: 'Unknown',
      // Actions
      test: 'Test',
      disable: 'Disable',
      enable: 'Enable',
      delete: 'Delete',
      // Schedule
      schedule: 'Schedule',
      days: 'Days',
      time: 'Time',
      message: 'Message',
      conditions: 'Conditions',
      // Day names
      dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      // Conditions
      minTimeSinceLastStudy: '{hours}+ hours since last study',
      performanceThreshold: 'Accuracy below {threshold}%',
      streakThreshold: 'Streak of {days}+ days',
      // Empty state
      noActiveReminders: 'No active reminders',
      createHabitsDesc: 'Set up reminders to build learning habits',
      createReminder: 'Create Reminder',
      // Create new
      createNewReminder: 'Create New Reminder',
      reminderName: 'Reminder Name',
      reminderNamePlaceholder: 'e.g., Evening Review',
      reminderType: 'Reminder Type',
      notificationTime: 'Notification Time',
      addTime: '+ Add Time',
      daySelection: 'Day Selection',
      notificationTitle: 'Notification Title',
      notificationTitlePlaceholder: 'e.g., Study Time!',
      messageContent: 'Message Content',
      messageContentPlaceholder: 'e.g., Deepen your knowledge with quizzes',
      cancel: 'Cancel',
      create: 'Create',
      // Statistics
      totalReminders: 'Total Reminders',
      responseRate: 'Response Rate',
      averageResponseTime: 'Average Response Time',
      minutes: ' min',
      effectiveSettings: '📊 Effective Settings',
      optimalTimes: 'Optimal Notification Times',
      dataInsufficient: 'Insufficient data',
      effectiveMessageTypes: 'Effective Message Types',
      encouragement: 'Encouragement',
      achievement: 'Achievement',
      urgency: 'Urgency',
      gentle: 'Gentle',
      // Settings
      globalSettings: '🔧 Global Settings',
      disabledReminders: 'Disabled Reminders',
      noDisabledReminders: 'No disabled reminders',
      dangerousOperations: 'Dangerous Operations',
      deleteAllReminders: 'Delete All Reminders',
      deleteAllConfirm: 'Delete all reminders? This action cannot be undone.',
      resetToDefaults: 'Reset to Defaults',
      // Default reminders
      morningHabit: 'Morning Study Habit',
      morningGreeting: '🌅 Good morning!',
      morningMessage: 'Start your new day with learning?',
      morningAction: 'Start morning study',
      optimalTimeAlert: 'Optimal Time Alert',
      optimalTimeTitle: '⏰ Optimal study time',
      optimalTimeMessage: 'Your performance is highest during this time',
      optimalTimeAction: 'Study at optimal time',
      streakMaintenance: 'Maintain Study Streak',
      streakTitle: '🔥 Keep your learning streak!',
      streakMessage: 'Just a bit more to complete today\'s study',
      streakAction: 'Continue streak',
      performanceBoost: 'Performance Boost',
      performanceTitle: '📈 Chance to improve',
      performanceMessage: 'Your recent accuracy has decreased. Review?',
      performanceAction: 'Improve with review',
      // Default new reminder
      defaultReminderTitle: 'Study Time!',
      defaultReminderBody: 'Deepen your knowledge with quizzes',
      defaultReminderAction: 'Start Learning'
    }
  };

  const currentLang = language as keyof typeof t;
  const [reminders, setReminders] = useState<ReminderRule[]>([]);
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);
  const [patterns, setPatterns] = useState<LearningPatternAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'create' | 'stats' | 'settings'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [newReminder, setNewReminder] = useState<Partial<ReminderRule>>({
    name: '',
    type: 'time_based',
    isActive: true,
    schedule: {
      days: [1, 2, 3, 4, 5], // Monday to Friday
      times: ['09:00', '18:00'],
      frequency: 'daily'
    },
    conditions: {},
    message: {
      title: t[currentLang].defaultReminderTitle,
      body: t[currentLang].defaultReminderBody,
      actionText: t[currentLang].defaultReminderAction,
      motivationType: 'encouragement'
    },
    sounds: {
      enabled: true,
      soundType: 'chime'
    }
  });

  const defaultReminders: ReminderRule[] = [
    {
      id: 'morning-routine',
      name: t[currentLang].morningHabit,
      type: 'time_based',
      isActive: true,
      schedule: {
        days: [1, 2, 3, 4, 5],
        times: ['08:00'],
        frequency: 'daily'
      },
      conditions: {},
      message: {
        title: t[currentLang].morningGreeting,
        body: t[currentLang].morningMessage,
        actionText: t[currentLang].morningAction,
        motivationType: 'encouragement'
      },
      sounds: {
        enabled: true,
        soundType: 'chime'
      },
      created: new Date()
    },
    {
      id: 'optimal-time',
      name: t[currentLang].optimalTimeAlert,
      type: 'adaptive',
      isActive: true,
      schedule: {
        days: [0, 1, 2, 3, 4, 5, 6],
        times: [], // Will be filled based on user's optimal times
        frequency: 'daily'
      },
      conditions: {
        minTimeSinceLastStudy: 8
      },
      message: {
        title: t[currentLang].optimalTimeTitle,
        body: t[currentLang].optimalTimeMessage,
        actionText: t[currentLang].optimalTimeAction,
        motivationType: 'achievement'
      },
      sounds: {
        enabled: true,
        soundType: 'bell'
      },
      created: new Date()
    },
    {
      id: 'streak-motivation',
      name: t[currentLang].streakMaintenance,
      type: 'habit_based',
      isActive: true,
      schedule: {
        days: [0, 1, 2, 3, 4, 5, 6],
        times: ['20:00'],
        frequency: 'daily'
      },
      conditions: {
        minTimeSinceLastStudy: 12,
        streakThreshold: 3
      },
      message: {
        title: t[currentLang].streakTitle,
        body: t[currentLang].streakMessage,
        actionText: t[currentLang].streakAction,
        motivationType: 'urgency'
      },
      sounds: {
        enabled: true,
        soundType: 'notification'
      },
      created: new Date()
    },
    {
      id: 'performance-boost',
      name: t[currentLang].performanceBoost,
      type: 'performance_based',
      isActive: false,
      schedule: {
        days: [1, 3, 5],
        times: ['15:00'],
        frequency: 'custom'
      },
      conditions: {
        performanceThreshold: 70,
        minTimeSinceLastStudy: 24
      },
      message: {
        title: t[currentLang].performanceTitle,
        body: t[currentLang].performanceMessage,
        actionText: t[currentLang].performanceAction,
        motivationType: 'gentle'
      },
      sounds: {
        enabled: false,
        soundType: 'chime'
      },
      created: new Date()
    }
  ];

  useEffect(() => {
    loadReminderData();
    requestNotificationPermission();
    scheduleAllReminders();
  }, []);

  const loadReminderData = async () => {
    try {
      setIsLoading(true);

      // Load saved reminders
      const savedReminders = localStorage.getItem('learning-reminders');
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders));
      } else {
        setReminders(defaultReminders);
      }

      // Load user patterns for optimization
      const patternsResult = await analyticsStatisticsService.analyzeLearningPatterns();
      setPatterns(patternsResult);

      // Optimize default reminders based on patterns
      if (patternsResult) {
        optimizeRemindersForUser(patternsResult);
      }

      // Load reminder stats
      const stats = loadReminderStats();
      setReminderStats(stats);

    } catch (error) {
      console.error('リマインダーデータの読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeRemindersForUser = (patterns: LearningPatternAnalysis) => {
    const optimizedReminders = [...defaultReminders];

    // Optimize optimal-time reminder
    const optimalTimeReminder = optimizedReminders.find(r => r.id === 'optimal-time');
    if (optimalTimeReminder && patterns.peakPerformanceHours.length > 0) {
      optimalTimeReminder.schedule.times = patterns.peakPerformanceHours.map(hour =>
        `${hour.toString().padStart(2, '0')}:00`
      );
    }

    setReminders(optimizedReminders);
    saveReminders(optimizedReminders);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  };

  const scheduleAllReminders = () => {
    // Clear existing schedules
    // In a real implementation, you would use a proper scheduling system
    console.log('Scheduling all active reminders...');
  };

  const saveReminders = (remindersToSave: ReminderRule[]) => {
    localStorage.setItem('learning-reminders', JSON.stringify(remindersToSave));
  };

  const loadReminderStats = (): ReminderStats => {
    const saved = localStorage.getItem('reminder-stats');
    if (saved) {
      return JSON.parse(saved);
    }

    return {
      totalReminders: 0,
      responseRate: 0,
      optimalTimes: [],
      effectiveMessages: [],
      averageResponseTime: 0
    };
  };

  const toggleReminder = (id: string) => {
    const updated = reminders.map(reminder =>
      reminder.id === id ? { ...reminder, isActive: !reminder.isActive } : reminder
    );
    setReminders(updated);
    saveReminders(updated);
  };

  const deleteReminder = (id: string) => {
    const updated = reminders.filter(reminder => reminder.id !== id);
    setReminders(updated);
    saveReminders(updated);
  };

  const createReminder = () => {
    if (!newReminder.name) return;

    const reminder: ReminderRule = {
      id: `custom-${Date.now()}`,
      name: newReminder.name,
      type: newReminder.type || 'time_based',
      isActive: true,
      schedule: newReminder.schedule || {
        days: [1, 2, 3, 4, 5],
        times: ['09:00'],
        frequency: 'daily'
      },
      conditions: newReminder.conditions || {},
      message: newReminder.message || {
        title: '学習時間です！',
        body: 'クイズで知識を深めましょう',
        actionText: '学習開始',
        motivationType: 'encouragement'
      },
      sounds: newReminder.sounds || {
        enabled: true,
        soundType: 'chime'
      },
      created: new Date()
    };

    const updated = [...reminders, reminder];
    setReminders(updated);
    saveReminders(updated);

    // Reset form
    setNewReminder({
      name: '',
      type: 'time_based',
      isActive: true,
      schedule: {
        days: [1, 2, 3, 4, 5],
        times: ['09:00', '18:00'],
        frequency: 'daily'
      },
      conditions: {},
      message: {
        title: '学習時間です！',
        body: 'クイズで知識を深めましょう',
        actionText: '学習開始',
        motivationType: 'encouragement'
      },
      sounds: {
        enabled: true,
        soundType: 'chime'
      }
    });

    setActiveTab('active');
  };

  const testReminder = (reminder: ReminderRule) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(reminder.message.title, {
        body: reminder.message.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      });
    } else {
      alert(`${reminder.message.title}\n\n${reminder.message.body}`);
    }
  };

  const getDayName = (day: number): string => {
    return t[currentLang].dayNames[day];
  };

  const getTypeIcon = (type: ReminderRule['type']): string => {
    switch (type) {
      case 'time_based': return '⏰';
      case 'performance_based': return '📊';
      case 'habit_based': return '🔄';
      case 'adaptive': return '🧠';
      default: return '🔔';
    }
  };

  const getTypeName = (type: ReminderRule['type']): string => {
    switch (type) {
      case 'time_based': return t[currentLang].timeBased;
      case 'performance_based': return t[currentLang].performanceBased;
      case 'habit_based': return t[currentLang].habitBased;
      case 'adaptive': return t[currentLang].adaptive;
      default: return t[currentLang].unknown;
    }
  };

  const getMotivationColor = (type: string): string => {
    switch (type) {
      case 'encouragement': return 'text-green-600 dark:text-green-400';
      case 'urgency': return 'text-red-600 dark:text-red-400';
      case 'achievement': return 'text-blue-600 dark:text-blue-400';
      case 'gentle': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t[currentLang].title}</h1>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all shadow-md"
              >
{t[currentLang].backButton}
              </button>
            )}
          </div>

          {/* 通知許可確認 */}
          {'Notification' in window && Notification.permission !== 'granted' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🔔</span>
                  <div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">{t[currentLang].enableNotifications}</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {t[currentLang].notificationPermissionDesc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={requestNotificationPermission}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
{t[currentLang].allowPermission}
                </button>
              </div>
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'active'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].activeTab}
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].createTab}
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'stats'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].statsTab}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].settingsTab}
            </button>
          </div>
        </header>

        {/* アクティブなリマインダー */}
        {activeTab === 'active' && (
          <div className="space-y-6">
            {reminders.filter(r => r.isActive).map((reminder) => (
              <div
                key={reminder.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">{getTypeIcon(reminder.type)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {reminder.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getTypeName(reminder.type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => testReminder(reminder)}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                    >
  {t[currentLang].test}
                    </button>
                    <button
                      onClick={() => toggleReminder(reminder.id)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
{t[currentLang].disable}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t[currentLang].schedule}</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div className="mb-1">
                        <span className="font-medium">{t[currentLang].days}:</span> {reminder.schedule.days.map(getDayName).join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">{t[currentLang].time}:</span> {reminder.schedule.times.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t[currentLang].message}</h4>
                    <div className="text-sm">
                      <div className={`font-medium ${getMotivationColor(reminder.message.motivationType)}`}>
                        {reminder.message.title}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs">
                        {reminder.message.body}
                      </div>
                    </div>
                  </div>
                </div>

                {Object.keys(reminder.conditions).length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t[currentLang].conditions}</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {reminder.conditions.minTimeSinceLastStudy && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {t[currentLang].minTimeSinceLastStudy.replace('{hours}', reminder.conditions.minTimeSinceLastStudy.toString())}
                        </span>
                      )}
                      {reminder.conditions.performanceThreshold && (
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
                          {t[currentLang].performanceThreshold.replace('{threshold}', reminder.conditions.performanceThreshold.toString())}
                        </span>
                      )}
                      {reminder.conditions.streakThreshold && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                          {t[currentLang].streakThreshold.replace('{days}', reminder.conditions.streakThreshold.toString())}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {reminders.filter(r => r.isActive).length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center">
                <div className="text-6xl mb-4">🔕</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t[currentLang].noActiveReminders}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t[currentLang].createHabitsDesc}
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {t[currentLang].createReminder}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 新規作成タブ */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].createNewReminder}</h3>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].reminderName}
                    </label>
                    <input
                      type="text"
                      value={newReminder.name || ''}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t[currentLang].reminderNamePlaceholder}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].reminderType}
                    </label>
                    <select
                      value={newReminder.type || 'time_based'}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, type: e.target.value as ReminderRule['type'] }))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="time_based">{t[currentLang].timeBased}</option>
                      <option value="performance_based">{t[currentLang].performanceBased}</option>
                      <option value="habit_based">{t[currentLang].habitBased}</option>
                      <option value="adaptive">{t[currentLang].adaptive}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].notificationTime}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {newReminder.schedule?.times.map((time, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => {
                            const updatedTimes = [...(newReminder.schedule?.times || [])];
                            updatedTimes[index] = e.target.value;
                            setNewReminder(prev => ({
                              ...prev,
                              schedule: { ...prev.schedule!, times: updatedTimes }
                            }));
                          }}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={() => {
                            const updatedTimes = (newReminder.schedule?.times || []).filter((_, i) => i !== index);
                            setNewReminder(prev => ({
                              ...prev,
                              schedule: { ...prev.schedule!, times: updatedTimes }
                            }));
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const updatedTimes = [...(newReminder.schedule?.times || []), '12:00'];
                        setNewReminder(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule!, times: updatedTimes }
                        }));
                      }}
                      className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                    >
                      {t[currentLang].addTime}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].daySelection}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {t[currentLang].dayNames.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const days = newReminder.schedule?.days || [];
                          const updatedDays = days.includes(index)
                            ? days.filter(d => d !== index)
                            : [...days, index];
                          setNewReminder(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule!, days: updatedDays }
                          }));
                        }}
                        className={`w-12 h-12 rounded-full text-sm font-medium transition ${
                          newReminder.schedule?.days.includes(index)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].notificationTitle}
                    </label>
                    <input
                      type="text"
                      value={newReminder.message?.title || ''}
                      onChange={(e) => setNewReminder(prev => ({
                        ...prev,
                        message: { ...prev.message!, title: e.target.value }
                      }))}
                      placeholder={t[currentLang].notificationTitlePlaceholder}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].messageContent}
                    </label>
                    <input
                      type="text"
                      value={newReminder.message?.body || ''}
                      onChange={(e) => setNewReminder(prev => ({
                        ...prev,
                        message: { ...prev.message!, body: e.target.value }
                      }))}
                      placeholder={t[currentLang].messageContentPlaceholder}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setActiveTab('active')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    {t[currentLang].cancel}
                  </button>
                  <button
                    onClick={createReminder}
                    disabled={!newReminder.name}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {t[currentLang].create}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 統計タブ */}
        {activeTab === 'stats' && reminderStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {reminderStats.totalReminders}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].totalReminders}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {reminderStats.responseRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].responseRate}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {reminderStats.averageResponseTime.toFixed(0)}{t[currentLang].minutes}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].averageResponseTime}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].effectiveSettings}</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t[currentLang].optimalTimes}</h4>
                  <div className="flex flex-wrap gap-2">
                    {patterns?.peakPerformanceHours.map((hour) => (
                      <span
                        key={hour}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {hour}:00
                      </span>
                    )) || <span className="text-gray-500">{t[currentLang].dataInsufficient}</span>}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t[currentLang].effectiveMessageTypes}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">85%</div>
                      <div className="text-xs text-green-800 dark:text-green-200">{t[currentLang].encouragement}</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">72%</div>
                      <div className="text-xs text-blue-800 dark:text-blue-200">{t[currentLang].achievement}</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">68%</div>
                      <div className="text-xs text-orange-800 dark:text-orange-200">{t[currentLang].urgency}</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">61%</div>
                      <div className="text-xs text-purple-800 dark:text-purple-200">{t[currentLang].gentle}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].globalSettings}</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].disabledReminders}</h4>
                  <div className="space-y-3">
                    {reminders.filter(r => !r.isActive).map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-3 opacity-50">{getTypeIcon(reminder.type)}</span>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{reminder.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{getTypeName(reminder.type)}</div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleReminder(reminder.id)}
                            className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800 transition"
                          >
                            {t[currentLang].enable}
                          </button>
                          <button
                            onClick={() => deleteReminder(reminder.id)}
                            className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800 transition"
                          >
                            {t[currentLang].delete}
                          </button>
                        </div>
                      </div>
                    ))}

                    {reminders.filter(r => !r.isActive).length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        {t[currentLang].noDisabledReminders}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].dangerousOperations}</h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        if (confirm(t[currentLang].deleteAllConfirm)) {
                          setReminders([]);
                          saveReminders([]);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      {t[currentLang].deleteAllReminders}
                    </button>
                    <button
                      onClick={() => {
                        setReminders(defaultReminders);
                        saveReminders(defaultReminders);
                        if (patterns) {
                          optimizeRemindersForUser(patterns);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition ml-3"
                    >
                      {t[currentLang].resetToDefaults}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}