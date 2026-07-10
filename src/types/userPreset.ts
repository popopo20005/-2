/**
 * User Preset Types - ユーザーカスタムプリセットの型定義
 *
 * ユーザーが独自に作成・編集できる試験プリセット。
 * 組み込みプリセット (EXAM_PRESETS) と同じ構造で、
 * プリセット選択UIで統合表示される。
 */

/**
 * ユーザーカスタムプリセット
 */
export interface UserPreset {
  id?: number;

  /** 一意のプリセットID (例: "custom_1712345678_abc") */
  presetId: string;

  /** プリセット名 (例: "社内昇格試験") */
  name: string;

  /** 説明 */
  description?: string;

  /** カテゴリー */
  category: 'medical' | 'business' | 'language' | 'other' | 'custom';

  /** アイコン絵文字 */
  iconEmoji?: string;

  /** UI表示色 */
  color?: string;

  /** カテゴリー別配点 (ExamPreset.weights と互換) */
  weights: Record<string, number>;

  /** カスタムプリセット識別子 */
  isCustom: true;

  /** 組み込みプリセットから複製したか */
  isTemplate?: boolean;

  /** 複製元のプリセットID */
  sourcePresetId?: string;

  /** サブトピック分析データが蓄積されているか */
  hasSubtopicData?: boolean;

  /** 作成日時 */
  createdAt: Date;

  /** 更新日時 */
  updatedAt: Date;
}

/**
 * プリセット統合型 - 組み込み + カスタムの共通インターフェース
 */
export interface UnifiedPreset {
  id: string;
  name: string;
  description?: string;
  category: string;
  weights: Record<string, number>;
  isCustom: boolean;
  iconEmoji?: string;
  hasSubtopicData?: boolean;
}

/**
 * プリセットエクスポート形式
 */
export interface PresetExportData {
  version: '1.0';
  type: 'minguella-custom-preset';
  preset: Omit<UserPreset, 'id'>;
  subtopicAnalyses?: Array<{
    category: string;
    sessions: import('./subtopicAnalysis').AnalysisSession[];
  }>;
  exportedAt: string;
}
