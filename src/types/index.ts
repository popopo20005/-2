// Database type definitions

export interface Category {
  name: string;
}

export interface Problem {
  id?: number;
  uuid?: string; // グローバル一意ID（複数端末同期用）
  category: string;
  question: string;
  answer?: boolean;
  explanation: string;
  type?: 'true-false' | 'multiple-choice' | 'multi-select';
  options?: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  // 学習メモ機能
  userNotes?: string;
  noteUpdatedAt?: Date;
  noteTags?: string[];
  // お気に入り機能
  isFavorite?: boolean;
  favoritedAt?: Date;
  // タグ機能
  tags?: string[];
  taggedAt?: Date;
  // サブトピック重要度 (頻出度分析)
  subtopic?: string;
  importanceScore?: number;       // 1.0-2.0
  importanceSource?: 'preset' | 'ai' | 'manual';
  // 過去問出典情報
  sourceExamYear?: number;
  sourceExamName?: string;
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
  userAnswer?: boolean | number | number[];
  questionText?: string;
  subjectiveFeedback?: SubjectiveFeedbackData; // Subjective feedback
  responseTime?: number; // 解答時間（ミリ秒）
}

export interface QuizSet {
  id?: number;
  uuid?: string; // グローバル一意ID（複数端末同期用）
  name: string;
  description?: string;
  problemIds: number[];
  problemUuids?: string[]; // UUID参照用（将来的にproblemIdsを置き換え）
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
  answers: (boolean | number | number[])[];
  startTime: Date;
  isCompleted: boolean;
  isPaused: boolean;
  pausedAt?: Date;
  resumedAt?: Date;
  lastSaved?: Date;
  completedAt?: Date;
  elapsedTime?: number; // 経過時間（秒）- 一時停止時に保存
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
  selectedAnswer: boolean | number | number[];
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

// SM-2 Spaced Repetition Types
export interface SpacedRepetitionCard {
  id?: number;
  problemId: number;
  // Context tracking - allows same problem to be reviewed in different contexts
  quizSetId?: number; // Quiz set this card belongs to (null for general cards)
  name?: string; // Custom name for the card (e.g., "基本問題", "重要問題")
  // SM-2 algorithm parameters
  easinessFactor: number; // E-Factor (default: 2.5, range: 1.3+)
  repetitions: number; // Number of consecutive correct repetitions
  interval: number; // Days until next review
  // Review scheduling
  nextReviewDate: Date; // Next scheduled review date
  lastReviewDate?: Date; // Last review date
  // Performance tracking
  totalReviews: number; // Total number of reviews
  correctReviews: number; // Number of correct reviews
  accuracy: number; // Overall accuracy percentage
  // Card state
  isNew: boolean; // Whether this is a new card
  isDue: boolean; // Whether the card is due for review
  isLearning: boolean; // Whether card is in learning phase (repetitions < 2)
  // Memory stage (optional for backward compatibility)
  memoryStage?: 'acquisition' | 'consolidation' | 'storage' | 'automaticity';
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  category?: string; // Problem category for filtering
}

export interface ReviewSession {
  id?: number;
  sessionId: string;
  // Session info
  startTime: Date;
  endTime?: Date;
  totalCards: number;
  reviewedCards: number;
  // Performance
  correctCount: number;
  incorrectCount: number;
  averageQuality: number; // Average quality score 0-5
  // Review stats
  newCards: number;
  learningCards: number;
  dueCards: number;
  createdAt: Date;
}

export interface ReviewResult {
  quality: number; // 0-5 quality score (0: total blackout, 5: perfect response)
  responseTime: number; // milliseconds
  wasCorrect: boolean;
}

// Quiz Set Group Name Mapping
export interface QuizSetGroupName {
  id?: number;
  quizSetId: string; // e.g., "1-3" for combined quiz sets
  name: string; // Custom name for this group
  createdAt: Date;
}

// Card List for Sharing (problem IDs only - for QR code)
export interface SharedCardList {
  name: string; // Name of the card list
  description?: string; // Optional description
  problemIds: number[]; // Only problem IDs (receiver must have same problems in DB)
  // Optional: include learning progress data
  progressData?: Array<{
    problemId: number;
    totalReviews: number;
    accuracy: number;
  }>;
  createdAt: Date;
}

// Card List for File Sharing (full data including problems)
export interface SharedCardListFull {
  name: string; // Name of the card list
  description?: string; // Optional description
  cards: Array<{
    problem: Problem; // Full problem data
    totalReviews?: number;
    accuracy?: number;
  }>;
  createdAt: Date;
}

// Study Time Session Tracking
export interface StudyTimeSession {
  id?: number;
  startTime: Date;
  endTime?: Date;
  duration: number; // 秒
  problemCount: number;
  correctCount: number;
  quizSetId?: number;
  category?: string;
  sessionType: 'quiz' | 'review' | 'spacedRepetition' | 'practice';
  isPaused: boolean;
  pausedDuration?: number; // 一時停止時間（秒）
  createdAt: Date;
}

// Undo/Redo Action History (Phase 1, Task 1.2)
export interface ActionHistory {
  id: string; // UUID
  type: 'delete' | 'edit' | 'create';
  entity: 'quizSet' | 'problem' | 'category';
  data: any; // 削除されたオブジェクト全体
  timestamp: Date;
  expiresAt: Date; // timestamp + 5秒
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// View types
export type View = 'menu' | 'quiz' | 'podcast' | 'editor' | 'quizSets' | 'stats' | 'history' | 'settings' | 'migration' | 'backup' | 'advancedBackup' | 'share' | 'qrShare' | 'exam' | 'categoryQuiz' | 'allCategoryQuiz' | 'problemEdit' | 'quizSetStats' | 'diary' | 'insights' | 'recommendations' | 'sessionSettings' | 'reminderSettings' | 'difficultySettings' | 'spacedRepetition' | 'spacedRepetitionManager' | 'spacedRepetitionReview' | 'guide' | 'pomodoro' | 'weaknessAnalysis' | 'goalManager' | 'noteManager' | 'favorites' | 'templateManager' | 'allFeatures' | 'studyPlan' | 'studyPlanDashboard' | 'aiGenerator' | 'promptGenerator' | 'pricing' | 'paymentSuccess' | 'paymentCancel' | 'pastExamAnalysis' | 'badges' | 'smartNotes' | 'subtopicAnalysis' | 'pdcaCycle' | 'create' | 'review' | 'more' | 'promptWizard' | 'aiHandoff' | 'quizSetManage';

export interface QuizParams {
  quizSetId?: number;
  useLatestOnly?: boolean;
  problemCount?: number | 'all';
  mode?: 'quizSetWorstProblems' | 'categoryQuiz' | 'review' | 'resume';
  category?: string;
  problemIds?: number[];
  sessionId?: string;
}

// Note Template types
export interface NoteTemplate {
  id?: number;
  name: string;
  emoji?: string;
  content: string;
  category?: 'learning' | 'error' | 'solution' | 'reference' | 'custom';
  isDefault?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Notebook template types
export type NotebookTemplateType = 'standard' | 'review' | 'exam' | 'flashcard' | 'diary';

export interface NotebookTemplate {
  type: NotebookTemplateType;
  name: string;
  emoji: string;
  description: string;
}

// Podcast Playlist types
export interface PodcastPlaylist {
  id?: number;
  name: string;
  description?: string;
  emoji?: string;
  quizSetIds: number[]; // 問題セットIDの配列
  totalProblems?: number; // 合計問題数（キャッシュ）
  createdAt: Date;
  updatedAt?: Date;
  lastPlayedAt?: Date;
  playCount?: number; // 再生回数
}

// Notification types
export * from './notification';

// Study Plan types (Phase 1: 試験日ベース学習プランナー)
export * from './studyPlan';