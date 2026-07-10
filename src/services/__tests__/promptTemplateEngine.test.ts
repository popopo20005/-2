/**
 * promptTemplateEngine.ts Unit Tests
 *
 * マスタープラン Phase 1-1 のプロンプトテンプレートエンジンを検証する。
 * buildPrompt() は純粋関数なので DB 不要でテスト可能。
 */

import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../promptTemplateEngine';
import type { PromptGenerationParams } from '../promptTemplateEngine';

// ============================================================
// buildPrompt - 基本動作
// ============================================================

describe('buildPrompt - 基本動作', () => {
  it('最小限のパラメータでプロンプトを生成できる', () => {
    const result = buildPrompt({});
    expect(result.prompt).toContain('クイズ問題作成指示');
    expect(result.prompt).toContain('一般'); // デフォルトカテゴリー
    expect(result.metadata.count).toBe(10); // デフォルト
    expect(result.metadata.format).toBe('multiple-choice');
    expect(result.recommendedAI.length).toBeGreaterThan(0);
  });

  it('カテゴリーを指定するとプロンプトに反映される', () => {
    const result = buildPrompt({ categories: ['臨床栄養学'] });
    expect(result.prompt).toContain('臨床栄養学');
  });

  it('複数カテゴリーは「、」で結合される', () => {
    const result = buildPrompt({
      categories: ['臨床栄養学', '基礎栄養学', '公衆栄養学'],
    });
    expect(result.prompt).toContain('臨床栄養学、基礎栄養学、公衆栄養学');
  });

  it('問題数がプロンプトに含まれる', () => {
    const result = buildPrompt({ count: 25 });
    expect(result.prompt).toContain('25問');
    expect(result.metadata.count).toBe(25);
  });
});

// ============================================================
// 難易度の自動決定
// ============================================================

describe('buildPrompt - 難易度', () => {
  it('明示指定した難易度が使用される', () => {
    const result = buildPrompt({ difficulty: 'hard' });
    expect(result.resolvedDifficulty).toBe('hard');
    expect(result.prompt).toContain('上級');
  });

  it('auto かつ低い正答率（30%）なら easy', () => {
    const result = buildPrompt({ difficulty: 'auto', currentLevel: 30 });
    expect(result.resolvedDifficulty).toBe('easy');
  });

  it('auto かつ中程度の正答率（55%）なら normal', () => {
    const result = buildPrompt({ difficulty: 'auto', currentLevel: 55 });
    expect(result.resolvedDifficulty).toBe('normal');
  });

  it('auto かつ高い正答率（75%）なら hard', () => {
    const result = buildPrompt({ difficulty: 'auto', currentLevel: 75 });
    expect(result.resolvedDifficulty).toBe('hard');
  });

  it('auto かつ極めて高い正答率（95%）なら expert', () => {
    const result = buildPrompt({ difficulty: 'auto', currentLevel: 95 });
    expect(result.resolvedDifficulty).toBe('expert');
  });

  it('difficulty 省略時は auto として扱われる', () => {
    const result = buildPrompt({ currentLevel: 35 });
    expect(result.resolvedDifficulty).toBe('easy');
  });
});

// ============================================================
// 試験日カウントダウン
// ============================================================

describe('buildPrompt - 試験日カウントダウン', () => {
  function futureDate(daysAhead: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d;
  }

  it('試験日が7日以内なら「試験直前モード」', () => {
    const result = buildPrompt({
      examDate: futureDate(5),
      examName: '管理栄養士試験',
    });
    expect(result.prompt).toContain('試験直前モード');
    expect(result.prompt).toContain('管理栄養士試験');
    expect(result.prompt).toContain('残り5日');
  });

  it('試験日が30日以内なら「試験直前対策モード」', () => {
    const result = buildPrompt({ examDate: futureDate(20) });
    expect(result.prompt).toContain('試験直前対策モード');
  });

  it('試験日が90日以内なら「試験対策強化モード」', () => {
    const result = buildPrompt({ examDate: futureDate(60) });
    expect(result.prompt).toContain('試験対策強化モード');
  });

  it('試験日が90日を超えるなら「基礎固めモード」', () => {
    const result = buildPrompt({ examDate: futureDate(180) });
    expect(result.prompt).toContain('基礎固めモード');
  });

  it('試験日が未指定ならカウントダウン情報は含まれない', () => {
    const result = buildPrompt({});
    expect(result.prompt).not.toContain('試験直前モード');
    expect(result.prompt).not.toContain('基礎固めモード');
    expect(result.metadata.daysUntilExam).toBeUndefined();
  });

  it('metadata に残日数と試験名が記録される', () => {
    const result = buildPrompt({
      examDate: futureDate(45),
      examName: 'TOEIC',
    });
    expect(result.metadata.daysUntilExam).toBeGreaterThanOrEqual(44);
    expect(result.metadata.daysUntilExam).toBeLessThanOrEqual(45);
    expect(result.metadata.examName).toBe('TOEIC');
  });
});

// ============================================================
// 苦手概念タグ
// ============================================================

describe('buildPrompt - 苦手概念タグ', () => {
  it('苦手タグがプロンプトに反映される', () => {
    const result = buildPrompt({
      weaknessTags: ['糖代謝', 'インスリン作用', '脂質代謝'],
    });
    expect(result.prompt).toContain('苦手分野の強化指示');
    expect(result.prompt).toContain('糖代謝');
    expect(result.prompt).toContain('インスリン作用');
    expect(result.prompt).toContain('脂質代謝');
  });

  it('苦手タグが空なら強化指示セクションは含まれない', () => {
    const result = buildPrompt({ weaknessTags: [] });
    expect(result.prompt).not.toContain('苦手分野の強化指示');
  });

  it('苦手タグが metadata に記録される', () => {
    const tags = ['A', 'B', 'C'];
    const result = buildPrompt({ weaknessTags: tags });
    expect(result.metadata.weaknessTags).toEqual(tags);
  });
});

// ============================================================
// 問題形式
// ============================================================

describe('buildPrompt - 問題形式', () => {
  it('multiple-choice は4肢選択フォーマット', () => {
    const result = buildPrompt({ format: 'multiple-choice' });
    expect(result.prompt).toContain('4肢選択');
    expect(result.prompt).toContain('1. [選択肢1の内容]');
    expect(result.prompt).toContain('4. [選択肢4の内容]');
  });

  it('true-false は○×判定フォーマット', () => {
    const result = buildPrompt({ format: 'true-false' });
    expect(result.prompt).toContain('○×判定');
    expect(result.prompt).toContain('1. 正しい');
    expect(result.prompt).toContain('2. 誤り');
  });

  it('fill-in-blank は穴埋め選択フォーマット', () => {
    const result = buildPrompt({ format: 'fill-in-blank' });
    expect(result.prompt).toContain('穴埋め選択');
    expect(result.prompt).toContain('（　　　）で空欄');
  });
});

// ============================================================
// 参考資料
// ============================================================

describe('buildPrompt - 参考資料', () => {
  it('参考資料がプロンプトに含まれる', () => {
    const result = buildPrompt({
      referenceText: 'これは参考資料のテキストです。',
    });
    expect(result.prompt).toContain('## 参考資料');
    expect(result.prompt).toContain('これは参考資料のテキストです。');
  });

  it('参考資料が空ならセクションは含まれない', () => {
    const result = buildPrompt({});
    expect(result.prompt).not.toContain('## 参考資料');
  });

  it('極端に長い参考資料は切り詰められる', () => {
    const longText = 'あ'.repeat(100000);
    const result = buildPrompt({ referenceText: longText });
    // 全文ではなく切り詰められたものが含まれる
    expect(result.prompt.length).toBeLessThan(100000);
  });
});

// ============================================================
// 出力フォーマット互換性
// ============================================================

describe('buildPrompt - AI_QUIZ_PROMPT_TEMPLATE 互換性', () => {
  it('重要ルールが全て含まれる', () => {
    const result = buildPrompt({ format: 'multiple-choice' });
    expect(result.prompt).toContain('「1. 」「2. 」「3. 」「4. 」で始める');
    expect(result.prompt).toContain('半角スペース');
    expect(result.prompt).toContain('「---」');
  });

  it('正解番号の指示が含まれる', () => {
    const result = buildPrompt({ format: 'multiple-choice' });
    expect(result.prompt).toContain('正解番号は1-4の数字のみ');
  });

  it('Minguella Quiz App のブランディングが含まれる', () => {
    const result = buildPrompt({});
    expect(result.prompt).toContain('Minguella Quiz App');
  });
});

// ============================================================
// 統合テスト: 複雑なシナリオ
// ============================================================

describe('buildPrompt - 統合シナリオ', () => {
  it('試験3日前+苦手分野+高難易度の統合プロンプト', () => {
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 3);

    const params: PromptGenerationParams = {
      categories: ['循環器', '呼吸器'],
      weaknessTags: ['不整脈', 'ECG判読', '心不全'],
      count: 20,
      difficulty: 'expert',
      examDate,
      examName: '看護師国家試験',
      format: 'multiple-choice',
    };

    const result = buildPrompt(params);

    // 全要素が含まれていることを確認
    expect(result.prompt).toContain('循環器');
    expect(result.prompt).toContain('呼吸器');
    expect(result.prompt).toContain('不整脈');
    expect(result.prompt).toContain('ECG判読');
    expect(result.prompt).toContain('試験直前モード');
    expect(result.prompt).toContain('看護師国家試験');
    expect(result.prompt).toContain('20問');
    expect(result.prompt).toContain('超上級');

    // メタデータ検証
    expect(result.metadata.categories).toEqual(['循環器', '呼吸器']);
    expect(result.metadata.weaknessTags).toHaveLength(3);
    expect(result.metadata.count).toBe(20);
    expect(result.resolvedDifficulty).toBe('expert');
  });

  it('auto難易度 + 参考資料の組み合わせ', () => {
    const result = buildPrompt({
      difficulty: 'auto',
      currentLevel: 45,
      referenceText: '糖尿病の診断基準について...',
      categories: ['内分泌'],
    });

    expect(result.resolvedDifficulty).toBe('normal'); // 45% → normal
    expect(result.prompt).toContain('糖尿病の診断基準について');
    expect(result.prompt).toContain('内分泌');
  });
});
