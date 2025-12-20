import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { usePomodoroContext, type PomodoroSettings } from '../contexts/PomodoroContext';

interface PomodoroTimerProps {
  compact?: boolean;
}

export function PomodoroTimer({ compact = false }: PomodoroTimerProps) {
  const {
    settings,
    mode,
    timeLeft,
    isRunning,
    sessionsCompleted,
    startTimer,
    pauseTimer,
    resetTimer,
    updateSettings,
    formatTime,
    getProgress,
  } = usePomodoroContext();

  const [showSettings, setShowSettings] = useState(false);
  const language = localStorage.getItem('language') || 'ja';

  const translations = {
    ja: {
      title: 'ポモドーロタイマー',
      work: '集中時間',
      break: '休憩時間',
      longBreak: '長い休憩',
      start: '開始',
      pause: '一時停止',
      resume: '再開',
      reset: 'リセット',
      settings: '設定',
      sessionsCompleted: '完了セッション',
      workDuration: '作業時間（分）',
      breakDuration: '休憩時間（分）',
      longBreakDuration: '長い休憩（分）',
      longBreakInterval: '長い休憩の間隔',
      autoStart: '自動開始',
      soundEnabled: '音声通知',
      volume: '音量',
      save: '保存',
      cancel: 'キャンセル',
      presets: 'プリセット',
      applyPreset: 'この設定を適用',
      pomodoro: 'ポモドーロテクニック',
      pomodoroDesc: '25分学習＋5分休憩の効果的な学習法',
      deepWork: 'ディープワーク',
      deepWorkDesc: '90分の深い集中時間で高度な学習',
      lightLearning: 'ライト学習',
      lightLearningDesc: '15分の軽い学習セッション',
      customOptimized: 'カスタム最適化',
      customOptimizedDesc: 'あなたの学習パターンに基づく個人最適設定',
    },
    en: {
      title: 'Pomodoro Timer',
      work: 'Focus Time',
      break: 'Break Time',
      longBreak: 'Long Break',
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      reset: 'Reset',
      settings: 'Settings',
      sessionsCompleted: 'Sessions',
      workDuration: 'Work Duration (min)',
      breakDuration: 'Break Duration (min)',
      longBreakDuration: 'Long Break (min)',
      longBreakInterval: 'Long Break Interval',
      autoStart: 'Auto Start',
      soundEnabled: 'Sound Notification',
      volume: 'Volume',
      save: 'Save',
      cancel: 'Cancel',
      presets: 'Presets',
      applyPreset: 'Apply Settings',
      pomodoro: 'Pomodoro Technique',
      pomodoroDesc: '25min study + 5min break effective learning',
      deepWork: 'Deep Work',
      deepWorkDesc: '90min deep focus for advanced learning',
      lightLearning: 'Light Learning',
      lightLearningDesc: '15min light study session',
      customOptimized: 'Custom Optimized',
      customOptimizedDesc: 'Personal optimization based on your patterns',
    },
  };

  const t = translations[language as keyof typeof translations];

  // プリセット定義
  const presets = [
    {
      id: 'pomodoro',
      name: t.pomodoro,
      desc: t.pomodoroDesc,
      icon: '🍅',
      emoji: '🍅',
      settings: {
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        autoStart: false,
        soundEnabled: true,
        volume: 0.5,
      } as PomodoroSettings,
    },
    {
      id: 'deepWork',
      name: t.deepWork,
      desc: t.deepWorkDesc,
      icon: '🧠',
      emoji: '🧠',
      settings: {
        workDuration: 90,
        breakDuration: 20,
        longBreakDuration: 30,
        longBreakInterval: 2,
        autoStart: false,
        soundEnabled: true,
        volume: 0.5,
      } as PomodoroSettings,
    },
    {
      id: 'lightLearning',
      name: t.lightLearning,
      desc: t.lightLearningDesc,
      icon: '💡',
      emoji: '💡',
      settings: {
        workDuration: 15,
        breakDuration: 3,
        longBreakDuration: 10,
        longBreakInterval: 4,
        autoStart: false,
        soundEnabled: true,
        volume: 0.5,
      } as PomodoroSettings,
    },
    {
      id: 'custom',
      name: t.customOptimized,
      desc: t.customOptimizedDesc,
      icon: '⚙️',
      emoji: '⚙️',
      settings: {
        workDuration: 30,
        breakDuration: 7,
        longBreakDuration: 20,
        longBreakInterval: 3,
        autoStart: false,
        soundEnabled: true,
        volume: 0.5,
      } as PomodoroSettings,
    },
  ];

  const applyPreset = (presetSettings: PomodoroSettings) => {
    updateSettings(presetSettings);
    resetTimer();
    toast.success(language === 'ja' ? 'プリセットを適用しました' : 'Preset applied');
  };

  const saveSettings = (newSettings: PomodoroSettings) => {
    updateSettings(newSettings);
    setShowSettings(false);
    toast.success(language === 'ja' ? '設定を保存しました' : 'Settings saved');
  };

  const getModeColor = (): string => {
    switch (mode) {
      case 'work':
        return 'text-red-600 dark:text-red-400';
      case 'break':
        return 'text-green-600 dark:text-green-400';
      case 'longBreak':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getModeBackground = (): string => {
    switch (mode) {
      case 'work':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'break':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'longBreak':
        return 'bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getModeText = (): string => {
    switch (mode) {
      case 'work':
        return t.work;
      case 'break':
        return t.break;
      case 'longBreak':
        return t.longBreak;
    }
  };

  const getProgressColor = (): string => {
    switch (mode) {
      case 'work':
        return 'bg-red-500';
      case 'break':
        return 'bg-green-500';
      case 'longBreak':
        return 'bg-blue-500';
    }
  };

  if (compact) {
    return (
      <div className={`${getModeBackground()} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🍅</div>
            <div>
              <div className={`text-sm font-semibold ${getModeColor()}`}>{getModeText()}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(timeLeft)}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant={isRunning ? 'secondary' : 'primary'} size="sm" onClick={isRunning ? pauseTimer : startTimer}>
              {isRunning ? '⏸️' : '▶️'}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetTimer}>
              🔄
            </Button>
          </div>
        </div>
        <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={getProgressColor()}
            initial={{ width: 0 }}
            animate={{ width: `${getProgress()}%` }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%' }}
          />
        </div>
      </div>
    );
  }

  const totalDuration = mode === 'work' ? settings.workDuration * 60 : mode === 'break' ? settings.breakDuration * 60 : settings.longBreakDuration * 60;
  const isInitialState = timeLeft === totalDuration;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🍅</span>
              {t.title}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              ⚙️ {t.settings}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className={`${getModeBackground()} rounded-xl p-8 mb-6`}>
            <div className={`text-center mb-4 text-lg font-semibold ${getModeColor()}`}>{getModeText()}</div>
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-gray-900 dark:text-white font-mono">{formatTime(timeLeft)}</div>
            </div>
            <div className="mb-6 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={getProgressColor()}
                initial={{ width: 0 }}
                animate={{ width: `${getProgress()}%` }}
                transition={{ duration: 0.3 }}
                style={{ height: '100%' }}
              />
            </div>
            <div className="flex justify-center gap-3">
              <Button variant={isRunning ? 'secondary' : 'primary'} onClick={isRunning ? pauseTimer : startTimer} size="lg">
                {isRunning ? `⏸️ ${t.pause}` : isInitialState ? `▶️ ${t.start}` : `▶️ ${t.resume}`}
              </Button>
              <Button variant="outline" onClick={resetTimer} size="lg">
                🔄 {t.reset}
              </Button>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t.sessionsCompleted}</div>
            <div className="flex justify-center gap-1">
              {Array.from({ length: Math.min(sessionsCompleted, 12) }).map((_, i) => (
                <span key={i} className="text-2xl">
                  🍅
                </span>
              ))}
              {sessionsCompleted > 12 && <span className="text-lg text-gray-600 dark:text-gray-400 ml-2">+{sessionsCompleted - 12}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* プリセットカード */}
      <div className="mt-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t.presets}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {presets.map((preset) => (
            <Card key={preset.id} hoverable clickable onClick={() => applyPreset(preset.settings)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{preset.emoji}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">{preset.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{preset.desc}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300 mb-3">
                      <div>
                        <span className="font-semibold">{t.work}:</span> {preset.settings.workDuration}分
                      </div>
                      <div>
                        <span className="font-semibold">{t.break}:</span> {preset.settings.breakDuration}分
                      </div>
                    </div>
                    <Button variant="primary" size="sm" className="w-full" onClick={(e) => {
                      e.stopPropagation();
                      applyPreset(preset.settings);
                    }}>
                      {t.applyPreset}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AnimatePresence>{showSettings && <SettingsModal settings={settings} onSave={saveSettings} onCancel={() => setShowSettings(false)} translations={t} />}</AnimatePresence>
    </>
  );
}

interface SettingsModalProps {
  settings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
  onCancel: () => void;
  translations: any;
}

function SettingsModal({ settings, onSave, onCancel, translations: t }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key: keyof PomodoroSettings, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">⚙️ {t.settings}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.workDuration}</label>
            <input type="number" min="1" max="60" value={localSettings.workDuration} onChange={(e) => handleChange('workDuration', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.breakDuration}</label>
            <input type="number" min="1" max="30" value={localSettings.breakDuration} onChange={(e) => handleChange('breakDuration', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.longBreakDuration}</label>
            <input type="number" min="1" max="60" value={localSettings.longBreakDuration} onChange={(e) => handleChange('longBreakDuration', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.longBreakInterval}</label>
            <input type="number" min="2" max="10" value={localSettings.longBreakInterval} onChange={(e) => handleChange('longBreakInterval', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.volume}: {Math.round(localSettings.volume * 100)}%
            </label>
            <input type="range" min="0" max="1" step="0.1" value={localSettings.volume} onChange={(e) => handleChange('volume', parseFloat(e.target.value))} className="w-full" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.autoStart}</label>
            <input type="checkbox" checked={localSettings.autoStart} onChange={(e) => handleChange('autoStart', e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.soundEnabled}</label>
            <input type="checkbox" checked={localSettings.soundEnabled} onChange={(e) => handleChange('soundEnabled', e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="primary" onClick={() => onSave(localSettings)} className="flex-1">
            💾 {t.save}
          </Button>
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            ❌ {t.cancel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
