import { useState, useEffect } from 'react';
import { analyticsStatisticsService } from '../lib/analyticsStatistics';
import type { LearningPatternAnalysis } from '../lib/analyticsStatistics';

interface SessionConfig {
  sessionLength: number; // minutes
  breakLength: number; // minutes
  longBreakLength: number; // minutes
  sessionsBeforeLongBreak: number;
  autoBreakReminder: boolean;
  focusMode: 'pomodoro' | 'flexible' | 'flow' | 'custom';
  targetProblemsPerSession: number;
  difficultyProgression: 'static' | 'adaptive' | 'increasing';
  reminderSound: boolean;
  backgroundMusic: boolean;
  distractionBlocking: boolean;
  sessionEndAction: 'auto_continue' | 'manual_continue' | 'force_break';
}

interface SessionPreset {
  name: string;
  description: string;
  icon: string;
  config: SessionConfig;
  recommendedFor: string[];
}

interface SessionSettingsProps {
  onBack?: () => void;
  onApplySettings?: (config: SessionConfig) => void;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

export function SessionSettings({ onBack, onApplySettings, language = 'ja' }: SessionSettingsProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      title: '⚙️ セッション設定',
      backButton: '← 戻る',
      loading: 'セッション設定を読み込み中...',
      // タブ
      presetSettings: '🎯 プリセット設定',
      customSettings: '⚙️ カスタム設定',
      advancedSettings: '🔧 詳細設定',
      // セッション状態
      studying: '学習中',
      shortBreak: '短休憩',
      longBreak: '長休憩',
      session: 'セッション',
      remainingTime: '残り時間',
      pause: '⏸️ 一時停止',
      resume: '▶️ 再開',
      stop: '⏹️ 終了',
      // プリセット
      pomodoroTechnique: 'ポモドーロテクニック',
      pomodoroDesc: '25分学習 + 5分休憩の効率的な学習法',
      deepWork: 'ディープワーク',
      deepWorkDesc: '90分の深い集中時間で高度な学習',
      lightLearning: 'ライト学習',
      lightLearningDesc: '15分の軽い学習セッション',
      customOptimization: 'カスタム最適化',
      customOptimizationDesc: 'あなたの学習パターンに基づく個人最適設定',
      recommended: '推奨',
      // 設定項目
      sessionTime: 'セッション時間',
      breakTime: '休憩時間',
      targetProblems: '目標問題数',
      focusMode: 'フォーカスモード',
      recommendedFor: '推奨される方:',
      applySettings: 'この設定を適用',
      startSession: '🚀 セッション開始',
      // フォーカスモード
      pomodoro: 'ポモドーロ',
      flow: 'フロー',
      flexible: '柔軟',
      custom: 'カスタム',
      // 推奨タグ
      difficultyConcentration: '集中力維持が困難',
      shortTermFocus: '短時間集中型',
      habitBuilding: '習慣化したい',
      longTermFocus: '長時間集中可能',
      complexProblems: '複雑な問題',
      advanced: '上級者向け',
      busyDays: '忙しい日',
      tired: '疲労時',
      reviewFocused: '復習中心',
      personalOptimization: '個人最適化',
      dataDriven: 'データ駆動型',
      // 単位
      minutes: '分',
      problems: '問',
      // カスタム設定
      timeSettings: '⏱️ 時間設定',
      sessionLength: 'セッション時間 (分)',
      breakLength: '休憩時間 (分)',
      targetProblemsLabel: '目標問題数',
      focusModeLabel: 'フォーカスモード',
      pomodoroStrict: 'ポモドーロ (厳格な時間管理)',
      flexibleTime: 'フレキシブル (柔軟な時間)',
      flowLong: 'フロー (長時間集中)',
      customMode: 'カスタム (独自設定)',
      saveSettings: '{t[currentLang].saveSettings}',
      // 詳細設定
      advancedConfig: '🔧 高度な設定',
      notificationSettings: '通知設定',
      autoBreakReminder: '自動休憩リマインダー',
      enableNotificationSound: '通知音を有効化',
      environmentSettings: '環境設定',
      focusBGM: '集中用BGM',
      distractionBlocking: '注意散漫ブロック',
      learningProgressSettings: '学習進行設定',
      difficultyProgression: '難易度進行',
      sessionEndAction: 'セッション終了時の動作',
      fixedDifficulty: '固定難易度',
      adaptiveAdjustment: '適応的調整',
      gradualIncrease: '段階的上昇',
      autoContinue: '自動継続',
      manualContinue: '手動継続',
      forceBreak: '強制休憩',
      reset: 'リセット'
    },
    en: {
      title: '⚙️ Session Settings',
      backButton: '← Back',
      loading: 'Loading session settings...',
      // Tabs
      presetSettings: '🎯 Preset Settings',
      customSettings: '⚙️ Custom Settings',
      advancedSettings: '🔧 Advanced Settings',
      // Session states
      studying: 'Studying',
      shortBreak: 'Short Break',
      longBreak: 'Long Break',
      session: 'Session',
      remainingTime: 'Remaining Time',
      pause: '⏸️ Pause',
      resume: '▶️ Resume',
      stop: '⏹️ Stop',
      // Presets
      pomodoroTechnique: 'Pomodoro Technique',
      pomodoroDesc: 'Efficient 25-minute study + 5-minute break method',
      deepWork: 'Deep Work',
      deepWorkDesc: '90 minutes of deep concentration for advanced learning',
      lightLearning: 'Light Learning',
      lightLearningDesc: '15-minute light learning sessions',
      customOptimization: 'Custom Optimization',
      customOptimizationDesc: 'Personalized settings based on your learning patterns',
      recommended: 'Recommended',
      // Settings
      sessionTime: 'Session Time',
      breakTime: 'Break Time',
      targetProblems: 'Target Problems',
      focusMode: 'Focus Mode',
      recommendedFor: 'Recommended for:',
      applySettings: 'Apply These Settings',
      startSession: '🚀 Start Session',
      // Focus modes
      pomodoro: 'Pomodoro',
      flow: 'Flow',
      flexible: 'Flexible',
      custom: 'Custom',
      // Recommendation tags
      difficultyConcentration: 'Difficulty maintaining focus',
      shortTermFocus: 'Short-term focus type',
      habitBuilding: 'Want to build habits',
      longTermFocus: 'Long-term focus capable',
      complexProblems: 'Complex problems',
      advanced: 'Advanced users',
      busyDays: 'Busy days',
      tired: 'When tired',
      reviewFocused: 'Review-focused',
      personalOptimization: 'Personal optimization',
      dataDriven: 'Data-driven',
      // Units
      minutes: ' min',
      problems: ' problems',
      // Custom settings
      timeSettings: '⏱️ Time Settings',
      sessionLength: 'Session Length (min)',
      breakLength: 'Break Length (min)',
      targetProblemsLabel: 'Target Problems',
      focusModeLabel: 'Focus Mode',
      pomodoroStrict: 'Pomodoro (Strict time management)',
      flexibleTime: 'Flexible (Flexible timing)',
      flowLong: 'Flow (Long concentration)',
      customMode: 'Custom (Custom settings)',
      saveSettings: 'Save Settings',
      // Advanced settings
      advancedConfig: '🔧 Advanced Configuration',
      notificationSettings: 'Notification Settings',
      autoBreakReminder: 'Auto break reminder',
      enableNotificationSound: 'Enable notification sound',
      environmentSettings: 'Environment Settings',
      focusBGM: 'Focus BGM',
      distractionBlocking: 'Distraction blocking',
      learningProgressSettings: 'Learning Progress Settings',
      difficultyProgression: 'Difficulty Progression',
      sessionEndAction: 'Session End Action',
      fixedDifficulty: 'Fixed difficulty',
      adaptiveAdjustment: 'Adaptive adjustment',
      gradualIncrease: 'Gradual increase',
      autoContinue: 'Auto continue',
      manualContinue: 'Manual continue',
      forceBreak: 'Force break',
      reset: 'Reset'
    }
  };

  const currentLang = language as keyof typeof t;
  const [currentConfig, setCurrentConfig] = useState<SessionConfig>({
    sessionLength: 25,
    breakLength: 5,
    longBreakLength: 15,
    sessionsBeforeLongBreak: 4,
    autoBreakReminder: true,
    focusMode: 'pomodoro',
    targetProblemsPerSession: 10,
    difficultyProgression: 'adaptive',
    reminderSound: true,
    backgroundMusic: false,
    distractionBlocking: false,
    sessionEndAction: 'manual_continue'
  });

  // const [recommendedConfig, setRecommendedConfig] = useState<SessionConfig | null>(null);
  const [patterns, setPatterns] = useState<LearningPatternAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'advanced'>('presets');
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<{
    isActive: boolean;
    type: 'study' | 'break' | 'long_break';
    timeRemaining: number;
    sessionCount: number;
  }>({
    isActive: false,
    type: 'study',
    timeRemaining: 0,
    sessionCount: 0
  });

  // 推奨タグの翻訳関数
  const translateRecommendedTag = (tag: string): string => {
    const tagMap: Record<string, keyof typeof t.ja> = {
      '集中力維持が困難': 'difficultyConcentration',
      '短時間集中型': 'shortTermFocus',
      '習慣化したい': 'habitBuilding',
      '長時間集中可能': 'longTermFocus',
      '複雑な問題': 'complexProblems',
      '上級者向け': 'advanced',
      '忙しい日': 'busyDays',
      '疲労時': 'tired',
      '復習中心': 'reviewFocused',
      '個人最適化': 'personalOptimization',
      'データ駆動型': 'dataDriven'
    };

    const key = tagMap[tag];
    return key ? t[currentLang][key] : tag;
  };

  const sessionPresets: SessionPreset[] = [
    {
      name: t[currentLang].pomodoroTechnique,
      description: t[currentLang].pomodoroDesc,
      icon: '🍅',
      config: {
        ...currentConfig,
        sessionLength: 25,
        breakLength: 5,
        longBreakLength: 15,
        sessionsBeforeLongBreak: 4,
        focusMode: 'pomodoro',
        targetProblemsPerSession: 10
      },
      recommendedFor: ['集中力維持が困難', '短時間集中型', '習慣化したい']
    },
    {
      name: t[currentLang].deepWork,
      description: t[currentLang].deepWorkDesc,
      icon: '🧠',
      config: {
        ...currentConfig,
        sessionLength: 90,
        breakLength: 20,
        longBreakLength: 30,
        sessionsBeforeLongBreak: 2,
        focusMode: 'flow',
        targetProblemsPerSession: 35
      },
      recommendedFor: ['長時間集中可能', '複雑な問題', '上級者向け']
    },
    {
      name: t[currentLang].lightLearning,
      description: t[currentLang].lightLearningDesc,
      icon: '💡',
      config: {
        ...currentConfig,
        sessionLength: 15,
        breakLength: 3,
        longBreakLength: 10,
        sessionsBeforeLongBreak: 6,
        focusMode: 'flexible',
        targetProblemsPerSession: 6
      },
      recommendedFor: ['忙しい日', '疲労時', '復習中心']
    },
    {
      name: t[currentLang].customOptimization,
      description: t[currentLang].customOptimizationDesc,
      icon: '⚙️',
      config: currentConfig,
      recommendedFor: ['個人最適化', 'データ駆動型']
    }
  ];

  useEffect(() => {
    loadUserData();
    loadSavedConfig();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const patternsResult = await analyticsStatisticsService.analyzeLearningPatterns();
      setPatterns(patternsResult);

      // 個人最適化設定の生成
      const optimizedConfig = generateOptimizedConfig(patternsResult);
      // setRecommendedConfig(optimizedConfig);

      // カスタム最適化プリセットの更新
      sessionPresets[3].config = optimizedConfig;
    } catch (error) {
      console.error('学習パターンの読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedConfig = () => {
    const saved = localStorage.getItem('session-settings');
    if (saved) {
      try {
        setCurrentConfig(JSON.parse(saved));
      } catch (error) {
        console.warn('保存された設定の読み込みに失敗:', error);
      }
    }
  };

  const generateOptimizedConfig = (patterns: LearningPatternAnalysis): SessionConfig => {
    return {
      sessionLength: patterns.optimalSessionLength,
      breakLength: Math.round(patterns.optimalSessionLength * 0.2),
      longBreakLength: Math.round(patterns.optimalSessionLength * 0.6),
      sessionsBeforeLongBreak: patterns.fatigueThreshold > 60 ? 3 : 5,
      autoBreakReminder: true,
      focusMode: patterns.optimalSessionLength > 45 ? 'flow' : 'pomodoro',
      targetProblemsPerSession: Math.round(patterns.optimalSessionLength / 2.5),
      difficultyProgression: 'adaptive',
      reminderSound: true,
      backgroundMusic: patterns.avgFocusRetention < 0.7,
      distractionBlocking: patterns.avgFocusRetention < 0.6,
      sessionEndAction: 'manual_continue'
    };
  };

  const saveConfig = (config: SessionConfig) => {
    setCurrentConfig(config);
    localStorage.setItem('session-settings', JSON.stringify(config));
    if (onApplySettings) {
      onApplySettings(config);
    }
  };

  const startSession = () => {
    const sessionData = {
      isActive: true,
      type: 'study' as const,
      timeRemaining: currentConfig.sessionLength * 60, // seconds
      sessionCount: 1
    };
    setCurrentSession(sessionData);
    localStorage.setItem('active-session', JSON.stringify(sessionData));
  };

  const pauseSession = () => {
    setCurrentSession(prev => ({ ...prev, isActive: false }));
  };

  const stopSession = () => {
    setCurrentSession({
      isActive: false,
      type: 'study',
      timeRemaining: 0,
      sessionCount: 0
    });
    localStorage.removeItem('active-session');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    const totalTime = currentConfig.sessionLength * 60;
    return ((totalTime - currentSession.timeRemaining) / totalTime) * 100;
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

          {/* アクティブセッション表示 */}
          {currentSession.isActive && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {currentSession.type === 'study' ? '📚' : currentSession.type === 'break' ? '☕' : '🛌'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      {currentSession.type === 'study' ? t[currentLang].studying :
                       currentSession.type === 'break' ? t[currentLang].shortBreak : t[currentLang].longBreak}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {t[currentLang].session} {currentSession.sessionCount}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-blue-900 dark:text-blue-100">
                    {formatTime(currentSession.timeRemaining)}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">{t[currentLang].remainingTime}</div>
                </div>
              </div>

              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={currentSession.isActive ? pauseSession : startSession}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                >
{currentSession.isActive ? t[currentLang].pause : t[currentLang].resume}
                </button>
                <button
                  onClick={stopSession}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                >
{t[currentLang].stop}
                </button>
              </div>
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].presetSettings}
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'custom'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].customSettings}
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'advanced'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
{t[currentLang].advancedSettings}
            </button>
          </div>
        </header>

        {/* プリセット設定タブ */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessionPresets.map((preset, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                  onClick={() => saveConfig(preset.config)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{preset.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {preset.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                    {preset.name === t[currentLang].customOptimization && patterns && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                        {t[currentLang].recommended}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t[currentLang].sessionTime}:</span>
                        <span className="ml-2 font-medium">{preset.config.sessionLength}{t[currentLang].minutes}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t[currentLang].breakTime}:</span>
                        <span className="ml-2 font-medium">{preset.config.breakLength}{t[currentLang].minutes}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t[currentLang].targetProblems}:</span>
                        <span className="ml-2 font-medium">{preset.config.targetProblemsPerSession}{t[currentLang].problems}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t[currentLang].focusMode}:</span>
                        <span className="ml-2 font-medium">
                          {preset.config.focusMode === 'pomodoro' ? t[currentLang].pomodoro :
                           preset.config.focusMode === 'flow' ? t[currentLang].flow :
                           preset.config.focusMode === 'flexible' ? t[currentLang].flexible : t[currentLang].custom}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].recommendedFor}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {preset.recommendedFor.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                          >
                            {translateRecommendedTag(tag)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      {t[currentLang].applySettings}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!currentSession.isActive && (
              <div className="text-center">
                <button
                  onClick={startSession}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700 transition shadow-lg"
                >
{t[currentLang].startSession}
                </button>
              </div>
            )}
          </div>
        )}

        {/* カスタム設定タブ */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].timeSettings}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].sessionLength}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={currentConfig.sessionLength}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, sessionLength: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span>10{t[currentLang].minutes}</span>
                    <span className="font-medium">{currentConfig.sessionLength}{t[currentLang].minutes}</span>
                    <span>120{t[currentLang].minutes}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].breakLength}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={currentConfig.breakLength}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, breakLength: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span>1{t[currentLang].minutes}</span>
                    <span className="font-medium">{currentConfig.breakLength}{t[currentLang].minutes}</span>
                    <span>30{t[currentLang].minutes}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].targetProblemsLabel}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={currentConfig.targetProblemsPerSession}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, targetProblemsPerSession: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span>5{t[currentLang].problems}</span>
                    <span className="font-medium">{currentConfig.targetProblemsPerSession}{t[currentLang].problems}</span>
                    <span>50{t[currentLang].problems}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].focusModeLabel}
                  </label>
                  <select
                    value={currentConfig.focusMode}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, focusMode: e.target.value as SessionConfig['focusMode'] }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="pomodoro">{t[currentLang].pomodoroStrict}</option>
                    <option value="flexible">{t[currentLang].flexibleTime}</option>
                    <option value="flow">{t[currentLang].flowLong}</option>
                    <option value="custom">{t[currentLang].customMode}</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveConfig(currentConfig)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {t[currentLang].saveSettings}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 詳細設定タブ */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].advancedConfig}</h3>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].notificationSettings}</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={currentConfig.autoBreakReminder}
                          onChange={(e) => setCurrentConfig(prev => ({ ...prev, autoBreakReminder: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].autoBreakReminder}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={currentConfig.reminderSound}
                          onChange={(e) => setCurrentConfig(prev => ({ ...prev, reminderSound: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].enableNotificationSound}</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].environmentSettings}</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={currentConfig.backgroundMusic}
                          onChange={(e) => setCurrentConfig(prev => ({ ...prev, backgroundMusic: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].focusBGM}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={currentConfig.distractionBlocking}
                          onChange={(e) => setCurrentConfig(prev => ({ ...prev, distractionBlocking: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].distractionBlocking}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t[currentLang].learningProgressSettings}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t[currentLang].difficultyProgression}
                      </label>
                      <select
                        value={currentConfig.difficultyProgression}
                        onChange={(e) => setCurrentConfig(prev => ({ ...prev, difficultyProgression: e.target.value as SessionConfig['difficultyProgression'] }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="static">{t[currentLang].fixedDifficulty}</option>
                        <option value="adaptive">{t[currentLang].adaptiveAdjustment}</option>
                        <option value="increasing">{t[currentLang].gradualIncrease}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t[currentLang].sessionEndAction}
                      </label>
                      <select
                        value={currentConfig.sessionEndAction}
                        onChange={(e) => setCurrentConfig(prev => ({ ...prev, sessionEndAction: e.target.value as SessionConfig['sessionEndAction'] }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="auto_continue">{t[currentLang].autoContinue}</option>
                        <option value="manual_continue">{t[currentLang].manualContinue}</option>
                        <option value="force_break">{t[currentLang].forceBreak}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setCurrentConfig({
                      sessionLength: 25,
                      breakLength: 5,
                      longBreakLength: 15,
                      sessionsBeforeLongBreak: 4,
                      autoBreakReminder: true,
                      focusMode: 'pomodoro',
                      targetProblemsPerSession: 10,
                      difficultyProgression: 'adaptive',
                      reminderSound: true,
                      backgroundMusic: false,
                      distractionBlocking: false,
                      sessionEndAction: 'manual_continue'
                    })}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
{t[currentLang].reset}
                  </button>
                  <button
                    onClick={() => saveConfig(currentConfig)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {t[currentLang].saveSettings}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}