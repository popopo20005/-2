// データベースの型定義

export interface Category {
  name: string;
}

export interface Problem {
  id?: number;
  category: string;
  question: string;
  answer?: boolean;
  explanation: string;
  type?: 'true-false' | 'multiple-choice';
  options?: string[];
  correctAnswer?: number;
}

export interface HistoryEntry {
  id?: number;
  problemId: number;
  category: string;
  isCorrect: boolean;
  timestamp: Date;
  userAnswer?: boolean | number;
  questionText?: string;
}

export interface QuizSet {
  id?: number;
  name: string;
  description?: string;
  problemIds: number[];
  subjects?: string[];
  subjectMap?: Record<string, number[]>;
  stats?: Record<string, QuizSetStats>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuizSetStats {
  totalAnswered: number;
  totalCorrect: number;
  lastPlayed: Date;
  accuracy: number;
}

// クイズセッション管理用
export interface QuizSession {
  id: string;
  quizSetId?: number;
  category?: string;
  problems: Problem[];
  currentIndex: number;
  score: number;
  answers: (boolean | number)[];
  startTime: Date;
  isCompleted: boolean;
  isPaused: boolean;
  pausedAt?: Date;
  resumedAt?: Date;
  lastSaved?: Date;
  completedAt?: Date;
}

// バックアップデータ構造
export interface BackupData {
  id?: number;
  timestamp: Date;
  data: {
    categories: Category[];
    problems: Problem[];
    history: HistoryEntry[];
    quizSets: QuizSet[];
  };
  type: 'auto' | 'manual';
  version: string;
}

// アプリケーション設定
export interface AppSettings {
  darkMode: boolean;
  language: 'ja' | 'en';
  autoBackupInterval: number; // minutes
  maxBackupGenerations: number;
}

// 統計データ
export interface StatsData {
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
  categoryStats: Record<string, {
    answered: number;
    correct: number;
    accuracy: number;
  }>;
  worstProblems: Array<{
    problem: Problem;
    incorrectCount: number;
    totalAnswered: number;
  }>;
  quizSetStats: Array<{
    quizSet: QuizSet;
    stats: QuizSetStats;
  }>;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}