/**
 * BatchAnalysisService - 過去問一括分析サービス
 *
 * 過去問データを年度ごとにグループ化し、一括AI分析の前処理・後処理を行う。
 */

import { db } from '../lib/database';
import type { Problem } from '../types';
import type { AnalysisSession, MatrixData } from '../types/subtopicAnalysis';
import { addAnalysisSession } from './subtopicAnalysisService';

// ============================================================
// 年度グルーピング
// ============================================================

export interface YearStats {
  year: number;
  count: number;
  displayName: string;
}

/**
 * カテゴリーの問題を年度別にグループ化
 */
export async function groupProblemsByYear(
  category: string
): Promise<Map<number, Problem[]>> {
  const allProblems = await db.problems
    .where('category')
    .equals(category)
    .toArray();

  const grouped = new Map<number, Problem[]>();

  for (const prob of allProblems) {
    if (prob.sourceExamYear !== undefined && prob.sourceExamYear > 0) {
      const year = prob.sourceExamYear;
      if (!grouped.has(year)) {
        grouped.set(year, []);
      }
      grouped.get(year)!.push(prob);
    }
  }

  return grouped;
}

/**
 * 検出された年度の統計情報を取得
 */
export async function getYearStats(
  category: string,
  lang: 'ja' | 'en' = 'ja'
): Promise<YearStats[]> {
  const grouped = await groupProblemsByYear(category);

  return Array.from(grouped.entries())
    .map(([year, probs]) => ({
      year,
      count: probs.length,
      displayName: lang === 'ja'
        ? `第${year}回(${probs.length}問)`
        : `#${year} (${probs.length})`,
    }))
    .sort((a, b) => a.year - b.year);
}

// ============================================================
// マトリクス構築
// ============================================================

/**
 * 年度別セッションからマトリクスデータを構築
 */
export function buildMatrixFromSessions(sessions: AnalysisSession[]): MatrixData {
  const subtopicSet = new Set<string>();
  const yearSet = new Set<number>();

  for (const s of sessions) {
    if (s.sourceYear) yearSet.add(s.sourceYear);
    Object.keys(s.distribution).forEach(st => subtopicSet.add(st));
  }

  const subtopics = Array.from(subtopicSet).sort();
  const years = Array.from(yearSet).sort((a, b) => a - b);

  const matrix: number[][] = subtopics.map(() => new Array(years.length).fill(0));

  for (const session of sessions) {
    const yearIdx = years.indexOf(session.sourceYear!);
    if (yearIdx < 0) continue;
    for (let stIdx = 0; stIdx < subtopics.length; stIdx++) {
      matrix[stIdx][yearIdx] = session.distribution[subtopics[stIdx]] || 0;
    }
  }

  const bySubtopic = matrix.map(row => row.reduce((a, b) => a + b, 0));
  const byYear = years.map((_, yIdx) =>
    subtopics.reduce((sum, _, stIdx) => sum + matrix[stIdx][yIdx], 0)
  );

  return { subtopics, years, matrix, totals: { bySubtopic, byYear } };
}

/**
 * yearDistribution から直接マトリクスを構築
 */
export function buildMatrixFromYearDistribution(
  yearDistribution: Record<string, Record<string, number>>
): MatrixData {
  const subtopicSet = new Set<string>();
  const years: number[] = [];

  for (const [yearStr, dist] of Object.entries(yearDistribution)) {
    years.push(parseInt(yearStr, 10));
    Object.keys(dist).forEach(st => subtopicSet.add(st));
  }

  years.sort((a, b) => a - b);
  const subtopics = Array.from(subtopicSet).sort();

  const matrix: number[][] = subtopics.map(() => new Array(years.length).fill(0));

  for (let yIdx = 0; yIdx < years.length; yIdx++) {
    const dist = yearDistribution[String(years[yIdx])];
    if (!dist) continue;
    for (let stIdx = 0; stIdx < subtopics.length; stIdx++) {
      matrix[stIdx][yIdx] = dist[subtopics[stIdx]] || 0;
    }
  }

  const bySubtopic = matrix.map(row => row.reduce((a, b) => a + b, 0));
  const byYear = years.map((_, yIdx) =>
    subtopics.reduce((sum, _, stIdx) => sum + matrix[stIdx][yIdx], 0)
  );

  return { subtopics, years, matrix, totals: { bySubtopic, byYear } };
}

// ============================================================
// 保存
// ============================================================

/**
 * 年度別セッションをDBに保存
 */
export async function saveBatchSessions(
  examId: string,
  category: string,
  sessions: AnalysisSession[]
): Promise<void> {
  for (const session of sessions) {
    await addAnalysisSession(examId, category, session);
  }
}
