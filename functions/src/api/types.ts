/**
 * API リクエスト/レスポンス型定義
 *
 * フロントエンド (src/types/) の型と互換性を保つが、
 * APIレイヤー固有の型（リクエストボディ、レスポンス）を定義する。
 */

// ============================================================
// Problem
// ============================================================

export interface ApiProblem {
  id: string;
  category: string;
  question: string;
  answer?: boolean;
  explanation: string;
  type?: 'true-false' | 'multiple-choice' | 'multi-select';
  options?: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  userNotes?: string;
  noteTags?: string[];
  tags?: string[];
  subtopic?: string;
  importanceScore?: number;
  sourceExamYear?: number;
  sourceExamName?: string;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProblemRequest {
  category: string;
  question: string;
  explanation: string;
  answer?: boolean;
  type?: 'true-false' | 'multiple-choice' | 'multi-select';
  options?: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  tags?: string[];
  subtopic?: string;
  importanceScore?: number;
  sourceExamYear?: number;
  sourceExamName?: string;
  userNotes?: string;
}

export interface UpdateProblemRequest extends Partial<CreateProblemRequest> {
  id: string;
}

export interface BulkImportRequest {
  problems: CreateProblemRequest[];
  quizSetName?: string;
  quizSetDescription?: string;
}

export interface BulkImportResponse {
  importedCount: number;
  problemIds: string[];
  quizSetId?: string;
  errors: Array<{ index: number; error: string }>;
}

// ============================================================
// QuizSet
// ============================================================

export interface ApiQuizSet {
  id: string;
  name: string;
  description?: string;
  problemIds: string[];
  subjects?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateQuizSetRequest {
  name: string;
  description?: string;
  problemIds: string[];
  subjects?: string[];
}

export interface UpdateQuizSetRequest extends Partial<CreateQuizSetRequest> {
  id: string;
}

// ============================================================
// Statistics
// ============================================================

export interface ApiDailyStatistics {
  date: string;
  problemsSolved: number;
  correctCount: number;
  accuracy: number;
  studyTime: number;
  categories: string[];
}

export interface ApiWeeklyStatistics {
  weekStart: string;
  weekEnd: string;
  totalProblems: number;
  totalCorrect: number;
  averageAccuracy: number;
  totalStudyTime: number;
  studyDays: number;
  dailyStats: ApiDailyStatistics[];
}

export interface ApiMonthlyStatistics {
  year: number;
  month: number;
  totalProblems: number;
  totalCorrect: number;
  averageAccuracy: number;
  totalStudyTime: number;
  studyDays: number;
}

export interface StatisticsSummary {
  totalProblems: number;
  totalCorrect: number;
  accuracy: number;
  totalStudyTime: number;
  studyDays: number;
}

export interface CategoryStat {
  category: string;
  totalProblems: number;
  correctCount: number;
  accuracy: number;
  lastStudied: string | null;
}

// ============================================================
// StudyPlan
// ============================================================

export type ExamType = 'midterm' | 'final' | 'mock' | 'entrance' | 'certification';
export type StudyMode = 'balanced' | 'weakness-focused' | 'review-only' | 'new-only';

export interface ApiStudyPlan {
  id: string;
  name: string;
  examDate: string;
  examType?: ExamType;
  targetScore?: number;
  currentLevel?: number;
  targetCategories: string[];
  availableTimePerDay: number;
  studyDaysOfWeek: number[];
  studyMode?: StudyMode;
  isActive: boolean;
  isCompleted: boolean;
  isPaused: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStudyPlanRequest {
  name: string;
  examDate: string;
  examType?: ExamType;
  targetScore?: number;
  targetCategories: string[];
  availableTimePerDay: number;
  studyDaysOfWeek: number[];
  studyMode?: StudyMode;
}

export interface UpdateStudyPlanRequest extends Partial<CreateStudyPlanRequest> {
  id: string;
  isActive?: boolean;
  isCompleted?: boolean;
  isPaused?: boolean;
}

// ============================================================
// Common
// ============================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
