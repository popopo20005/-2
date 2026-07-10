/**
 * スマートノートサービス - 4タイプの自動ノート生成エンジン
 *
 * 1. 問題集型: 正答率の低い問題を集約
 * 2. 確認ノート型: 混同ペア検出
 * 3. 穴埋め型: キーワードマスキング
 * 4. 間違い理由別型: 理由タグ別に問題をグループ化
 */

import { db, historyService, smartNoteDbService } from '../lib/database';
import { getGroupedByReason } from './mistakeReasonService';
import type {
  SmartNote,
  SmartNoteType,
  ProblemCollectionContent,
  ConfirmationNoteContent,
  FillInBlankContent,
  MistakeReasonContent,
} from '../types/smartNote';

// ============================================================
// エンジン1: 問題集型ノート生成
// ============================================================

/**
 * 正答率の低い問題を集約した問題集ノートを生成
 */
export async function generateProblemCollection(
  category?: string
): Promise<SmartNote> {
  const histories = await historyService.getAll();
  const allProblems = await db.problems.toArray();

  // 問題別の正答率を計算
  const problemStats = new Map<number, { correct: number; total: number; lastAttempted?: Date }>();
  for (const h of histories) {
    if (category && h.category !== category) continue;
    const stats = problemStats.get(h.problemId) || { correct: 0, total: 0 };
    stats.total++;
    if (h.isCorrect) stats.correct++;
    if (!stats.lastAttempted || new Date(h.timestamp) > stats.lastAttempted) {
      stats.lastAttempted = new Date(h.timestamp);
    }
    problemStats.set(h.problemId, stats);
  }

  // 正答率でソート (低い順)、最低2回以上回答した問題のみ
  const sorted = [...problemStats.entries()]
    .filter(([, s]) => s.total >= 2)
    .map(([problemId, s]) => ({
      problemId,
      accuracy: s.total > 0 ? s.correct / s.total : 0,
      lastAttempted: s.lastAttempted,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 30);

  // 問題データをマッピング
  const problemMap = new Map(allProblems.map(p => [p.id!, p]));

  const problems = sorted
    .filter(s => problemMap.has(s.problemId))
    .map(s => {
      const problem = problemMap.get(s.problemId)!;
      // 類似問題: 同カテゴリー + 同サブトピック
      const relatedProblemIds = allProblems
        .filter(p =>
          p.id !== s.problemId &&
          p.category === problem.category &&
          problem.subtopic && p.subtopic === problem.subtopic
        )
        .map(p => p.id!)
        .slice(0, 5);

      return {
        problemId: s.problemId,
        question: problem.question,
        accuracy: Math.round(s.accuracy * 100) / 100,
        lastAttempted: s.lastAttempted,
        relatedProblemIds,
      };
    });

  const content: ProblemCollectionContent = {
    type: 'problem_collection',
    problems,
    sortedBy: 'accuracy',
  };

  const note: Omit<SmartNote, 'id'> = {
    type: 'problem_collection',
    title: category ? `${category} - 苦手問題集` : '苦手問題集',
    category,
    content,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後
  };

  const id = await smartNoteDbService.add(note);
  return { ...note, id };
}

// ============================================================
// エンジン2: 確認ノート型（混同ペア検出）
// ============================================================

/**
 * 混同しやすい概念ペアを検出する確認ノートを生成
 */
export async function generateConfirmationNote(
  category?: string
): Promise<SmartNote> {
  const histories = await historyService.getAll();
  const allProblems = await db.problems.toArray();

  // 選択肢型の不正解のみ抽出
  const incorrectMC = histories.filter(h =>
    !h.isCorrect &&
    typeof h.userAnswer === 'number' &&
    (!category || h.category === category)
  );

  const problemMap = new Map(allProblems.filter(p => p.type === 'multiple-choice' && p.options).map(p => [p.id!, p]));

  // 混同ペアを検出: 「正解Aを選ぶべき時にBを選んだ」パターン
  const confusionCounts = new Map<string, { conceptA: string; conceptB: string; problemIdA: number; problemIdB: number; count: number }>();

  for (const h of incorrectMC) {
    const problem = problemMap.get(h.problemId);
    if (!problem || !problem.options || problem.correctAnswer === undefined) continue;

    const correctOption = problem.options[problem.correctAnswer];
    const selectedOption = problem.options[h.userAnswer as number];
    if (!correctOption || !selectedOption) continue;

    // ペアキー (アルファベット順で正規化)
    const pair = [correctOption, selectedOption].sort();
    const key = `${pair[0]}|||${pair[1]}`;

    const existing = confusionCounts.get(key) || {
      conceptA: pair[0],
      conceptB: pair[1],
      problemIdA: h.problemId,
      problemIdB: h.problemId,
      count: 0,
    };
    existing.count++;
    confusionCounts.set(key, existing);
  }

  // 混同率でソート (高い順)
  const confusionPairs = [...confusionCounts.values()]
    .filter(p => p.count >= 2) // 2回以上混同したペアのみ
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map(p => ({
      conceptA: p.conceptA,
      conceptB: p.conceptB,
      problemIdA: p.problemIdA,
      problemIdB: p.problemIdB,
      confusionRate: p.count,
    }));

  const content: ConfirmationNoteContent = {
    type: 'confirmation',
    confusionPairs,
  };

  const note: Omit<SmartNote, 'id'> = {
    type: 'confirmation',
    title: category ? `${category} - 混同ペアノート` : '混同ペアノート',
    category,
    content,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  const id = await smartNoteDbService.add(note);
  return { ...note, id };
}

// ============================================================
// エンジン3: 穴埋め型（キーワードマスキング）
// ============================================================

/**
 * 解説テキストからキーワードを抽出する（専門用語単位の抽出）
 *
 * 穴埋めに適した2-6文字の専門用語を抽出する。
 * - 漢字のみの熟語（例: 二重, 酸素, 水素, 酸化還元）
 * - カタカナ語（例: タンパク質, エネルギー, リボソーム）
 * - 英字専門用語（例: DNA, RNA, ATP）
 * ※ ひらがなを含む長い文節はマッチさせない（助詞で切れないため）
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];

  // 漢字のみの熟語（2-6文字）- ひらがなは含めない
  const kanjiMatches = text.match(/[\u4e00-\u9faf]{2,6}/g);
  if (kanjiMatches) keywords.push(...kanjiMatches);

  // カタカナ語（3-8文字）
  const katakanaMatches = text.match(/[\u30a0-\u30ff]{3,8}/g);
  if (katakanaMatches) keywords.push(...katakanaMatches);

  // 英字専門用語（2-10文字、例: "DNA", "SM-2", "H2O"）
  const techTerms = text.match(/[A-Za-z][A-Za-z0-9-]{1,9}/g);
  if (techTerms) keywords.push(...techTerms);

  // 重複除去
  const unique = [...new Set(keywords)].filter(k => k.length >= 2);

  // 頻出する一般的な漢字熟語・助詞を除外
  const stopWords = new Set([
    '場合', '必要', '可能', '以下', '以上', '結果', '状態', '特に',
    '非常', '一般', '多く', '大き', '小さ', '同じ', '異な', '含む',
    '持つ', '行う', '使用', '利用', '関連', '重要', '存在', '確認',
    '表示', '設定', '処理', '情報', '機能', '方法', '対応', '実行',
    'the', 'and', 'for', 'this', 'that', 'with',
  ]);

  return unique
    .filter(k => !stopWords.has(k))
    .slice(0, 8);
}

/**
 * 穴埋めノートを生成
 */
export async function generateFillInBlank(
  category?: string
): Promise<SmartNote> {
  const allProblems = await db.problems.toArray();

  // 解説があり、曖昧タグがある問題を優先
  let targetProblems = allProblems
    .filter(p =>
      p.explanation &&
      p.explanation.length >= 30 &&
      (!category || p.category === category)
    )
    .sort((a, b) => {
      // 曖昧タグがある問題を優先
      const aHasAmbiguous = a.noteTags?.includes('曖昧') ? 1 : 0;
      const bHasAmbiguous = b.noteTags?.includes('曖昧') ? 1 : 0;
      return bHasAmbiguous - aHasAmbiguous;
    })
    .slice(0, 20);

  const items = targetProblems
    .map(p => {
      const keywords = extractKeywords(p.explanation);
      if (keywords.length === 0) return null;

      // キーワードを___に置換
      let blankedText = p.explanation;
      const usedKeywords: string[] = [];
      for (const kw of keywords.slice(0, 3)) { // 最大3キーワードをマスク
        if (blankedText.includes(kw)) {
          blankedText = blankedText.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '___');
          usedKeywords.push(kw);
        }
      }

      if (usedKeywords.length === 0) return null;

      return {
        originalText: p.explanation,
        blankedText,
        keywords: usedKeywords,
        problemId: p.id!,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const content: FillInBlankContent = {
    type: 'fill_in_blank',
    items,
  };

  const note: Omit<SmartNote, 'id'> = {
    type: 'fill_in_blank',
    title: category ? `${category} - 穴埋めノート` : '穴埋めノート',
    category,
    content,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  const id = await smartNoteDbService.add(note);
  return { ...note, id };
}

// ============================================================
// エンジン4: 間違い理由別型
// ============================================================

/**
 * 間違い理由別ノートを生成
 */
export async function generateMistakeReasonNote(
  category?: string
): Promise<SmartNote> {
  const grouped = await getGroupedByReason(category);

  const content: MistakeReasonContent = {
    type: 'mistake_reason',
    reasonGroups: grouped,
  };

  const note: Omit<SmartNote, 'id'> = {
    type: 'mistake_reason',
    title: category ? `${category} - 間違い理由別ノート` : '間違い理由別ノート',
    category,
    content,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  const id = await smartNoteDbService.add(note);
  return { ...note, id };
}

// ============================================================
// 統合: 全タイプのスマートノート生成
// ============================================================

/**
 * 指定タイプのスマートノートを生成
 */
export async function generateSmartNote(
  type: SmartNoteType,
  category?: string
): Promise<SmartNote> {
  switch (type) {
    case 'problem_collection':
      return generateProblemCollection(category);
    case 'confirmation':
      return generateConfirmationNote(category);
    case 'fill_in_blank':
      return generateFillInBlank(category);
    case 'mistake_reason':
      return generateMistakeReasonNote(category);
  }
}

/**
 * キャッシュ済みまたは新規生成のスマートノートを取得
 */
export async function getOrGenerateSmartNote(
  type: SmartNoteType,
  category?: string
): Promise<SmartNote> {
  // キャッシュ済みノートを確認
  const cached = await smartNoteDbService.getLatestByType(type);
  if (cached && cached.expiresAt && new Date(cached.expiresAt) > new Date()) {
    // カテゴリーフィルターもチェック
    if (!category || cached.category === category) {
      return cached;
    }
  }

  // 新規生成
  return generateSmartNote(type, category);
}
