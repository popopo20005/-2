/**
 * Gamification Service
 * Phase 4: XP/Level/Badge/Achievement/Streak management
 */

import { db, historyService } from '../lib/database';
import { getTotalStudyTime } from '../lib/studyTimeService';
import {
  BADGE_DEFINITIONS,
  getLevelFromXP,
  XP_AWARDS,
  type UserProgress,
  type UnlockedBadge,
  type BadgeDefinition,
} from '../types/gamification';

// ============================================
// Helper: today as YYYY-MM-DD
// ============================================

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================
// USER PROGRESS MANAGEMENT
// ============================================

const DEFAULT_PROGRESS: UserProgress = {
  id: 1,
  totalXP: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: '',
  totalPerfectQuizzes: 0,
  consecutivePerfectQuizzes: 0,
  updatedAt: new Date(),
};

/** Get or initialize user progress (singleton) */
export async function getUserProgress(): Promise<UserProgress> {
  const existing = await db.userProgress.get(1);
  if (existing) return existing;

  // First time: migrate from existing history data
  const migrated = await migrateFromHistory();
  await db.userProgress.put(migrated);
  return migrated;
}

/** Calculate initial XP from existing history (one-time migration) */
async function migrateFromHistory(): Promise<UserProgress> {
  const allHistory = await historyService.getAll();
  const correctCount = allHistory.filter(h => h.isCorrect).length;
  const totalXP = correctCount * XP_AWARDS.CORRECT_ANSWER;

  // Calculate streak from history
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const hasActivity = allHistory.some(h => {
      const hd = new Date(h.timestamp);
      hd.setHours(0, 0, 0, 0);
      return hd.getTime() === checkDate.getTime();
    });
    if (hasActivity) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return {
    ...DEFAULT_PROGRESS,
    totalXP,
    level: getLevelFromXP(totalXP),
    currentStreak: streak,
    longestStreak: streak,
    lastStudyDate: allHistory.length > 0 ? todayString() : '',
    updatedAt: new Date(),
  };
}

/** Save progress to DB */
async function saveProgress(progress: UserProgress): Promise<void> {
  progress.updatedAt = new Date();
  await db.userProgress.put(progress);
}

// ============================================
// XP MANAGEMENT
// ============================================

export interface XPAwardResult {
  xpAwarded: number;
  totalXP: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
}

/** Award XP to user */
export async function awardXP(amount: number): Promise<XPAwardResult> {
  const progress = await getUserProgress();
  const oldLevel = progress.level;

  progress.totalXP += amount;
  progress.level = getLevelFromXP(progress.totalXP);
  await saveProgress(progress);

  return {
    xpAwarded: amount,
    totalXP: progress.totalXP,
    leveledUp: progress.level > oldLevel,
    oldLevel,
    newLevel: progress.level,
  };
}

// ============================================
// STREAK MANAGEMENT
// ============================================

export interface StreakUpdateResult {
  streak: number;
  isNewRecord: boolean;
  milestone: number | null; // 7, 30, 100 etc.
}

/** Update streak (call on quiz activity) */
export async function updateStreak(): Promise<StreakUpdateResult> {
  const progress = await getUserProgress();
  const today = todayString();

  if (progress.lastStudyDate === today) {
    // Already studied today, no streak change
    return { streak: progress.currentStreak, isNewRecord: false, milestone: null };
  }

  const gap = progress.lastStudyDate
    ? daysBetween(progress.lastStudyDate, today)
    : 999;

  if (gap === 1) {
    // Consecutive day
    progress.currentStreak += 1;
  } else if (gap > 1) {
    // Streak broken
    progress.currentStreak = 1;
  } else {
    // First ever study
    progress.currentStreak = 1;
  }

  progress.lastStudyDate = today;

  const isNewRecord = progress.currentStreak > progress.longestStreak;
  if (isNewRecord) {
    progress.longestStreak = progress.currentStreak;
  }

  await saveProgress(progress);

  // Record streak entry
  const existingToday = await db.streakRecords.where('date').equals(today).first();
  if (!existingToday) {
    await db.streakRecords.add({ date: today });
  }

  // Check milestones
  const milestones = [7, 30, 100, 365];
  const milestone = milestones.find(m => progress.currentStreak === m) ?? null;

  return { streak: progress.currentStreak, isNewRecord, milestone };
}

// ============================================
// BADGE SYSTEM
// ============================================

/** Check all badge conditions and unlock eligible ones */
export async function checkAndUnlockBadges(): Promise<UnlockedBadge[]> {
  const progress = await getUserProgress();
  const allHistory = await historyService.getAll();
  const totalStudyHours = await getTotalStudyTimeInHours();

  const existingUnlocks = await db.unlockedBadges.toArray();
  const unlockedIds = new Set(existingUnlocks.map(b => b.badgeId));

  // Stats for condition checks
  const totalProblems = allHistory.length;
  const correctCount = allHistory.filter(h => h.isCorrect).length;
  const accuracy = totalProblems > 0 ? (correctCount / totalProblems) * 100 : 0;
  const currentHour = new Date().getHours();

  const newlyUnlocked: UnlockedBadge[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (unlockedIds.has(badge.id)) continue;

    let unlocked = false;
    const cond = badge.condition;

    switch (cond.type) {
      case 'streak':
        unlocked = progress.currentStreak >= cond.threshold;
        break;
      case 'totalProblems':
        unlocked = totalProblems >= cond.threshold;
        break;
      case 'accuracy':
        unlocked = totalProblems >= 10 && accuracy >= cond.threshold;
        break;
      case 'studyHours':
        unlocked = totalStudyHours >= cond.threshold;
        break;
      case 'perfectQuiz':
        unlocked = progress.totalPerfectQuizzes >= cond.threshold;
        break;
      case 'consecutivePerfect':
        unlocked = progress.consecutivePerfectQuizzes >= cond.threshold;
        break;
      case 'timeOfDay':
        if (cond.timeRange) {
          unlocked = currentHour >= cond.timeRange.start && currentHour < cond.timeRange.end;
        }
        break;
    }

    if (unlocked) {
      const record: UnlockedBadge = {
        badgeId: badge.id,
        unlockedAt: new Date(),
        notified: false,
      };
      const id = await db.unlockedBadges.add(record);
      record.id = id as number;
      newlyUnlocked.push(record);

      // Award bonus XP for badge unlock
      await awardXP(badge.xpReward);
    }
  }

  return newlyUnlocked;
}

/** Get all badges with unlock status and progress */
export async function getAllBadgesWithStatus(): Promise<Array<{
  definition: BadgeDefinition;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress: number; // 0-100
}>> {
  const progress = await getUserProgress();
  const allHistory = await historyService.getAll();
  const totalStudyHours = await getTotalStudyTimeInHours();
  const unlocked = await db.unlockedBadges.toArray();
  const unlockedMap = new Map(unlocked.map(u => [u.badgeId, u]));

  const totalProblems = allHistory.length;
  const correctCount = allHistory.filter(h => h.isCorrect).length;
  const accuracy = totalProblems > 0 ? (correctCount / totalProblems) * 100 : 0;

  return BADGE_DEFINITIONS.map(badge => {
    const unlock = unlockedMap.get(badge.id);
    let currentValue = 0;

    switch (badge.condition.type) {
      case 'streak':
        currentValue = progress.currentStreak;
        break;
      case 'totalProblems':
        currentValue = totalProblems;
        break;
      case 'accuracy':
        currentValue = accuracy;
        break;
      case 'studyHours':
        currentValue = totalStudyHours;
        break;
      case 'perfectQuiz':
        currentValue = progress.totalPerfectQuizzes;
        break;
      case 'consecutivePerfect':
        currentValue = progress.consecutivePerfectQuizzes;
        break;
      case 'timeOfDay':
        currentValue = unlock ? 1 : 0;
        break;
    }

    const progressPct = unlock
      ? 100
      : Math.min(100, (currentValue / badge.condition.threshold) * 100);

    return {
      definition: badge,
      isUnlocked: !!unlock,
      unlockedAt: unlock?.unlockedAt,
      progress: progressPct,
    };
  });
}

/** Mark badges as notified */
export async function markBadgesNotified(badgeIds: string[]): Promise<void> {
  const unlocked = await db.unlockedBadges.toArray();
  for (const badge of unlocked) {
    if (badgeIds.includes(badge.badgeId) && !badge.notified) {
      badge.notified = true;
      await db.unlockedBadges.put(badge);
    }
  }
}

/** Get unnotified badge unlocks */
export async function getUnnotifiedBadges(): Promise<Array<UnlockedBadge & { definition: BadgeDefinition }>> {
  const unlocked = await db.unlockedBadges.filter(b => !b.notified).toArray();
  return unlocked.map(b => ({
    ...b,
    definition: BADGE_DEFINITIONS.find(d => d.id === b.badgeId)!,
  })).filter(b => b.definition);
}

// ============================================
// QUIZ COMPLETION HANDLER
// ============================================

export interface QuizCompletionResult {
  xpResult: XPAwardResult;
  streakResult: StreakUpdateResult;
  newBadges: UnlockedBadge[];
  isPerfect: boolean;
}

/** Call this when a quiz is completed. Handles all gamification logic. */
export async function recordQuizCompletion(
  correctCount: number,
  totalCount: number,
): Promise<QuizCompletionResult> {
  const isPerfect = correctCount === totalCount && totalCount > 0;

  // 1. Update perfect quiz tracking
  const progress = await getUserProgress();
  if (isPerfect) {
    progress.totalPerfectQuizzes += 1;
    progress.consecutivePerfectQuizzes += 1;
  } else {
    progress.consecutivePerfectQuizzes = 0;
  }
  await saveProgress(progress);

  // 2. Award XP
  const baseXP = correctCount * XP_AWARDS.CORRECT_ANSWER;
  const perfectBonus = isPerfect ? XP_AWARDS.PERFECT_QUIZ_BONUS : 0;
  const xpResult = await awardXP(baseXP + perfectBonus);

  // 3. Update streak
  const streakResult = await updateStreak();

  // 4. Award streak milestone XP
  if (streakResult.milestone) {
    const milestoneXP = streakResult.milestone === 7
      ? XP_AWARDS.STREAK_MILESTONE_7
      : streakResult.milestone === 30
        ? XP_AWARDS.STREAK_MILESTONE_30
        : streakResult.milestone === 100
          ? XP_AWARDS.STREAK_MILESTONE_100
          : 0;
    if (milestoneXP > 0) {
      await awardXP(milestoneXP);
    }
  }

  // 5. Check and unlock badges
  const newBadges = await checkAndUnlockBadges();

  return { xpResult, streakResult, newBadges, isPerfect };
}

// ============================================
// Helpers
// ============================================

async function getTotalStudyTimeInHours(): Promise<number> {
  const totalMinutes = await getTotalStudyTime();
  return totalMinutes / 60;
}
