/**
 * multiSubjectPlanner.ts Unit Tests
 *
 * マスタープラン Phase 1-3 の優先度スコア算出式を検証する。
 *
 * 優先度スコア = 残日数係数 × 苦手係数 × 重要度係数 × 未学習量係数
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDaysRemainingFactor,
  calculateWeaknessFactor,
  calculateIncompleteFactor,
  calculatePriorityScore,
  resolveImportanceCoefficient,
  allocateProblemsByScore,
  generateMultiSubjectPlan,
} from '../multiSubjectPlanner';
import type { Subject, MultiSubjectPlanConfig } from '../../types/multiSubject';

// ============================================================
// ヘルパー
// ============================================================

function createMockSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: 'test-subject-1',
    name: 'テスト科目',
    categoryName: 'テストカテゴリー',
    importanceCoefficient: 1.0,
    currentAccuracy: 60,
    answeredCount: 10,
    totalProblemCount: 20,
    progressPercentage: 50,
    ...overrides,
  };
}

// ============================================================
// 残日数係数テスト
// ============================================================

describe('calculateDaysRemainingFactor', () => {
  it('30日以内なら ×2.0 を返す', () => {
    expect(calculateDaysRemainingFactor(1)).toBe(2.0);
    expect(calculateDaysRemainingFactor(15)).toBe(2.0);
    expect(calculateDaysRemainingFactor(30)).toBe(2.0);
  });

  it('31〜60日なら ×1.5 を返す', () => {
    expect(calculateDaysRemainingFactor(31)).toBe(1.5);
    expect(calculateDaysRemainingFactor(45)).toBe(1.5);
    expect(calculateDaysRemainingFactor(60)).toBe(1.5);
  });

  it('61日以上なら ×1.0 を返す', () => {
    expect(calculateDaysRemainingFactor(61)).toBe(1.0);
    expect(calculateDaysRemainingFactor(100)).toBe(1.0);
    expect(calculateDaysRemainingFactor(365)).toBe(1.0);
  });

  it('試験日当日・過ぎている場合も ×2.0 を返す', () => {
    expect(calculateDaysRemainingFactor(0)).toBe(2.0);
    expect(calculateDaysRemainingFactor(-5)).toBe(2.0);
  });
});

// ============================================================
// 苦手係数テスト
// ============================================================

describe('calculateWeaknessFactor', () => {
  it('正答率40%以下なら ×2.0 を返す', () => {
    expect(calculateWeaknessFactor(0)).toBe(2.0);
    expect(calculateWeaknessFactor(25)).toBe(2.0);
    expect(calculateWeaknessFactor(40)).toBe(2.0);
  });

  it('正答率41〜70%なら ×1.5 を返す', () => {
    expect(calculateWeaknessFactor(41)).toBe(1.5);
    expect(calculateWeaknessFactor(55)).toBe(1.5);
    expect(calculateWeaknessFactor(70)).toBe(1.5);
  });

  it('正答率71%以上なら ×1.0 を返す', () => {
    expect(calculateWeaknessFactor(71)).toBe(1.0);
    expect(calculateWeaknessFactor(85)).toBe(1.0);
    expect(calculateWeaknessFactor(100)).toBe(1.0);
  });

  it('未学習（負の値）は中間値 ×1.5 を返す', () => {
    expect(calculateWeaknessFactor(-1)).toBe(1.5);
  });
});

// ============================================================
// 未学習量係数テスト
// ============================================================

describe('calculateIncompleteFactor', () => {
  it('進捗0%なら ×2.0 を返す', () => {
    expect(calculateIncompleteFactor(0)).toBe(2.0);
  });

  it('進捗50%なら ×1.5 を返す', () => {
    expect(calculateIncompleteFactor(50)).toBe(1.5);
  });

  it('進捗100%なら ×1.0 を返す', () => {
    expect(calculateIncompleteFactor(100)).toBe(1.0);
  });

  it('0〜50%は2.0→1.5の線形補間', () => {
    expect(calculateIncompleteFactor(25)).toBeCloseTo(1.75, 2);
  });

  it('50〜100%は1.5→1.0の線形補間', () => {
    expect(calculateIncompleteFactor(75)).toBeCloseTo(1.25, 2);
  });

  it('範囲外の値はクランプされる', () => {
    expect(calculateIncompleteFactor(-10)).toBe(2.0);
    expect(calculateIncompleteFactor(150)).toBe(1.0);
  });
});

// ============================================================
// 重要度係数（3モード）テスト
// ============================================================

describe('resolveImportanceCoefficient', () => {
  const subject = createMockSubject();

  it('uniform モードでは常に 1.0 を返す', () => {
    expect(resolveImportanceCoefficient(subject, 'uniform')).toBe(1.0);
  });

  it('manual モードで level="low" は 1.2', () => {
    const result = resolveImportanceCoefficient(subject, 'manual', {
      manualWeights: { [subject.id]: 'low' },
    });
    expect(result).toBe(1.2);
  });

  it('manual モードで level="mid" は 1.5', () => {
    const result = resolveImportanceCoefficient(subject, 'manual', {
      manualWeights: { [subject.id]: 'mid' },
    });
    expect(result).toBe(1.5);
  });

  it('manual モードで level="high" は 2.0', () => {
    const result = resolveImportanceCoefficient(subject, 'manual', {
      manualWeights: { [subject.id]: 'high' },
    });
    expect(result).toBe(2.0);
  });

  it('manual モードでカスタム数値を受け付ける', () => {
    const result = resolveImportanceCoefficient(subject, 'manual', {
      manualWeights: { [subject.id]: 1.75 },
    });
    expect(result).toBe(1.75);
  });

  it('manual モードで範囲外の数値はクランプされる', () => {
    expect(
      resolveImportanceCoefficient(subject, 'manual', {
        manualWeights: { [subject.id]: 0.5 },
      })
    ).toBe(1.0);
    expect(
      resolveImportanceCoefficient(subject, 'manual', {
        manualWeights: { [subject.id]: 3.0 },
      })
    ).toBe(2.0);
  });

  it('preset モードでプリセットから係数を取得', () => {
    const toeicSubject = createMockSubject({
      id: 'listening',
      name: 'Part3: 会話',
      categoryName: 'Part3: 会話',
    });
    const result = resolveImportanceCoefficient(toeicSubject, 'preset', {
      presetId: 'toeic',
    });
    // Part3: 会話は最大配点(54)に近い39なので、1.0 + 39/54 ≈ 1.72
    expect(result).toBeGreaterThan(1.5);
    expect(result).toBeLessThanOrEqual(2.0);
  });

  it('preset が見つからない場合は 1.0', () => {
    const result = resolveImportanceCoefficient(subject, 'preset', {
      presetId: 'non_existent',
    });
    expect(result).toBe(1.0);
  });
});

// ============================================================
// 優先度スコア総合テスト
// ============================================================

describe('calculatePriorityScore', () => {
  it('最大スコア（全係数2.0）= 16.0 になる', () => {
    const subject = createMockSubject({
      currentAccuracy: 20, // 苦手
      progressPercentage: 0, // 未学習
    });
    const breakdown = calculatePriorityScore(subject, 15, 'manual', {
      manualWeights: { [subject.id]: 'high' }, // 重要度2.0
    });
    // 2.0 × 2.0 × 2.0 × 2.0 = 16.0
    expect(breakdown.finalScore).toBe(16.0);
    expect(breakdown.daysRemainingFactor).toBe(2.0);
    expect(breakdown.weaknessFactor).toBe(2.0);
    expect(breakdown.importanceFactor).toBe(2.0);
    expect(breakdown.incompleteFactor).toBe(2.0);
  });

  it('最小スコア（全係数1.0）= 1.0 になる', () => {
    const subject = createMockSubject({
      currentAccuracy: 90, // 得意
      progressPercentage: 100, // 完了
    });
    const breakdown = calculatePriorityScore(subject, 100, 'uniform');
    // 1.0 × 1.0 × 1.0 × 1.0 = 1.0
    expect(breakdown.finalScore).toBe(1.0);
  });

  it('試験近く+苦手分野は高優先度', () => {
    const subject = createMockSubject({
      currentAccuracy: 30,
      progressPercentage: 20,
    });
    const breakdown = calculatePriorityScore(subject, 20, 'uniform');
    // 2.0 × 2.0 × 1.0 × 1.8 = 7.2
    expect(breakdown.finalScore).toBeCloseTo(7.2, 1);
  });

  it('内訳の inputs が正しく記録される', () => {
    const subject = createMockSubject({
      currentAccuracy: 55,
      progressPercentage: 30,
    });
    const breakdown = calculatePriorityScore(subject, 45, 'uniform');
    expect(breakdown.inputs.daysUntilExam).toBe(45);
    expect(breakdown.inputs.currentAccuracy).toBe(55);
    expect(breakdown.inputs.progressPercentage).toBe(30);
  });
});

// ============================================================
// 問題配分テスト
// ============================================================

describe('allocateProblemsByScore', () => {
  it('空の配列は空Mapを返す', () => {
    const result = allocateProblemsByScore([], 10, 30);
    expect(result.size).toBe(0);
  });

  it('単一科目は全問題を配分', () => {
    const breakdowns = [
      {
        subjectId: 's1',
        subjectName: '科目1',
        finalScore: 5.0,
        daysRemainingFactor: 2.0,
        weaknessFactor: 1.5,
        importanceFactor: 1.0,
        incompleteFactor: 1.67,
        inputs: { daysUntilExam: 30, currentAccuracy: 50, progressPercentage: 33 },
      },
    ];
    const result = allocateProblemsByScore(breakdowns, 10, 30);
    const allocation = result.get('s1');
    expect(allocation).toBeDefined();
    expect(allocation!.perDay).toBe(10);
    expect(allocation!.total).toBe(300); // 10 × 30日
  });

  it('複数科目はスコア比率で配分される', () => {
    const breakdowns = [
      {
        subjectId: 'high',
        subjectName: '高優先度',
        finalScore: 8.0,
        daysRemainingFactor: 2.0,
        weaknessFactor: 2.0,
        importanceFactor: 2.0,
        incompleteFactor: 1.0,
        inputs: { daysUntilExam: 30, currentAccuracy: 30, progressPercentage: 100 },
      },
      {
        subjectId: 'low',
        subjectName: '低優先度',
        finalScore: 2.0,
        daysRemainingFactor: 1.0,
        weaknessFactor: 1.0,
        importanceFactor: 1.0,
        incompleteFactor: 2.0,
        inputs: { daysUntilExam: 100, currentAccuracy: 80, progressPercentage: 0 },
      },
    ];
    const result = allocateProblemsByScore(breakdowns, 10, 30);
    const highAlloc = result.get('high')!;
    const lowAlloc = result.get('low')!;
    // 高優先度(8.0) : 低優先度(2.0) = 4 : 1 → 8問 : 2問
    expect(highAlloc.perDay).toBeGreaterThan(lowAlloc.perDay);
    expect(highAlloc.perDay + lowAlloc.perDay).toBe(10);
  });

  it('全員最小1問は保証される', () => {
    const breakdowns = [
      {
        subjectId: 'tiny',
        subjectName: '極小',
        finalScore: 0.001,
        daysRemainingFactor: 1.0,
        weaknessFactor: 1.0,
        importanceFactor: 1.0,
        incompleteFactor: 1.0,
        inputs: { daysUntilExam: 100, currentAccuracy: 100, progressPercentage: 100 },
      },
      {
        subjectId: 'huge',
        subjectName: '巨大',
        finalScore: 999,
        daysRemainingFactor: 2.0,
        weaknessFactor: 2.0,
        importanceFactor: 2.0,
        incompleteFactor: 2.0,
        inputs: { daysUntilExam: 1, currentAccuracy: 0, progressPercentage: 0 },
      },
    ];
    const result = allocateProblemsByScore(breakdowns, 10, 30);
    expect(result.get('tiny')!.perDay).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// エンドツーエンド: generateMultiSubjectPlan
// ============================================================

describe('generateMultiSubjectPlan', () => {
  function createFutureDate(daysAhead: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d;
  }

  it('単一科目プランを生成できる', () => {
    const config: MultiSubjectPlanConfig = {
      subjects: [createMockSubject()],
      examDate: createFutureDate(30),
      totalTimePerDay: 60,
      importanceMode: 'uniform',
    };
    const result = generateMultiSubjectPlan(config);
    expect(result.allocations).toHaveLength(1);
    expect(result.daysUntilExam).toBeGreaterThanOrEqual(29);
    expect(result.daysUntilExam).toBeLessThanOrEqual(30);
    expect(result.totalProblems).toBeGreaterThan(0);
  });

  it('複数科目プランは優先度順にソートされる', () => {
    const subjects = [
      createMockSubject({
        id: 's1',
        name: '得意科目',
        currentAccuracy: 90,
        progressPercentage: 80,
      }),
      createMockSubject({
        id: 's2',
        name: '苦手科目',
        currentAccuracy: 30,
        progressPercentage: 20,
      }),
    ];
    const config: MultiSubjectPlanConfig = {
      subjects,
      examDate: createFutureDate(20),
      totalTimePerDay: 90,
      importanceMode: 'uniform',
    };
    const result = generateMultiSubjectPlan(config);
    // 苦手科目が先頭にくる
    expect(result.allocations[0].subjectId).toBe('s2');
    expect(result.allocations[0].priorityScore).toBeGreaterThan(
      result.allocations[1].priorityScore
    );
    expect(result.recommendedOrder[0]).toBe('s2');
  });

  it('試験日が過去だとエラー', () => {
    const config: MultiSubjectPlanConfig = {
      subjects: [createMockSubject()],
      examDate: new Date('2020-01-01'),
      totalTimePerDay: 60,
      importanceMode: 'uniform',
    };
    expect(() => generateMultiSubjectPlan(config)).toThrow();
  });

  it('科目ゼロだとエラー', () => {
    const config: MultiSubjectPlanConfig = {
      subjects: [],
      examDate: createFutureDate(30),
      totalTimePerDay: 60,
      importanceMode: 'uniform',
    };
    expect(() => generateMultiSubjectPlan(config)).toThrow();
  });

  it('学習時間10分未満だとエラー', () => {
    const config: MultiSubjectPlanConfig = {
      subjects: [createMockSubject()],
      examDate: createFutureDate(30),
      totalTimePerDay: 5,
      importanceMode: 'uniform',
    };
    expect(() => generateMultiSubjectPlan(config)).toThrow();
  });

  it('配分率の合計は100%に近い', () => {
    const subjects = [
      createMockSubject({ id: 's1', currentAccuracy: 30 }),
      createMockSubject({ id: 's2', currentAccuracy: 60 }),
      createMockSubject({ id: 's3', currentAccuracy: 90 }),
    ];
    const config: MultiSubjectPlanConfig = {
      subjects,
      examDate: createFutureDate(45),
      totalTimePerDay: 120,
      importanceMode: 'uniform',
    };
    const result = generateMultiSubjectPlan(config);
    const totalPercentage = result.allocations.reduce(
      (sum, a) => sum + a.allocationPercentage,
      0
    );
    expect(totalPercentage).toBeCloseTo(100, 0);
  });

  it('reason フィールドが生成される', () => {
    const config: MultiSubjectPlanConfig = {
      subjects: [
        createMockSubject({
          currentAccuracy: 30,
          progressPercentage: 10,
        }),
      ],
      examDate: createFutureDate(15),
      totalTimePerDay: 60,
      importanceMode: 'manual',
      manualWeights: { 'test-subject-1': 'high' },
    };
    const result = generateMultiSubjectPlan(config);
    expect(result.allocations[0].reason).toContain('試験日が近い');
    expect(result.allocations[0].reason).toContain('苦手分野');
    expect(result.allocations[0].reason).toContain('最重要科目');
    expect(result.allocations[0].reason).toContain('未学習');
  });
});
