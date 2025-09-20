// Database type definitions

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

export interface SubjectiveFeedbackData {
  understood: boolean; // Whether understood (true: understood, false: not understood)
  confidence?: 'high' | 'medium' | 'low'; // Confidence level
  wasGuessing?: boolean; // Whether it was a guess
  perceivedDifficulty?: 1 | 2 | 3 | 4 | 5; // Perceived difficulty
}

export interface HistoryEntry {
  id?: number;
  problemId: number;
  category: string;
  isCorrect: boolean;
  timestamp: Date;
  userAnswer?: boolean | number;
  questionText?: string;
  subjectiveFeedback?: SubjectiveFeedbackData; // Subjective feedback
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

// Quiz session management
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

// Backup data structure
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

// Application settings
export interface AppSettings {
  darkMode: boolean;
  language: 'ja' | 'en';
  autoBackupInterval: number; // minutes
  maxBackupGenerations: number;
}

// Statistics data
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

// Study diary
export interface StudyDiaryEntry {
  id?: number;
  date: string; // YYYY-MM-DD format
  title: string;
  content: string;
  mood?: 'excellent' | 'good' | 'okay' | 'challenging' | 'difficult';
  studyTime?: number; // minutes
  topics: string[];
  achievements: string[];
  challenges: string[];
  goals: string[];
  quizSessionIds?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

// Study goals
export interface StudyGoal {
  id?: number;
  title: string;
  description?: string;
  targetDate?: Date;
  isCompleted: boolean;
  createdAt: Date;
  completedAt?: Date;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

// Step 1: Learning analytics data collection type definitions
export interface AnswerAnalytics {
  id?: number;
  sessionId: string;
  problemId: number;
  // Answer data
  answerStartTime: Date;
  answerSubmitTime: Date;
  responseTime: number; // milliseconds
  isCorrect: boolean;
  selectedAnswer: boolean | number;
  // Behavioral pattern data
  timeToFirstClick?: number; // Time from problem display to first click
  answerChangeCount: number; // Number of answer changes
  wasWindowFocused: boolean; // Window focus state
  // Subjective feedback
  confidenceLevel?: 'high' | 'medium' | 'low'; // Confidence level
  wasCasualAnswer: boolean; // Self-reported casual answer
  perceivedDifficulty?: 1 | 2 | 3 | 4 | 5; // Perceived difficulty
  createdAt: Date;
}

export interface SessionAnalytics {
  id?: number;
  sessionId: string;
  userId?: string;
  // Overall session data
  sessionStartTime: Date;
  sessionEndTime?: Date;
  totalProblems: number;
  completedProblems: number;
  // Context information
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number; // 0-6
  sessionDuration?: number; // milliseconds
  averageResponseTime?: number;
  timeSinceLastSession?: number; // hours
  // Learning quality indicators
  focusedTime: number; // Focused time
  casualAnswerCount: number; // Number of casual answers
  reliabilityScore: number; // Reliability score 0-1
  createdAt: Date;
}

export interface LearningPattern {
  id?: number;
  userId?: string;
  // Personal learning profile
  averageResponseTime: number;
  normalResponseTimeRange: [number, number]; // [min, max]
  optimalSessionLength: number; // minutes
  peakPerformanceHours: number[]; // Array of 0-23
  fatigueThreshold: number; // minutes
  // Behavioral patterns
  casualAnswerPattern: {
    timeThreshold: number;
    sequenceThreshold: number;
  };
  focusRetentionPattern: {
    sessionLength: number;
    qualityDeclinePoint: number;
  };
  lastUpdated: Date;
}

// Reliability assessment results
export interface ReliabilityAssessment {
  id?: number;
  answerAnalyticsId: number;
  reliabilityScore: number; // 0-1
  flags: string[]; // ['too_fast', 'same_choice_sequence', 'unfocused']
  weight: number; // For statistical weighting
  assessmentReason: string;
  createdAt: Date;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}