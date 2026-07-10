/**
 * 間違い理由タグサービス
 *
 * 不正解時の理由をタグ付けし、集計・分析する
 */

import { mistakeReasonTagService } from '../lib/database';
import { db } from '../lib/database';
import type { MistakeReasonTag, MistakeReasonRecord } from '../types/smartNote';
import type { Problem } from '../types';

/**
 * 間違い理由を保存
 */
export async function saveMistakeReason(
  record: Omit<MistakeReasonRecord, 'id'>
): Promise<number> {
  return await mistakeReasonTagService.add(record);
}

/**
 * 問題別の間違い理由を取得
 */
export async function getMistakeReasonsByProblem(
  problemId: number
): Promise<MistakeReasonRecord[]> {
  return await mistakeReasonTagService.getByProblemId(problemId);
}

/**
 * カテゴリー別の間違い理由分布を取得
 */
export async function getMistakeReasonDistribution(
  category?: string
): Promise<Map<MistakeReasonTag, number>> {
  const records = category
    ? await mistakeReasonTagService.getByCategory(category)
    : await mistakeReasonTagService.getAll();

  const distribution = new Map<MistakeReasonTag, number>();
  for (const record of records) {
    const count = distribution.get(record.reasonTag) || 0;
    distribution.set(record.reasonTag, count + 1);
  }
  return distribution;
}

/**
 * 理由タグ別の問題一覧を取得
 */
export async function getProblemsByReason(
  reasonTag: MistakeReasonTag
): Promise<Problem[]> {
  const records = await mistakeReasonTagService.getByReason(reasonTag);
  const problemIds = [...new Set(records.map(r => r.problemId))];

  if (problemIds.length === 0) return [];

  const problems = await db.problems.bulkGet(problemIds);
  return problems.filter((p): p is Problem => p !== undefined);
}

/**
 * 理由タグ別に問題をグループ化して取得
 */
export async function getGroupedByReason(
  category?: string
): Promise<Array<{
  reason: MistakeReasonTag;
  count: number;
  problems: Array<{ problemId: number; question: string; note?: string }>;
}>> {
  const records = category
    ? await mistakeReasonTagService.getByCategory(category)
    : await mistakeReasonTagService.getAll();

  // 理由別にグループ化
  const grouped = new Map<MistakeReasonTag, MistakeReasonRecord[]>();
  for (const record of records) {
    const list = grouped.get(record.reasonTag) || [];
    list.push(record);
    grouped.set(record.reasonTag, list);
  }

  const result: Array<{
    reason: MistakeReasonTag;
    count: number;
    problems: Array<{ problemId: number; question: string; note?: string }>;
  }> = [];

  for (const [reason, recs] of grouped) {
    // ユニークな問題IDを取得
    const uniqueProblemIds = [...new Set(recs.map(r => r.problemId))];
    const problems = await db.problems.bulkGet(uniqueProblemIds);

    const problemList = problems
      .filter((p): p is Problem => p !== undefined)
      .map(p => {
        const relatedRecord = recs.find(r => r.problemId === p.id);
        return {
          problemId: p.id!,
          question: p.question,
          note: relatedRecord?.note,
        };
      });

    result.push({
      reason,
      count: recs.length,
      problems: problemList,
    });
  }

  // 件数降順でソート
  result.sort((a, b) => b.count - a.count);
  return result;
}
