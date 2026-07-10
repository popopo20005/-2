/**
 * スマートノート型定義
 *
 * 4タイプのスマートノート + 間違い理由タグシステム
 */

// ============================================================
// 間違い理由タグ
// ============================================================

/** 間違い理由タグ */
export type MistakeReasonTag =
  | 'knowledge_gap'     // 知識不足
  | 'misunderstanding'  // 誤解・勘違い
  | 'ambiguous'         // 曖昧な記憶
  | 'calculation_error' // 計算ミス
  | 'careless'          // ケアレスミス
  | 'time_pressure';    // 時間不足

/** 間違い理由タグのメタデータ */
export const MISTAKE_REASON_META: Record<MistakeReasonTag, { label: string; labelEn: string; emoji: string }> = {
  knowledge_gap:     { label: '知識不足',     labelEn: 'Knowledge Gap',     emoji: '\u{1F4DA}' },
  misunderstanding:  { label: '誤解',         labelEn: 'Misunderstanding',  emoji: '\u{1F914}' },
  ambiguous:         { label: '曖昧',         labelEn: 'Ambiguous',         emoji: '\u{1F4AD}' },
  calculation_error: { label: '計算ミス',     labelEn: 'Calculation Error', emoji: '\u{1F522}' },
  careless:          { label: 'ケアレスミス', labelEn: 'Careless',          emoji: '\u{26A1}'  },
  time_pressure:     { label: '時間不足',     labelEn: 'Time Pressure',     emoji: '\u{23F1}'  },
};

/** 間違い理由記録 */
export interface MistakeReasonRecord {
  id?: number;
  historyId: number;
  problemId: number;
  category: string;
  reasonTag: MistakeReasonTag;
  note?: string;
  createdAt: Date;
}

// ============================================================
// スマートノート
// ============================================================

/** スマートノートタイプ */
export type SmartNoteType =
  | 'problem_collection' // 問題集型
  | 'confirmation'       // 確認ノート型
  | 'fill_in_blank'      // 穴埋め型
  | 'mistake_reason';    // 間違い理由別型

/** スマートノートタイプのメタデータ */
export const SMART_NOTE_TYPE_META: Record<SmartNoteType, { label: string; labelEn: string; emoji: string; description: string }> = {
  problem_collection: { label: '問題集',       labelEn: 'Problem Collection', emoji: '\u{1F4CB}', description: '正答率の低い問題を集約' },
  confirmation:       { label: '確認ノート',   labelEn: 'Confirmation Note',  emoji: '\u{1F50D}', description: '混同しやすい概念ペアを検出' },
  fill_in_blank:      { label: '穴埋め',       labelEn: 'Fill in Blank',      emoji: '\u{270F}',  description: 'キーワードをマスクして復習' },
  mistake_reason:     { label: '理由別',       labelEn: 'By Reason',          emoji: '\u{1F4CA}', description: '間違い理由別に問題を分類' },
};

/** スマートノート */
export interface SmartNote {
  id?: number;
  type: SmartNoteType;
  title: string;
  category?: string;
  content: SmartNoteContent;
  generatedAt: Date;
  expiresAt?: Date;
}

/** 各タイプ固有のコンテンツ (判別共用体) */
export type SmartNoteContent =
  | ProblemCollectionContent
  | ConfirmationNoteContent
  | FillInBlankContent
  | MistakeReasonContent;

export interface ProblemCollectionContent {
  type: 'problem_collection';
  problems: Array<{
    problemId: number;
    question: string;
    accuracy: number;
    lastAttempted?: Date;
    relatedProblemIds: number[];
  }>;
  sortedBy: 'accuracy' | 'frequency' | 'recent';
}

export interface ConfirmationNoteContent {
  type: 'confirmation';
  confusionPairs: Array<{
    conceptA: string;
    conceptB: string;
    problemIdA: number;
    problemIdB: number;
    confusionRate: number;
  }>;
}

export interface FillInBlankContent {
  type: 'fill_in_blank';
  items: Array<{
    originalText: string;
    blankedText: string;
    keywords: string[];
    problemId: number;
  }>;
}

export interface MistakeReasonContent {
  type: 'mistake_reason';
  reasonGroups: Array<{
    reason: MistakeReasonTag;
    count: number;
    problems: Array<{
      problemId: number;
      question: string;
      note?: string;
    }>;
  }>;
}
