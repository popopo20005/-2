import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import toast from 'react-hot-toast';

// ポモドーロタイマーの設定型
export interface PomodoroSettings {
  workDuration: number; // 作業時間（分）
  breakDuration: number; // 休憩時間（分）
  longBreakDuration: number; // 長い休憩時間（分）
  longBreakInterval: number; // 長い休憩までのセッション数
  autoStart: boolean; // 自動開始
  soundEnabled: boolean; // 音声通知
  volume: number; // 音量 (0-1)
}

// デフォルト設定
const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStart: false,
  soundEnabled: true,
  volume: 0.5,
};

// タイマーモード
export type TimerMode = 'work' | 'break' | 'longBreak';

interface PomodoroState {
  settings: PomodoroSettings;
  mode: TimerMode;
  timeLeft: number; // 秒
  isRunning: boolean;
  sessionsCompleted: number;
}

interface PomodoroContextType extends PomodoroState {
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  updateSettings: (settings: PomodoroSettings) => void;
  formatTime: (seconds: number) => string;
  getProgress: () => number;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function usePomodoroContext() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoroContext must be used within PomodoroProvider');
  }
  return context;
}

interface PomodoroProviderProps {
  children: ReactNode;
}

export function PomodoroProvider({ children }: PomodoroProviderProps) {
  // LocalStorageから設定を読み込み
  const loadSettings = (): PomodoroSettings => {
    const saved = localStorage.getItem('pomodoroSettings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  };

  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 言語設定
  const language = localStorage.getItem('language') || 'ja';

  const translations = {
    ja: {
      workComplete: '集中時間が終了しました！',
      breakComplete: '休憩時間が終了しました！',
      longBreakComplete: '長い休憩が終了しました！',
      takeBreak: '休憩しましょう',
      backToWork: '作業に戻りましょう',
    },
    en: {
      workComplete: 'Focus time completed!',
      breakComplete: 'Break time completed!',
      longBreakComplete: 'Long break completed!',
      takeBreak: "Let's take a break",
      backToWork: "Let's get back to work",
    },
  };

  const t = translations[language as keyof typeof translations];

  // Web Audio API で通知音を生成
  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(settings.volume, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, [settings.soundEnabled, settings.volume]);

  // タイマーの完了処理
  const handleTimerComplete = useCallback(() => {
    playNotificationSound();

    if (mode === 'work') {
      const newSessionsCompleted = sessionsCompleted + 1;
      setSessionsCompleted(newSessionsCompleted);

      // 長い休憩か通常の休憩かを判定
      if (newSessionsCompleted % settings.longBreakInterval === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        toast.success(t.workComplete + ' ' + t.takeBreak, {
          icon: '🎉',
          duration: 5000,
        });
      } else {
        setMode('break');
        setTimeLeft(settings.breakDuration * 60);
        toast.success(t.workComplete + ' ' + t.takeBreak, {
          icon: '✅',
          duration: 5000,
        });
      }
    } else {
      // 休憩完了
      setMode('work');
      setTimeLeft(settings.workDuration * 60);
      const message = mode === 'longBreak' ? t.longBreakComplete : t.breakComplete;
      toast.success(message + ' ' + t.backToWork, {
        icon: '💪',
        duration: 5000,
      });
    }

    // 自動開始が有効な場合は次のセッションを開始
    if (settings.autoStart) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, [mode, sessionsCompleted, settings, playNotificationSound, t]);

  // タイマーのカウントダウン
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, handleTimerComplete]);

  // 時間のフォーマット (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 進捗率の計算
  const getProgress = (): number => {
    const totalDuration =
      mode === 'work'
        ? settings.workDuration * 60
        : mode === 'break'
        ? settings.breakDuration * 60
        : settings.longBreakDuration * 60;

    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  // タイマーの開始
  const startTimer = () => {
    setIsRunning(true);
  };

  // タイマーの停止
  const pauseTimer = () => {
    setIsRunning(false);
  };

  // タイマーのリセット
  const resetTimer = () => {
    setIsRunning(false);
    if (mode === 'work') {
      setTimeLeft(settings.workDuration * 60);
    } else if (mode === 'break') {
      setTimeLeft(settings.breakDuration * 60);
    } else {
      setTimeLeft(settings.longBreakDuration * 60);
    }
  };

  // 設定の更新
  const updateSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));

    // 現在のモードに合わせて時間をリセット
    if (!isRunning) {
      if (mode === 'work') {
        setTimeLeft(newSettings.workDuration * 60);
      } else if (mode === 'break') {
        setTimeLeft(newSettings.breakDuration * 60);
      } else {
        setTimeLeft(newSettings.longBreakDuration * 60);
      }
    }
  };

  const value: PomodoroContextType = {
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
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}
