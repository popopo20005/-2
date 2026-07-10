/**
 * SubtopicAnalysisService - 個人サブトピック分析サービス
 *
 * 個人の学習データからサブトピック別の重要度を分析・蓄積する。
 * 静的プリセットと個人データをブレンドして最終的な重要度係数を算出。
 *
 * 成長モデル:
 *   信頼度 low    → static 70% / personal 30%
 *   信頼度 medium → static 40% / personal 60%
 *   信頼度 high   → static 20% / personal 80%
 */

import { db } from '../lib/database';
import type {
  AnalysisSession,
  PersonalSubtopicAnalysis,
  ConfidenceLevel,
  SubtopicImportanceResult,
  FrequentProblemGroup,
  FrequencyAnalysisResult,
} from '../types/subtopicAnalysis';
import {
  getSubtopicPreset,
  getSubjectSubtopics,
  subtopicWeightToCoefficient,
} from '../lib/subtopicPresets';

// ============================================================
// 信頼度判定
// ============================================================

/** 信頼度の判定基準 */
const CONFIDENCE_THRESHOLDS = {
  medium: { minSessions: 2, minProblems: 150 },
  high: { minSessions: 3, minProblems: 300 },
};

/** ブレンド比率 (static : personal) */
const BLEND_RATIOS: Record<ConfidenceLevel | 'baseline', { static: number; personal: number }> = {
  baseline: { static: 1.0, personal: 0.0 },
  low: { static: 0.7, personal: 0.3 },
  medium: { static: 0.4, personal: 0.6 },
  high: { static: 0.2, personal: 0.8 },
};

function calculateConfidence(sessions: number, totalProblems: number): ConfidenceLevel {
  if (sessions >= CONFIDENCE_THRESHOLDS.high.minSessions && totalProblems >= CONFIDENCE_THRESHOLDS.high.minProblems) {
    return 'high';
  }
  if (sessions >= CONFIDENCE_THRESHOLDS.medium.minSessions && totalProblems >= CONFIDENCE_THRESHOLDS.medium.minProblems) {
    return 'medium';
  }
  return 'low';
}

// ============================================================
// 分析セッション管理
// ============================================================

/**
 * 新しい分析セッションを追加し、個人データを更新
 */
export async function addAnalysisSession(
  examId: string,
  category: string,
  session: AnalysisSession
): Promise<PersonalSubtopicAnalysis> {
  // 既存の分析データを取得
  let analysis = await db.personalSubtopicAnalyses
    .where('[examId+category]')
    .equals([examId, category])
    .first();

  if (analysis) {
    // 既存データにセッションを追加
    const sessions = [...analysis.sessions, session];
    const mergedDistribution = mergeDistributions(sessions);
    const totalProblemsAnalyzed = sessions.reduce((sum, s) => sum + s.totalProblems, 0);
    const confidence = calculateConfidence(sessions.length, totalProblemsAnalyzed);

    await db.personalSubtopicAnalyses.update(analysis.id!, {
      sessions,
      mergedDistribution,
      totalProblemsAnalyzed,
      confidence,
      updatedAt: new Date(),
    });

    return {
      ...analysis,
      sessions,
      mergedDistribution,
      totalProblemsAnalyzed,
      confidence,
      updatedAt: new Date(),
    };
  } else {
    // 新規作成
    const newAnalysis: PersonalSubtopicAnalysis = {
      examId,
      category,
      sessions: [session],
      mergedDistribution: session.distribution,
      totalProblemsAnalyzed: session.totalProblems,
      confidence: calculateConfidence(1, session.totalProblems),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await db.personalSubtopicAnalyses.add(newAnalysis);
    return { ...newAnalysis, id: id as number };
  }
}

/**
 * 複数セッションの分布をマージ
 */
function mergeDistributions(sessions: AnalysisSession[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const session of sessions) {
    for (const [subtopic, count] of Object.entries(session.distribution)) {
      merged[subtopic] = (merged[subtopic] || 0) + count;
    }
  }
  return merged;
}

/**
 * 個人分析データを取得
 */
export async function getAnalysis(
  examId: string,
  category: string
): Promise<PersonalSubtopicAnalysis | undefined> {
  return db.personalSubtopicAnalyses
    .where('[examId+category]')
    .equals([examId, category])
    .first();
}

/**
 * 試験ID全体の分析データを取得
 */
export async function getAllAnalyses(
  examId: string
): Promise<PersonalSubtopicAnalysis[]> {
  return db.personalSubtopicAnalyses
    .where('examId')
    .equals(examId)
    .toArray();
}

/**
 * 分析セッションを削除
 */
export async function removeSession(
  examId: string,
  category: string,
  sessionId: string
): Promise<void> {
  const analysis = await getAnalysis(examId, category);
  if (!analysis) return;

  const sessions = analysis.sessions.filter((s) => s.id !== sessionId);

  if (sessions.length === 0) {
    await db.personalSubtopicAnalyses.delete(analysis.id!);
    return;
  }

  const mergedDistribution = mergeDistributions(sessions);
  const totalProblemsAnalyzed = sessions.reduce((sum, s) => sum + s.totalProblems, 0);
  const confidence = calculateConfidence(sessions.length, totalProblemsAnalyzed);

  await db.personalSubtopicAnalyses.update(analysis.id!, {
    sessions,
    mergedDistribution,
    totalProblemsAnalyzed,
    confidence,
    updatedAt: new Date(),
  });
}

// ============================================================
// 重要度係数計算 (静的 + 個人ブレンド)
// ============================================================

/**
 * サブトピック別の最終重要度係数を計算
 *
 * 静的プリセットと個人データをブレンドして、各サブトピックの
 * 重要度係数 (1.0-2.0) を算出する。
 */
export async function calculateSubtopicImportances(
  examId: string,
  category: string
): Promise<SubtopicImportanceResult[]> {
  // 1. 静的プリセットデータ
  const staticSubtopics = getSubjectSubtopics(examId, category);

  // 2. 個人分析データ
  const personal = await getAnalysis(examId, category);

  // どちらもない場合は空を返す
  if (!staticSubtopics && !personal) return [];

  // 全サブトピック名を収集
  const allSubtopicNames = new Set<string>();
  if (staticSubtopics) {
    staticSubtopics.forEach((st) => allSubtopicNames.add(st.name));
  }
  if (personal) {
    Object.keys(personal.mergedDistribution).forEach((name) => allSubtopicNames.add(name));
  }

  const confidence: ConfidenceLevel | 'baseline' = personal ? personal.confidence : 'baseline';
  const blend = BLEND_RATIOS[confidence];

  const results: SubtopicImportanceResult[] = [];

  for (const name of allSubtopicNames) {
    // 静的重要度
    const staticSt = staticSubtopics?.find((st) => st.name === name);
    const staticCoeff = staticSt ? subtopicWeightToCoefficient(staticSt.weight) : 1.5; // 未知は中程度

    // 個人データの重要度
    let personalCoeff = 1.5;
    let personalCount: number | undefined;
    if (personal && personal.mergedDistribution[name] !== undefined) {
      personalCount = personal.mergedDistribution[name];
      const maxCount = Math.max(...Object.values(personal.mergedDistribution), 1);
      // 個人データの正規化: 出現比率をベースに1.0-2.0に変換
      const ratio = personalCount / maxCount;
      personalCoeff = 1.0 + ratio;
    }

    // ブレンド
    const importance = blend.static * staticCoeff + blend.personal * personalCoeff;
    // 1.0-2.0の範囲にクリップ
    const clippedImportance = Math.max(1.0, Math.min(2.0, importance));

    let source: string;
    if (confidence === 'baseline') {
      source = 'static-only';
    } else if (!staticSt) {
      source = 'personal-only';
    } else {
      source = `blend(${Math.round(blend.static * 100)}%/${Math.round(blend.personal * 100)}%)`;
    }

    results.push({
      name,
      importance: Math.round(clippedImportance * 100) / 100,
      source,
      confidence,
      personalCount,
      presetImportance: staticSt?.weight,
      blendRatio: confidence !== 'baseline' ? blend : undefined,
    });
  }

  // 重要度の高い順にソート
  results.sort((a, b) => b.importance - a.importance);

  return results;
}

// ============================================================
// 頻出問題分析
// ============================================================

/**
 * 問題文の類似度を計算 (簡易Jaccard係数)
 */
function textSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * 頻出問題のクラスタリングと分析
 *
 * 複数セッションの問題文を比較し、類似する問題をグループ化して
 * 「頻出問題」として抽出する。
 */
export async function analyzeFrequentProblems(
  examId: string,
  category: string,
  similarityThreshold: number = 0.4
): Promise<FrequentProblemGroup[]> {
  const analysis = await getAnalysis(examId, category);
  if (!analysis) return [];

  // 全セッションから問題テキストを収集
  const allProblems: Array<{
    text: string;
    subtopic: string;
    year?: number;
  }> = [];

  for (const session of analysis.sessions) {
    if (session.problemTexts) {
      for (const p of session.problemTexts) {
        allProblems.push({
          text: p.questionText,
          subtopic: p.subtopic,
          year: p.year ?? session.sourceYear,
        });
      }
    }
  }

  if (allProblems.length === 0) return [];

  // クラスタリング (単純貪欲法)
  const used = new Set<number>();
  const groups: FrequentProblemGroup[] = [];
  let groupId = 0;

  for (let i = 0; i < allProblems.length; i++) {
    if (used.has(i)) continue;
    used.add(i);

    const cluster: number[] = [i];
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let j = i + 1; j < allProblems.length; j++) {
      if (used.has(j)) continue;
      const sim = textSimilarity(allProblems[i].text, allProblems[j].text);
      if (sim >= similarityThreshold) {
        cluster.push(j);
        used.add(j);
        totalSimilarity += sim;
        comparisons++;
      }
    }

    // 2問以上のグループのみ「頻出」とする
    if (cluster.length >= 2) {
      const years = [...new Set(cluster.map((idx) => allProblems[idx].year).filter(Boolean))] as number[];
      groupId++;
      groups.push({
        id: `freq_${groupId}`,
        subtopic: allProblems[i].subtopic,
        representativeText: allProblems[i].text,
        frequencyCount: cluster.length,
        years: years.sort(),
        similarTexts: cluster.map((idx) => allProblems[idx].text),
        averageSimilarity: comparisons > 0 ? totalSimilarity / comparisons : 1,
      });
    }
  }

  // 頻出度の高い順にソート
  groups.sort((a, b) => b.frequencyCount - a.frequencyCount);

  return groups;
}

// ============================================================
// 総合分析結果の生成
// ============================================================

/**
 * カテゴリーの総合的な頻出度分析結果を生成
 */
export async function generateFrequencyAnalysis(
  examId: string,
  category: string
): Promise<FrequencyAnalysisResult> {
  const [importances, frequentGroups, analysis] = await Promise.all([
    calculateSubtopicImportances(examId, category),
    analyzeFrequentProblems(examId, category),
    getAnalysis(examId, category),
  ]);

  // 年度範囲の計算
  let yearRange: { min: number; max: number } | null = null;
  if (analysis) {
    const years = analysis.sessions
      .map((s) => s.sourceYear)
      .filter(Boolean) as number[];
    if (years.length > 0) {
      yearRange = { min: Math.min(...years), max: Math.max(...years) };
    }
  }

  return {
    category,
    subtopicImportances: importances,
    frequentGroups,
    yearRange,
    totalProblemsAnalyzed: analysis?.totalProblemsAnalyzed ?? 0,
    confidence: analysis?.confidence ?? 'low',
    generatedAt: new Date(),
  };
}

// ============================================================
// 成長状態の取得 (UI表示用)
// ============================================================

export interface GrowthStatus {
  examId: string;
  category: string;
  confidence: ConfidenceLevel | 'none';
  sessionCount: number;
  totalProblems: number;
  /** 次のレベルまでに必要な条件 */
  nextLevelRequirement?: {
    sessionsNeeded: number;
    problemsNeeded: number;
  };
  /** 成長段階の絵文字 */
  growthEmoji: string;
  /** 成長段階のラベル */
  growthLabel: { ja: string; en: string };
}

const GROWTH_STAGES: Record<ConfidenceLevel | 'none', { emoji: string; label: { ja: string; en: string } }> = {
  none: { emoji: '🌰', label: { ja: '未開始', en: 'Not started' } },
  low: { emoji: '🌱', label: { ja: '芽生え', en: 'Sprouting' } },
  medium: { emoji: '🌿', label: { ja: '成長中', en: 'Growing' } },
  high: { emoji: '🌳', label: { ja: '成熟', en: 'Mature' } },
};

/**
 * カテゴリーの成長状態を取得
 */
export async function getGrowthStatus(
  examId: string,
  category: string
): Promise<GrowthStatus> {
  const analysis = await getAnalysis(examId, category);

  if (!analysis) {
    const noneStage = GROWTH_STAGES.none;
    return {
      examId,
      category,
      confidence: 'none',
      sessionCount: 0,
      totalProblems: 0,
      nextLevelRequirement: {
        sessionsNeeded: 1,
        problemsNeeded: 1,
      },
      growthEmoji: noneStage.emoji,
      growthLabel: noneStage.label,
    };
  }

  const stage = GROWTH_STAGES[analysis.confidence];

  let nextLevelRequirement: GrowthStatus['nextLevelRequirement'];
  if (analysis.confidence === 'low') {
    nextLevelRequirement = {
      sessionsNeeded: Math.max(0, CONFIDENCE_THRESHOLDS.medium.minSessions - analysis.sessions.length),
      problemsNeeded: Math.max(0, CONFIDENCE_THRESHOLDS.medium.minProblems - analysis.totalProblemsAnalyzed),
    };
  } else if (analysis.confidence === 'medium') {
    nextLevelRequirement = {
      sessionsNeeded: Math.max(0, CONFIDENCE_THRESHOLDS.high.minSessions - analysis.sessions.length),
      problemsNeeded: Math.max(0, CONFIDENCE_THRESHOLDS.high.minProblems - analysis.totalProblemsAnalyzed),
    };
  }

  return {
    examId,
    category,
    confidence: analysis.confidence,
    sessionCount: analysis.sessions.length,
    totalProblems: analysis.totalProblemsAnalyzed,
    nextLevelRequirement,
    growthEmoji: stage.emoji,
    growthLabel: stage.label,
  };
}

/**
 * 試験全体の成長状態サマリーを取得
 */
export async function getExamGrowthSummary(
  examId: string
): Promise<GrowthStatus[]> {
  const analyses = await getAllAnalyses(examId);
  const preset = getSubtopicPreset(examId);

  // プリセットの全科目について成長状態を取得
  const categories = new Set<string>();
  if (preset) {
    preset.subjects.forEach((s) => categories.add(s.subjectName));
  }
  analyses.forEach((a) => categories.add(a.category));

  const results: GrowthStatus[] = [];
  for (const category of categories) {
    results.push(await getGrowthStatus(examId, category));
  }

  return results;
}
