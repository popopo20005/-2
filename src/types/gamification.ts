/**
 * Gamification System Type Definitions
 * Phase 4: XP/Level/Badge/Achievement/Streak
 */

// ============================================
// Badge System
// ============================================

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeCategory = 'streak' | 'accuracy' | 'volume' | 'mastery' | 'special';

export interface BadgeDefinition {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: string; // lucide icon name
  condition: BadgeUnlockCondition;
  xpReward: number;
}

export interface BadgeUnlockCondition {
  type: 'streak' | 'totalProblems' | 'accuracy' | 'studyHours' | 'perfectQuiz' | 'consecutivePerfect' | 'timeOfDay';
  threshold: number;
  /** Optional: only count within specific time range (hour 0-23) */
  timeRange?: { start: number; end: number };
}

export interface UnlockedBadge {
  id?: number;
  badgeId: string;
  unlockedAt: Date;
  notified: boolean;
}

// ============================================
// XP & Level System
// ============================================

export interface UserProgress {
  id: 1; // Single row (singleton)
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // YYYY-MM-DD format
  totalPerfectQuizzes: number;
  consecutivePerfectQuizzes: number;
  updatedAt: Date;
}

/** Exponential level curve: each level requires more XP */
export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.3));
}

/** Calculate level from total XP */
export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  let accumulated = 0;
  while (accumulated + getXPForLevel(level) <= totalXP) {
    accumulated += getXPForLevel(level);
    level++;
  }
  return level;
}

/** Get XP progress within current level */
export function getXPProgress(totalXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  percentage: number;
} {
  let level = 1;
  let accumulated = 0;
  while (accumulated + getXPForLevel(level) <= totalXP) {
    accumulated += getXPForLevel(level);
    level++;
  }
  const currentLevelXP = totalXP - accumulated;
  const nextLevelXP = getXPForLevel(level);
  return {
    level,
    currentLevelXP,
    nextLevelXP,
    percentage: Math.min(100, (currentLevelXP / nextLevelXP) * 100),
  };
}

// ============================================
// Achievement System
// ============================================

export interface Achievement {
  id?: number;
  type: string;
  completedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface StreakRecord {
  id?: number;
  date: string; // YYYY-MM-DD
}

// ============================================
// XP Award Reasons
// ============================================

export const XP_AWARDS = {
  CORRECT_ANSWER: 10,
  PERFECT_QUIZ_BONUS: 50,
  STREAK_MILESTONE_7: 100,
  STREAK_MILESTONE_30: 300,
  STREAK_MILESTONE_100: 1000,
} as const;

// ============================================
// Tier Color Schemes
// ============================================

export const TIER_COLORS: Record<BadgeTier, {
  bg: string;
  bgDark: string;
  border: string;
  borderDark: string;
  icon: string;
  iconDark: string;
  glow: string;
}> = {
  bronze: {
    bg: 'bg-orange-50',
    bgDark: 'dark:bg-orange-900/20',
    border: 'border-orange-200',
    borderDark: 'dark:border-orange-700',
    icon: 'text-orange-600',
    iconDark: 'dark:text-orange-400',
    glow: 'rgba(234, 88, 12, 0.3)',
  },
  silver: {
    bg: 'bg-slate-50',
    bgDark: 'dark:bg-slate-800/40',
    border: 'border-slate-300',
    borderDark: 'dark:border-slate-600',
    icon: 'text-slate-600',
    iconDark: 'dark:text-slate-300',
    glow: 'rgba(148, 163, 184, 0.3)',
  },
  gold: {
    bg: 'bg-amber-50',
    bgDark: 'dark:bg-amber-900/20',
    border: 'border-amber-300',
    borderDark: 'dark:border-amber-600',
    icon: 'text-amber-600',
    iconDark: 'dark:text-amber-400',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  platinum: {
    bg: 'bg-purple-50',
    bgDark: 'dark:bg-purple-900/20',
    border: 'border-purple-300',
    borderDark: 'dark:border-purple-600',
    icon: 'text-purple-600',
    iconDark: 'dark:text-purple-400',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
};

// ============================================
// Badge Definitions (18 badges)
// ============================================

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── BRONZE TIER (4) ──
  {
    id: 'bronze_streak_3',
    name: '3日連続',
    nameEn: '3-Day Streak',
    description: '3日連続で学習しよう',
    descriptionEn: 'Study for 3 consecutive days',
    category: 'streak',
    tier: 'bronze',
    icon: 'flame',
    condition: { type: 'streak', threshold: 3 },
    xpReward: 50,
  },
  {
    id: 'bronze_problems_50',
    name: '50問達成',
    nameEn: '50 Problems',
    description: '累計50問に解答',
    descriptionEn: 'Answer 50 problems in total',
    category: 'volume',
    tier: 'bronze',
    icon: 'target',
    condition: { type: 'totalProblems', threshold: 50 },
    xpReward: 50,
  },
  {
    id: 'bronze_accuracy_70',
    name: '正確さの証',
    nameEn: 'Accuracy Proof',
    description: '正答率70%を達成',
    descriptionEn: 'Achieve 70% overall accuracy',
    category: 'accuracy',
    tier: 'bronze',
    icon: 'check-circle',
    condition: { type: 'accuracy', threshold: 70 },
    xpReward: 50,
  },
  {
    id: 'bronze_study_1h',
    name: '学習の始まり',
    nameEn: 'First Steps',
    description: '累計1時間学習',
    descriptionEn: 'Study for a total of 1 hour',
    category: 'mastery',
    tier: 'bronze',
    icon: 'book-open',
    condition: { type: 'studyHours', threshold: 1 },
    xpReward: 30,
  },

  // ── SILVER TIER (5) ──
  {
    id: 'silver_streak_7',
    name: '1週間の習慣',
    nameEn: 'Weekly Habit',
    description: '7日連続で学習',
    descriptionEn: 'Study for 7 consecutive days',
    category: 'streak',
    tier: 'silver',
    icon: 'zap',
    condition: { type: 'streak', threshold: 7 },
    xpReward: 100,
  },
  {
    id: 'silver_problems_200',
    name: '努力の結晶',
    nameEn: 'Dedicated Learner',
    description: '累計200問に解答',
    descriptionEn: 'Answer 200 problems in total',
    category: 'volume',
    tier: 'silver',
    icon: 'star',
    condition: { type: 'totalProblems', threshold: 200 },
    xpReward: 100,
  },
  {
    id: 'silver_accuracy_80',
    name: '正確性マスター',
    nameEn: 'Accuracy Master',
    description: '正答率80%を達成',
    descriptionEn: 'Achieve 80% overall accuracy',
    category: 'accuracy',
    tier: 'silver',
    icon: 'award',
    condition: { type: 'accuracy', threshold: 80 },
    xpReward: 100,
  },
  {
    id: 'silver_perfect_quiz',
    name: 'パーフェクト',
    nameEn: 'Perfect Score',
    description: 'クイズで全問正解',
    descriptionEn: 'Get a perfect score on a quiz',
    category: 'mastery',
    tier: 'silver',
    icon: 'trophy',
    condition: { type: 'perfectQuiz', threshold: 1 },
    xpReward: 150,
  },
  {
    id: 'silver_study_10h',
    name: '学習の鉄人',
    nameEn: 'Iron Student',
    description: '累計10時間学習',
    descriptionEn: 'Study for a total of 10 hours',
    category: 'mastery',
    tier: 'silver',
    icon: 'clock',
    condition: { type: 'studyHours', threshold: 10 },
    xpReward: 100,
  },

  // ── GOLD TIER (5) ──
  {
    id: 'gold_streak_30',
    name: '1ヶ月の継続',
    nameEn: 'Monthly Warrior',
    description: '30日連続で学習',
    descriptionEn: 'Study for 30 consecutive days',
    category: 'streak',
    tier: 'gold',
    icon: 'crown',
    condition: { type: 'streak', threshold: 30 },
    xpReward: 300,
  },
  {
    id: 'gold_problems_500',
    name: '上級者への道',
    nameEn: 'Path to Mastery',
    description: '累計500問に解答',
    descriptionEn: 'Answer 500 problems in total',
    category: 'volume',
    tier: 'gold',
    icon: 'medal',
    condition: { type: 'totalProblems', threshold: 500 },
    xpReward: 200,
  },
  {
    id: 'gold_accuracy_90',
    name: 'エリート',
    nameEn: 'Elite',
    description: '正答率90%を達成',
    descriptionEn: 'Achieve 90% overall accuracy',
    category: 'accuracy',
    tier: 'gold',
    icon: 'shield',
    condition: { type: 'accuracy', threshold: 90 },
    xpReward: 250,
  },
  {
    id: 'gold_study_50h',
    name: '学習の鬼',
    nameEn: 'Study Beast',
    description: '累計50時間学習',
    descriptionEn: 'Study for a total of 50 hours',
    category: 'mastery',
    tier: 'gold',
    icon: 'brain',
    condition: { type: 'studyHours', threshold: 50 },
    xpReward: 300,
  },
  {
    id: 'gold_perfect_3',
    name: 'トリプルパーフェクト',
    nameEn: 'Triple Perfect',
    description: '3回連続で全問正解',
    descriptionEn: 'Get 3 consecutive perfect scores',
    category: 'mastery',
    tier: 'gold',
    icon: 'sparkles',
    condition: { type: 'consecutivePerfect', threshold: 3 },
    xpReward: 300,
  },

  // ── PLATINUM TIER (2) ──
  {
    id: 'platinum_streak_100',
    name: '百日の継続',
    nameEn: '100-Day Legend',
    description: '100日連続で学習',
    descriptionEn: 'Study for 100 consecutive days',
    category: 'streak',
    tier: 'platinum',
    icon: 'gem',
    condition: { type: 'streak', threshold: 100 },
    xpReward: 1000,
  },
  {
    id: 'platinum_problems_1000',
    name: 'グランドマスター',
    nameEn: 'Grand Master',
    description: '累計1000問に解答',
    descriptionEn: 'Answer 1000 problems in total',
    category: 'volume',
    tier: 'platinum',
    icon: 'diamond',
    condition: { type: 'totalProblems', threshold: 1000 },
    xpReward: 500,
  },

  // ── SPECIAL (2) ──
  {
    id: 'special_night_owl',
    name: 'ナイトオウル',
    nameEn: 'Night Owl',
    description: '深夜0〜4時に学習',
    descriptionEn: 'Study between midnight and 4 AM',
    category: 'special',
    tier: 'silver',
    icon: 'moon',
    condition: { type: 'timeOfDay', threshold: 1, timeRange: { start: 0, end: 4 } },
    xpReward: 100,
  },
  {
    id: 'special_early_bird',
    name: 'アーリーバード',
    nameEn: 'Early Bird',
    description: '早朝5〜7時に学習',
    descriptionEn: 'Study between 5 and 7 AM',
    category: 'special',
    tier: 'silver',
    icon: 'sunrise',
    condition: { type: 'timeOfDay', threshold: 1, timeRange: { start: 5, end: 7 } },
    xpReward: 100,
  },
];
