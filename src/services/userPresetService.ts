/**
 * User Preset Service - カスタムプリセット CRUD サービス
 *
 * ユーザーが独自に作成した試験プリセットの
 * 作成・読取・更新・削除を管理する。
 */

import { db } from '../lib/database';
import type { UserPreset, PresetExportData } from '../types/userPreset';

/**
 * 一意のプリセットIDを生成
 */
function generatePresetId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `custom_${timestamp}_${random}`;
}

export const userPresetService = {
  /**
   * 全カスタムプリセットを取得
   */
  async getAll(): Promise<UserPreset[]> {
    return db.userPresets.orderBy('createdAt').reverse().toArray();
  },

  /**
   * presetId で取得
   */
  async getByPresetId(presetId: string): Promise<UserPreset | undefined> {
    return db.userPresets.where('presetId').equals(presetId).first();
  },

  /**
   * IDで取得
   */
  async getById(id: number): Promise<UserPreset | undefined> {
    return db.userPresets.get(id);
  },

  /**
   * カスタムプリセットを作成
   */
  async create(
    data: Omit<UserPreset, 'id' | 'presetId' | 'isCustom' | 'createdAt' | 'updatedAt'>
  ): Promise<UserPreset> {
    const now = new Date();
    const preset: UserPreset = {
      ...data,
      presetId: generatePresetId(),
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };

    const id = await db.userPresets.add(preset);
    return { ...preset, id: id as number };
  },

  /**
   * 組み込みプリセットを複製してカスタムプリセットを作成
   */
  async cloneFromBuiltIn(
    sourcePresetId: string,
    overrides?: Partial<Pick<UserPreset, 'name' | 'description' | 'weights'>>
  ): Promise<UserPreset> {
    const { getPresetById } = await import('../lib/examPresets');
    const source = getPresetById(sourcePresetId);
    if (!source) {
      throw new Error(`Built-in preset not found: ${sourcePresetId}`);
    }

    return this.create({
      name: overrides?.name ?? `${source.name} (カスタム)`,
      description: overrides?.description ?? source.description,
      category: source.category,
      weights: overrides?.weights ?? { ...source.weights },
      isTemplate: true,
      sourcePresetId,
    });
  },

  /**
   * カスタムプリセットを更新
   */
  async update(
    id: number,
    data: Partial<Omit<UserPreset, 'id' | 'presetId' | 'isCustom' | 'createdAt'>>
  ): Promise<void> {
    await db.userPresets.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  /**
   * カスタムプリセットを削除
   */
  async delete(id: number): Promise<void> {
    const preset = await db.userPresets.get(id);
    if (!preset) return;

    // 関連するサブトピック分析データも削除
    await db.personalSubtopicAnalyses
      .where('examId')
      .equals(preset.presetId)
      .delete();

    await db.userPresets.delete(id);
  },

  /**
   * カテゴリー別にカスタムプリセットを取得
   */
  async getByCategory(category: string): Promise<UserPreset[]> {
    return db.userPresets
      .where('category')
      .equals(category)
      .toArray();
  },

  /**
   * プリセット数を取得
   */
  async count(): Promise<number> {
    return db.userPresets.count();
  },

  /**
   * カスタムプリセットをJSON形式でエクスポート
   * サブトピック分析データも含める
   */
  async exportPreset(presetId: string): Promise<PresetExportData> {
    const preset = await this.getByPresetId(presetId);
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    // サブトピック分析データを取得
    const analyses = await db.personalSubtopicAnalyses
      .where('examId')
      .equals(presetId)
      .toArray();

    const subtopicAnalyses = analyses.map((a) => ({
      category: a.category,
      sessions: a.sessions,
    }));

    const { id, ...presetData } = preset;

    return {
      version: '1.0',
      type: 'minguella-custom-preset',
      preset: presetData,
      subtopicAnalyses: subtopicAnalyses.length > 0 ? subtopicAnalyses : undefined,
      exportedAt: new Date().toISOString(),
    };
  },

  /**
   * JSONデータからカスタムプリセットをインポート
   * 同名プリセットが存在する場合は新規IDで作成
   */
  async importPreset(data: PresetExportData): Promise<UserPreset> {
    // バリデーション
    if (data.type !== 'minguella-custom-preset' || !data.preset) {
      throw new Error('Invalid preset export data');
    }

    // 新規IDで作成
    const created = await this.create({
      name: data.preset.name,
      description: data.preset.description,
      category: data.preset.category,
      weights: data.preset.weights,
      iconEmoji: data.preset.iconEmoji,
      isTemplate: data.preset.isTemplate,
      sourcePresetId: data.preset.sourcePresetId,
      hasSubtopicData: data.preset.hasSubtopicData,
    });

    // サブトピック分析データのインポート
    if (data.subtopicAnalyses && data.subtopicAnalyses.length > 0) {
      const { addAnalysisSession } = await import('./subtopicAnalysisService');
      for (const analysisData of data.subtopicAnalyses) {
        for (const session of analysisData.sessions) {
          await addAnalysisSession(created.presetId, analysisData.category, session);
        }
      }
    }

    return created;
  },

  /**
   * 全カスタムプリセットを一括エクスポート
   */
  async exportAll(): Promise<PresetExportData[]> {
    const presets = await this.getAll();
    return Promise.all(presets.map((p) => this.exportPreset(p.presetId)));
  },
};
