import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
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
        return 'text-red-400';
      case 'break':
        return 'text-[#34D399]';
      case 'longBreak':
        return 'text-[#818CF8]';
    }
  };

  const getModeBackgroundStyle = (): React.CSSProperties => {
    switch (mode) {
      case 'work':
        return { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' };
      case 'break':
        return { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' };
      case 'longBreak':
        return { background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' };
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

  const getProgressGradient = (): string => {
    switch (mode) {
      case 'work':
        return 'linear-gradient(90deg, #EF4444, #F87171)';
      case 'break':
        return 'linear-gradient(90deg, #10B981, #34D399)';
      case 'longBreak':
        return 'linear-gradient(90deg, #6366F1, #818CF8)';
    }
  };

  if (compact) {
    return (
      <div className="rounded-lg p-4" style={getModeBackgroundStyle()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🍅</div>
            <div>
              <div className={`text-sm font-semibold ${getModeColor()}`}>{getModeText()}</div>
              <div className="text-2xl font-bold text-[#F8FAFC]">{formatTime(timeLeft)}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={isRunning ? pauseTimer : startTimer}
              className={`px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${
                isRunning
                  ? 'bg-white/5 hover:bg-white/10 text-[#CBD5E1]'
                  : 'bg-[#6366F1] hover:bg-[#5558E6] text-white'
              }`}
            >
              {isRunning ? '⏸️' : '▶️'}
            </button>
            <button
              onClick={resetTimer}
              className="px-3 py-1.5 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-[#CBD5E1] transition-colors"
            >
              🔄
            </button>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${getProgress()}%` }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%', borderRadius: '9999px', background: getProgressGradient() }}
          />
        </div>
      </div>
    );
  }

  const totalDuration = mode === 'work' ? settings.workDuration * 60 : mode === 'break' ? settings.breakDuration * 60 : settings.longBreakDuration * 60;
  const isInitialState = timeLeft === totalDuration;

  return (
    <>
      <div className="rounded-2xl p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <span className="text-2xl">🍅</span>
            {t.title}
          </h2>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-[#CBD5E1] transition-colors"
          >
            ⚙️ {t.settings}
          </button>
        </div>

        <div className="rounded-xl p-8 mb-6" style={getModeBackgroundStyle()}>
          <div className={`text-center mb-4 text-lg font-semibold ${getModeColor()}`}>{getModeText()}</div>
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-[#F8FAFC] font-mono">{formatTime(timeLeft)}</div>
          </div>
          <div className="mb-6 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgress()}%` }}
              transition={{ duration: 0.3 }}
              style={{ height: '100%', borderRadius: '9999px', background: getProgressGradient() }}
            />
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={isRunning ? pauseTimer : startTimer}
              className={`px-6 py-3 text-base font-medium rounded-xl transition-colors ${
                isRunning
                  ? 'bg-white/5 hover:bg-white/10 text-[#CBD5E1]'
                  : 'bg-[#6366F1] hover:bg-[#5558E6] text-white'
              }`}
            >
              {isRunning ? `⏸️ ${t.pause}` : isInitialState ? `▶️ ${t.start}` : `▶️ ${t.resume}`}
            </button>
            <button
              onClick={resetTimer}
              className="px-6 py-3 text-base font-medium rounded-xl bg-white/5 hover:bg-white/10 text-[#CBD5E1] transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              🔄 {t.reset}
            </button>
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-[#94A3B8] mb-2">{t.sessionsCompleted}</div>
          <div className="flex justify-center gap-1">
            {Array.from({ length: Math.min(sessionsCompleted, 12) }).map((_, i) => (
              <span key={i} className="text-2xl">
                🍅
              </span>
            ))}
            {sessionsCompleted > 12 && <span className="text-lg text-[#94A3B8] ml-2">+{sessionsCompleted - 12}</span>}
          </div>
        </div>
      </div>

      {/* プリセットカード */}
      <div className="mt-6">
        <h3 className="text-lg font-bold text-[#F8FAFC] mb-3">{t.presets}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="rounded-2xl p-4 cursor-pointer transition-colors hover:bg-white/5"
              style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => applyPreset(preset.settings)}
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl">{preset.emoji}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#F8FAFC] mb-1">{preset.name}</h4>
                  <p className="text-sm text-[#94A3B8] mb-3">{preset.desc}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#CBD5E1] mb-3">
                    <div>
                      <span className="font-semibold">{t.work}:</span> {preset.settings.workDuration}分
                    </div>
                    <div>
                      <span className="font-semibold">{t.break}:</span> {preset.settings.breakDuration}分
                    </div>
                  </div>
                  <button
                    className="w-full px-4 py-2 text-sm font-medium rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyPreset(preset.settings);
                    }}
                  >
                    {t.applyPreset}
                  </button>
                </div>
              </div>
            </div>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-[#F8FAFC] mb-6">⚙️ {t.settings}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">{t.workDuration}</label>
            <input
              type="number"
              min="1"
              max="60"
              value={localSettings.workDuration}
              onChange={(e) => handleChange('workDuration', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">{t.breakDuration}</label>
            <input
              type="number"
              min="1"
              max="30"
              value={localSettings.breakDuration}
              onChange={(e) => handleChange('breakDuration', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">{t.longBreakDuration}</label>
            <input
              type="number"
              min="1"
              max="60"
              value={localSettings.longBreakDuration}
              onChange={(e) => handleChange('longBreakDuration', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">{t.longBreakInterval}</label>
            <input
              type="number"
              min="2"
              max="10"
              value={localSettings.longBreakInterval}
              onChange={(e) => handleChange('longBreakInterval', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
              {t.volume}: {Math.round(localSettings.volume * 100)}%
            </label>
            <input type="range" min="0" max="1" step="0.1" value={localSettings.volume} onChange={(e) => handleChange('volume', parseFloat(e.target.value))} className="w-full accent-[#6366F1]" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[#CBD5E1]">{t.autoStart}</label>
            <input type="checkbox" checked={localSettings.autoStart} onChange={(e) => handleChange('autoStart', e.target.checked)} className="w-5 h-5 accent-[#6366F1] rounded" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[#CBD5E1]">{t.soundEnabled}</label>
            <input type="checkbox" checked={localSettings.soundEnabled} onChange={(e) => handleChange('soundEnabled', e.target.checked)} className="w-5 h-5 accent-[#6366F1] rounded" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSave(localSettings)}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white transition-colors"
          >
            💾 {t.save}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-[#CBD5E1] transition-colors"
          >
            ❌ {t.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
