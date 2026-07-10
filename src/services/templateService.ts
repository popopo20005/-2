import { db } from '../lib/database';
import type { NoteTemplate } from '../types';

/**
 * ノートテンプレート管理サービス
 * カスタムテンプレートのCRUD操作を提供
 */
export const templateService = {
  /**
   * 新しいテンプレートを作成
   */
  async create(template: Omit<NoteTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    const newTemplate: Omit<NoteTemplate, 'id'> = {
      ...template,
      createdAt: now,
      updatedAt: now
    };

    return await db.noteTemplates.add(newTemplate);
  },

  /**
   * テンプレートを更新
   */
  async update(id: number, updates: Partial<Omit<NoteTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    await db.noteTemplates.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  },

  /**
   * テンプレートを削除
   */
  async delete(id: number): Promise<void> {
    await db.noteTemplates.delete(id);
  },

  /**
   * すべてのテンプレートを取得
   * デフォルトテンプレートを先に、その後カスタムテンプレートを作成日時順で取得
   */
  async getAll(): Promise<NoteTemplate[]> {
    const templates = await db.noteTemplates.toArray();

    // 名前で重複を除外（同じ名前のテンプレートが複数ある場合、最新のもののみ残す）
    const uniqueTemplates = templates.reduce((acc, template) => {
      const existing = acc.find(t => t.name === template.name);
      if (!existing) {
        acc.push(template);
      } else if (template.id && existing.id && template.id > existing.id) {
        // より新しいIDのテンプレートに置き換え
        const index = acc.indexOf(existing);
        acc[index] = template;
      }
      return acc;
    }, [] as NoteTemplate[]);

    // デフォルトテンプレートを先に、カスタムテンプレートは作成日時の新しい順
    return uniqueTemplates.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  },

  /**
   * IDでテンプレートを取得
   */
  async getById(id: number): Promise<NoteTemplate | undefined> {
    return await db.noteTemplates.get(id);
  },

  /**
   * カテゴリー別にテンプレートを取得
   */
  async getByCategory(category: string): Promise<NoteTemplate[]> {
    return await db.noteTemplates.where('category').equals(category).toArray();
  },

  /**
   * デフォルトテンプレートのみを取得
   */
  async getDefaults(): Promise<NoteTemplate[]> {
    return await db.noteTemplates.where('isDefault').equals(1 as any).toArray();
  },

  /**
   * カスタムテンプレートのみを取得
   */
  async getCustom(): Promise<NoteTemplate[]> {
    const templates = await db.noteTemplates.where('isDefault').notEqual(1 as any).toArray();
    return templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  /**
   * 重複テンプレートをクリーンアップ
   * 同じ名前のテンプレートが複数ある場合、古いものを削除
   */
  async cleanupDuplicates(): Promise<void> {
    const allTemplates = await db.noteTemplates.toArray();
    const nameMap = new Map<string, NoteTemplate[]>();

    // 名前ごとにグループ化
    allTemplates.forEach(template => {
      const existing = nameMap.get(template.name) || [];
      existing.push(template);
      nameMap.set(template.name, existing);
    });

    // 重複を削除（最新のIDを持つもの以外を削除）
    for (const [name, templates] of nameMap.entries()) {
      if (templates.length > 1) {
        // IDでソート（降順）して、最新のもの以外を削除
        const sorted = templates.sort((a, b) => (b.id || 0) - (a.id || 0));
        for (let i = 1; i < sorted.length; i++) {
          const templateId = sorted[i].id;
          if (templateId !== undefined) {
            await this.delete(templateId);
            console.log(`[TemplateService] 重複テンプレート削除: ${name} (ID: ${templateId})`);
          }
        }
      }
    }
  },

  /**
   * デフォルトテンプレートを初期化
   * アプリ起動時に1度だけ実行
   */
  async initializeDefaults(): Promise<void> {
    // まず重複をクリーンアップ
    await this.cleanupDuplicates();

    const existingDefaults = await this.getDefaults();

    // すでにデフォルトテンプレートが存在する場合はスキップ
    if (existingDefaults.length > 0) {
      return;
    }

    const defaultTemplates: Omit<NoteTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: '基本メモ',
        emoji: '📋',
        category: 'custom',
        isDefault: true,
        content: `# メモ

## 重要なポイント
-

## 注意点
-

## 参考
- `
      },
      {
        name: '学習ポイント',
        emoji: '💡',
        category: 'learning',
        isDefault: true,
        content: `# 学習ポイント

## 理解したこと
-

## まだ理解できていないこと
-

## 復習すべき内容
-

## 関連問題
- `
      },
      {
        name: 'つまずきポイント',
        emoji: '❌',
        category: 'error',
        isDefault: true,
        content: `# つまずきポイント

## 間違えた理由
-

## 正しい考え方
-

## 覚えておくべきこと
-

## 類似問題での注意点
- `
      },
      {
        name: '解法パターン',
        emoji: '🔧',
        category: 'solution',
        isDefault: true,
        content: `# 解法パターン

## アプローチ
-

## 重要な公式・概念
-

## 計算量
- 時間計算量: O()
- 空間計算量: O()`
      },
      {
        name: '参考リンク・資料',
        emoji: '🔗',
        category: 'reference',
        isDefault: true,
        content: `# 参考リンク・資料

## 公式ドキュメント
-

## 参考記事
-

## 関連動画
-

## メモ
- `
      }
    ];

    for (const template of defaultTemplates) {
      await this.create(template);
    }
  },

  /**
   * テンプレートの総数を取得
   */
  async count(): Promise<number> {
    return await db.noteTemplates.count();
  },

  /**
   * テンプレートを複製
   */
  async duplicate(id: number): Promise<number> {
    const template = await this.getById(id);
    if (!template) {
      throw new Error('テンプレートが見つかりません');
    }

    const duplicatedTemplate: Omit<NoteTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `${template.name}のコピー`,
      emoji: template.emoji,
      content: template.content,
      category: template.category,
      isDefault: false // 複製されたテンプレートは常にカスタムテンプレート
    };

    return await this.create(duplicatedTemplate);
  },

  /**
   * テンプレートを検索（名前と内容から部分一致）
   */
  async search(query: string): Promise<NoteTemplate[]> {
    const allTemplates = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return allTemplates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.content.toLowerCase().includes(lowerQuery)
    );
  }
};
