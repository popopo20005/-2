/**
 * studyPlanGenerator - Importance-based allocation tests
 *
 * Phase 1-3: multiSubjectPlanner integration test
 * Tests that distributeProblemsByPriorityScore correctly allocates
 * problems based on priority score (残日数 × 苦手 × 重要度 × 未学習量).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { distributeProblemsByPriorityScore } from '../studyPlanGenerator';
import { db, problemService, historyService } from '../../lib/database';
import type { Problem } from '../../types';

async function clearDb() {
  await db.problems.clear();
  await db.history.clear();
}

async function seedProblems(category: string, count: number): Promise<number[]> {
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    const problem: Omit<Problem, 'id'> = {
      question: `${category} Q${i + 1}`,
      explanation: 'Explanation',
      category,
      type: 'true-false',
      answer: true,
    };
    const id = await problemService.add(problem);
    ids.push(id);
  }
  return ids;
}

async function seedHistory(problemId: number, category: string, isCorrect: boolean) {
  await historyService.add({
    problemId,
    category,
    isCorrect,
    userAnswer: isCorrect,
  });
}

describe('distributeProblemsByPriorityScore - Phase 1-3 integration', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('allocates more problems to weak (low-accuracy) categories', async () => {
    // Seed: 2 categories, each with 10 problems
    const weakIds = await seedProblems('苦手科目', 10);
    const strongIds = await seedProblems('得意科目', 10);

    // 苦手: 8 answered, all wrong (accuracy 0%)
    for (const id of weakIds.slice(0, 8)) {
      await seedHistory(id, '苦手科目', false);
    }
    // 得意: 8 answered, all correct (accuracy 100%)
    for (const id of strongIds.slice(0, 8)) {
      await seedHistory(id, '得意科目', true);
    }

    const distribution = await distributeProblemsByPriorityScore(
      ['苦手科目', '得意科目'],
      100,
      20, // 20 days until exam
      'uniform',
      {}
    );

    expect(distribution).toHaveLength(2);
    const weak = distribution.find((d) => d.name === '苦手科目');
    const strong = distribution.find((d) => d.name === '得意科目');

    expect(weak).toBeDefined();
    expect(strong).toBeDefined();
    // 苦手 has weaknessFactor=2.0 vs 得意 at 1.0 → should receive more problems
    expect(weak!.problemCount).toBeGreaterThan(strong!.problemCount);
  });

  it('increases allocation for a category marked as high importance (manual mode)', async () => {
    await seedProblems('数学', 10);
    await seedProblems('英語', 10);

    const distribution = await distributeProblemsByPriorityScore(
      ['数学', '英語'],
      100,
      45, // 45 days
      'manual',
      {
        manualWeights: {
          '数学': 'high', // 2.0
          '英語': 'low',  // 1.2
        },
      }
    );

    const math = distribution.find((d) => d.name === '数学');
    const english = distribution.find((d) => d.name === '英語');

    expect(math).toBeDefined();
    expect(english).toBeDefined();
    expect(math!.problemCount).toBeGreaterThan(english!.problemCount);
    // 数学 should have 'high importance' reason tag
    expect(math!.reason).toContain('最重要');
  });

  it('sum of allocated problems roughly equals totalProblems (within rounding)', async () => {
    await seedProblems('A', 5);
    await seedProblems('B', 5);
    await seedProblems('C', 5);

    const total = 90;
    const distribution = await distributeProblemsByPriorityScore(
      ['A', 'B', 'C'],
      total,
      30,
      'uniform',
      {}
    );

    const sum = distribution.reduce((acc, d) => acc + d.problemCount, 0);
    expect(sum).toBe(total); // 端数調整で厳密一致
    expect(distribution).toHaveLength(3);
  });

  it('falls back to equal distribution when no categories have problems in DB', async () => {
    // No seeding → buildSubjectsFromCategories returns []
    const distribution = await distributeProblemsByPriorityScore(
      ['存在しないカテゴリ1', '存在しないカテゴリ2'],
      50,
      30,
      'uniform',
      {}
    );

    expect(distribution).toHaveLength(2);
    const sum = distribution.reduce((acc, d) => acc + d.problemCount, 0);
    // Equal fallback: each gets ~25
    expect(sum).toBeGreaterThanOrEqual(48);
    expect(sum).toBeLessThanOrEqual(52);
    expect(distribution.every((d) => d.reason === '均等配分')).toBe(true);
  });

  it('priority levels (1-5) are assigned based on finalScore', async () => {
    await seedProblems('urgent', 10);

    // 5 days until exam + manual high importance → very high score
    const distribution = await distributeProblemsByPriorityScore(
      ['urgent'],
      50,
      5,
      'manual',
      { manualWeights: { 'urgent': 'high' } }
    );

    expect(distribution).toHaveLength(1);
    // daysFactor=2.0 × weakness=1.5(未学習) × importance=2.0 × incomplete=2.0 = 12 → priority 5
    expect(distribution[0].priority).toBe(5);
  });
});
