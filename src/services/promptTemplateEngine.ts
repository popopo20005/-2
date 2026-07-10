/**
 * Prompt Template Engine - プロンプト自動生成エンジン
 *
 * マスタープラン Phase 1-1 の実装。
 * 方針①「AI API は初期フェーズ導入なし」に従い、ユーザーの学習データから
 * **外部AI（ChatGPT, Claude, Gemini等）にコピペできるプロンプトを自動生成**する。
 *
 * === 入力情報 → 自動生成されるプロンプト内容 ===
 * | 入力情報       | プロンプト反映                                |
 * |---------------|----------------------------------------------|
 * | 科目・分野     | 問題の出題範囲・専門用語レベルを指定            |
 * | 苦手概念タグ   | その概念を重点的に扱う問題生成プロンプト        |
 * | 難易度・問題数 | 難易度・形式（選択肢/○×）・問題数を明示        |
 * | 試験日残日数   | 重要度の高い頻出分野に絞るよう指示              |
 *
 * === 出力形式 ===
 * AI_QUIZ_PROMPT_TEMPLATE.md と互換の形式:
 *   [カテゴリ名]
 *   問題[番号]
 *   [問題文]
 *   1. [選択肢1]
 *   ...
 *   正解：[1-5]
 *   解説： [説明]
 *   ---
 *
 * このエンジンはAPIを呼び出さず、純粋にプロンプト文字列を返す。
 * ユーザーは生成されたプロンプトをコピーし、外部AIサービスで利用できる。
 *
 * @module promptTemplateEngine
 */

import { detectTopWeaknesses } from './weaknessDetectionService';
import { studyPlanService, problemService, historyService } from '../lib/database';
import type { StudyPlan } from '../types/studyPlan';

// ============================================================
// 型定義
// ============================================================

/**
 * プロンプト難易度
 */
export type PromptDifficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'auto';

/**
 * プロンプト形式
 */
export type PromptFormat = 'multiple-choice' | 'multiple-choice-5' | 'true-false' | 'fill-in-blank' | 'mixed';

/**
 * 出力フォーマット
 * - 'text': AI_QUIZ_PROMPT_TEMPLATE.md 互換のテキスト形式
 * - 'json': 厳密なJSON形式（パースが安定し、インポート精度が高い）
 */
export type PromptOutputFormat = 'text' | 'json';

/**
 * プロンプト生成パラメータ
 */
export interface PromptGenerationParams {
  /** 対象カテゴリー/科目（空配列の場合、弱点から自動選択） */
  categories?: string[];

  /** 問題数（デフォルト: 10） */
  count?: number;

  /** 難易度（autoの場合、実力から自動決定） */
  difficulty?: PromptDifficulty;

  /** 問題形式 */
  format?: PromptFormat;

  /** 出力フォーマット: 'text' または 'json'（デフォルト: 'text'） */
  outputFormat?: PromptOutputFormat;

  /** 苦手概念タグ（指定がなければ弱点検出から自動取得） */
  weaknessTags?: string[];

  /** 試験日（カウントダウン表示用） */
  examDate?: Date;

  /** 試験名 */
  examName?: string;

  /** 参考資料テキスト（任意） */
  referenceText?: string;

  /** ユーザーの現在レベル（自動決定時のヒント） */
  currentLevel?: number;

  /** 言語 */
  lang?: 'ja' | 'en';
}

/**
 * プロンプト生成結果
 */
export interface GeneratedPrompt {
  /** 生成されたプロンプト本文（コピペ用） */
  prompt: string;

  /** 使用された難易度（autoの場合、決定された値） */
  resolvedDifficulty: Exclude<PromptDifficulty, 'auto'>;

  /** プロンプトに含まれたメタ情報 */
  metadata: {
    categories: string[];
    weaknessTags: string[];
    count: number;
    format: PromptFormat;
    daysUntilExam?: number;
    examName?: string;
    currentAccuracy?: number;
    generatedAt: Date;
  };

  /** おすすめAI（Claude/ChatGPT/Gemini） */
  recommendedAI: string[];
}

// ============================================================
// 定数
// ============================================================

const DEFAULT_COUNT = 10;
const DEFAULT_FORMAT: PromptFormat = 'multiple-choice';

/** 難易度の説明文 */
const DIFFICULTY_DESCRIPTIONS: Record<Exclude<PromptDifficulty, 'auto'>, string> = {
  easy: '初級（基本用語の定義、単純な事実の確認）',
  normal: '標準（概念の理解、基本的な応用）',
  hard: '上級（複合的な推論、複数知識の統合）',
  expert: '超上級（極めて難解、専門的な臨床判断）',
};

/** 難易度ごとの詳細指示 */
const DIFFICULTY_INSTRUCTIONS: Record<Exclude<PromptDifficulty, 'auto'>, string> = {
  easy: `【初級問題の特徴】
- 基本用語の定義や単純な事実を問う
- 教科書の太字部分レベルの知識
- 選択肢は明確に区別できる`,
  normal: `【標準問題の特徴】
- 概念の理解や基本的な応用を問う
- 一般的な状況や標準的なケース
- ある程度の思考が必要だが、基本知識で解ける`,
  hard: `【上級問題の特徴】
- 複数の知識を統合して考える必要がある
- 複雑なケーススタディや鑑別問題
- 誤答選択肢も一見正しく見える`,
  expert: `【超上級問題の特徴】
- 極めて難解で専門的な知識が必要
- 稀なケースやエッジケース
- 最新の情報や高度な判断を要する`,
};

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 正答率から難易度を自動決定
 *
 * - 0〜40%: easy（基礎から）
 * - 41〜60%: normal（標準）
 * - 61〜80%: hard（上級）
 * - 81〜100%: expert（超上級）
 */
function resolveDifficultyFromAccuracy(
  accuracy: number
): Exclude<PromptDifficulty, 'auto'> {
  if (accuracy <= 40) return 'easy';
  if (accuracy <= 60) return 'normal';
  if (accuracy <= 80) return 'hard';
  return 'expert';
}

/**
 * 試験日までの日数を計算
 */
function getDaysUntilExam(examDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(examDate);
  target.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((target.getTime() - today.getTime()) / msPerDay);
}

/**
 * 試験日残日数に基づくフォーカス指示を生成
 *
 * マスタープラン仕様:
 * - 残日数が少ないほど「頻出分野に絞る」指示を強化
 */
function buildExamUrgencyInstruction(daysUntilExam: number, examName?: string): string {
  const examLabel = examName ?? '本試験';

  if (daysUntilExam <= 7) {
    return `## 試験直前モード
- **${examLabel}まで残り${daysUntilExam}日**です。極めて重要な頻出分野のみに絞ってください。
- 過去問で頻出の典型問題を優先し、奇問・難問は避けてください。
- 短時間で復習できる重要事項の確認を重視してください。`;
  }

  if (daysUntilExam <= 30) {
    return `## 試験直前対策モード
- **${examLabel}まで残り${daysUntilExam}日**です。頻出分野と重要概念に集中してください。
- 基礎事項の再確認より、応用力・判断力を問う問題を多めにしてください。
- 実戦形式の問題を重視してください。`;
  }

  if (daysUntilExam <= 90) {
    return `## 試験対策強化モード
- **${examLabel}まで残り${daysUntilExam}日**です。頻出分野を重点的にカバーしてください。
- 基礎から応用まで幅広く、バランスよく出題してください。`;
  }

  return `## 基礎固めモード
- **${examLabel}まで残り${daysUntilExam}日**と余裕があります。
- 基礎事項を着実に身につける問題を中心にしてください。
- 体系的な理解を促す問題構成にしてください。`;
}

/**
 * 苦手概念タグのフォーカス指示を生成
 */
function buildWeaknessInstruction(weaknessTags: string[]): string {
  if (weaknessTags.length === 0) return '';

  return `## 苦手分野の強化指示
ユーザーが特に苦手としている以下の概念を**重点的に**扱ってください:
${weaknessTags.map((tag, i) => `  ${i + 1}. ${tag}`).join('\n')}

上記の概念について、誤解しやすいポイント・混同しやすい類似概念を明確に区別できる問題を作成してください。`;
}

/**
 * 参考資料セクションを生成
 */
function buildReferenceSection(referenceText: string): string {
  // 過度に長い場合は切り詰め
  const maxChars = 60000;
  let text = referenceText;
  if (text.length > maxChars) {
    const cutPoint = text.lastIndexOf('\n', maxChars);
    text = text.slice(0, cutPoint > maxChars * 0.8 ? cutPoint : maxChars);
  }

  return `## 参考資料
以下の資料に**基づいて**問題を作成してください。資料にない情報で問題を作らないでください。

<reference>
${text}
</reference>
`;
}

/**
 * JSON出力フォーマット指示を生成
 * ProblemEditor.parseJSONToQuizData の構造と互換
 */
function buildJSONOutputFormatInstruction(
  format: PromptFormat,
  count: number,
  categories: string[]
): string {
  // 選択肢数は形式に応じて変える
  const optionsCount = format === 'true-false' ? 2 : format === 'multiple-choice-5' ? 5 : 4;
  const optionExample =
    format === 'true-false'
      ? '["正しい", "誤り"]'
      : format === 'multiple-choice-5'
        ? '["選択肢1の内容", "選択肢2の内容", "選択肢3の内容", "選択肢4の内容", "選択肢5の内容"]'
        : '["選択肢1の内容", "選択肢2の内容", "選択肢3の内容", "選択肢4の内容"]';
  const categoryExample = categories[0] ?? 'カテゴリ名';
  const maxAnswerIndex = optionsCount - 1;

  // 複数カテゴリーの場合はproblem単位でcategoryを振る例を示す
  const isMultiCategory = categories.length > 1;
  const multiCategoryNote = isMultiCategory
    ? `\n**複数カテゴリー対応**: 各問題の "category" フィールドで ${categories
        .map((c) => `"${c}"`)
        .join(' / ')} を使い分けてください。`
    : '';

  return `## 出力フォーマット（厳守: JSON形式）

以下の**JSON形式**に従って、クイズ問題を出力してください。
JSONとして有効な形式で、余計な文章やマークダウンのコードブロックで囲まずに**純粋なJSONのみ**を返してください。

\`\`\`json
{
  "category": "${categoryExample}",
  "problems": [
    {
      "category": "${categoryExample}",
      "question": "問題文",
      "options": ${optionExample},
      "correctAnswer": 0,
      "explanation": "正解の選択肢を明記した解説文"
    }
  ]
}
\`\`\`

## ⚠️ 超重要ルール
1. **correctAnswer は 0-${maxAnswerIndex} の整数**（0 = 選択肢1、1 = 選択肢2、...）
2. **options は必ず ${optionsCount} 要素の配列**
3. **JSONとして有効な形式**（ダブルクォート、末尾カンマ禁止）
4. **explanation に正解の選択肢の内容を含める**
5. **${count}問生成してください**${multiCategoryNote}
6. コードブロック（\`\`\`）や前後の説明は **一切不要**。JSONそのものだけを返してください。`;
}

/**
 * 出力フォーマット指示を生成（AI_QUIZ_PROMPT_TEMPLATE.md 互換）
 */
function buildOutputFormatInstruction(format: PromptFormat, count: number): string {
  if (format === 'true-false') {
    return `## 出力フォーマット（厳守）

\`\`\`
[カテゴリ名]

問題[番号]
[問題文]
1. 正しい
2. 誤り
正解：[1または2]
解説： [正解の選択肢を明記した解説文]

---
\`\`\`

- 各問題は「---」（ハイフン3つ）で区切る
- 正解は1または2の数字のみ
- ${count}問生成してください`;
  }

  if (format === 'fill-in-blank') {
    return `## 出力フォーマット（厳守）

\`\`\`
[カテゴリ名]

問題[番号]
[問題文に（　　　）で空欄を作る]
1. [選択肢1]
2. [選択肢2]
3. [選択肢3]
4. [選択肢4]
正解：[1-4]
解説： [正解の選択肢を明記した解説文]

---
\`\`\`

- 問題文中の重要概念を（　　　）で伏せる
- 各問題は「---」で区切る
- ${count}問生成してください`;
  }

  const optCount = format === 'multiple-choice-5' ? 5 : 4;
  const optLines = Array.from({ length: optCount }, (_, i) => `${i + 1}. [選択肢${i + 1}の内容]`).join('\n');
  const optLabels = Array.from({ length: optCount }, (_, i) => `「${i + 1}. 」`).join('');

  return `## 出力フォーマット（厳守）

\`\`\`
[カテゴリ名]

問題[番号]
[問題文]
${optLines}
正解：[1-${optCount}の数字のみ]
解説： [正解の選択肢を明記した解説文]

---
\`\`\`

## ⚠️ 超重要ルール
1. **選択肢は必ず${optLabels}で始める**
2. **「1.」の後には必ず半角スペース**
3. **正解番号は1-${optCount}の数字のみ**（説明文は不要）
4. **各問題は「---」（ハイフン3つ）で区切る**
5. **${count}問生成してください**`;
}

// ============================================================
// メイン: プロンプト生成
// ============================================================

/**
 * プロンプトを生成する
 *
 * @param params 生成パラメータ
 * @returns 生成されたプロンプト
 */
export function buildPrompt(params: PromptGenerationParams): GeneratedPrompt {
  const categories = params.categories && params.categories.length > 0
    ? params.categories
    : ['一般'];
  const count = params.count ?? DEFAULT_COUNT;
  const format = params.format ?? DEFAULT_FORMAT;
  const outputFormat: PromptOutputFormat = params.outputFormat ?? 'text';
  const weaknessTags = params.weaknessTags ?? [];

  // 難易度の解決
  let resolvedDifficulty: Exclude<PromptDifficulty, 'auto'>;
  if (params.difficulty === 'auto' || !params.difficulty) {
    const accuracy = params.currentLevel ?? 60;
    resolvedDifficulty = resolveDifficultyFromAccuracy(accuracy);
  } else {
    resolvedDifficulty = params.difficulty;
  }

  // 試験日残日数
  let daysUntilExam: number | undefined;
  let urgencyInstruction = '';
  if (params.examDate) {
    daysUntilExam = getDaysUntilExam(params.examDate);
    urgencyInstruction = buildExamUrgencyInstruction(daysUntilExam, params.examName);
  }

  // 苦手分野指示
  const weaknessInstruction = buildWeaknessInstruction(weaknessTags);

  // 参考資料
  const referenceSection = params.referenceText
    ? buildReferenceSection(params.referenceText)
    : '';

  // 出力フォーマット
  const outputFormatSection =
    outputFormat === 'json'
      ? buildJSONOutputFormatInstruction(format, count, categories)
      : buildOutputFormatInstruction(format, count);

  // カテゴリー表示（複数対応）
  const categoryLabel = categories.length === 1
    ? categories[0]
    : categories.join('、');

  // ============================================================
  // プロンプト組み立て
  // ============================================================
  const prompt = `# クイズ問題作成指示

あなたは「${categoryLabel}」分野の試験問題を作成する専門家です。
正確で教育効果の高い問題を生成してください。

## 生成条件
- 分野: ${categoryLabel}
- 難易度: ${DIFFICULTY_DESCRIPTIONS[resolvedDifficulty]}
- 問題数: ${count}問
- 形式: ${
    format === 'multiple-choice'
      ? '4肢選択'
      : format === 'true-false'
        ? '○×判定'
        : format === 'fill-in-blank'
          ? '穴埋め選択'
          : '混合形式'
  }

## 難易度の詳細ガイドライン
${DIFFICULTY_INSTRUCTIONS[resolvedDifficulty]}
${urgencyInstruction ? '\n' + urgencyInstruction : ''}
${weaknessInstruction ? '\n' + weaknessInstruction : ''}
${referenceSection ? '\n' + referenceSection : ''}
## 問題作成ルール
1. **正確性**: 事実に基づいた問題のみ作成する
2. **難易度遵守**: 指定難易度を厳守。基本問題と応用問題を混在させない
3. **誤答選択肢の質**: 誤答は「もっともらしいが明確に間違い」であること
4. **正解の分散**: 正解番号が偏らないようランダムに配置する
5. **解説の充実**: なぜ正解か、なぜ他が不正解かを簡潔に説明（150〜250字）
6. **問題の独立性**: 各問題は独立して解答可能であること

${outputFormatSection}

---
このプロンプトは Minguella Quiz App の学習データに基づき自動生成されました。
生成した問題は Minguella Quiz App にそのままインポート可能です。`;

  return {
    prompt,
    resolvedDifficulty,
    metadata: {
      categories,
      weaknessTags,
      count,
      format,
      daysUntilExam,
      examName: params.examName,
      currentAccuracy: params.currentLevel,
      generatedAt: new Date(),
    },
    recommendedAI: ['Claude (claude.ai)', 'ChatGPT (chat.openai.com)', 'Gemini (gemini.google.com)'],
  };
}

// ============================================================
// 学習データと連携: スマートプロンプト生成
// ============================================================

/**
 * ユーザーの学習データから自動でパラメータを組み立て、プロンプトを生成する
 *
 * 以下のデータソースから自動で情報を取得:
 * - 弱点検出サービス → 苦手カテゴリー・正答率
 * - アクティブな学習プラン → 試験日・試験名
 * - 履歴 → 現在の実力レベル
 *
 * @param overrides 上書きパラメータ（任意）
 * @returns 学習データに最適化されたプロンプト
 */
export async function buildSmartPrompt(
  overrides: Partial<PromptGenerationParams> = {}
): Promise<GeneratedPrompt> {
  console.log('[PromptTemplateEngine] スマートプロンプトを生成中...');

  // 1. 弱点検出から苦手カテゴリーと正答率を取得
  let weaknessTags: string[] = overrides.weaknessTags ?? [];
  let autoCategories: string[] = overrides.categories ?? [];
  let currentLevel: number | undefined = overrides.currentLevel;

  try {
    const topWeaknesses = await detectTopWeaknesses();
    if (topWeaknesses && topWeaknesses.length > 0) {
      // 苦手タグが指定されていない場合、上位3つの弱点を自動選択
      if (weaknessTags.length === 0) {
        weaknessTags = topWeaknesses.slice(0, 3).map((w) => w.category);
      }
      // カテゴリーが指定されていない場合、上位弱点をカテゴリーとして使用
      if (autoCategories.length === 0) {
        autoCategories = topWeaknesses.slice(0, 3).map((w) => w.category);
      }
    }
  } catch (e) {
    console.warn('[PromptTemplateEngine] 弱点検出エラー:', e);
  }

  // 2. 全体正答率の計算（currentLevel未指定の場合）
  if (currentLevel === undefined) {
    try {
      const history = await historyService.getAll();
      if (history.length > 0) {
        const correctCount = history.filter((h) => h.isCorrect).length;
        currentLevel = (correctCount / history.length) * 100;
      }
    } catch (e) {
      console.warn('[PromptTemplateEngine] 履歴取得エラー:', e);
    }
  }

  // 3. アクティブな学習プランから試験情報を取得
  let examDate: Date | undefined = overrides.examDate;
  let examName: string | undefined = overrides.examName;

  if (!examDate) {
    try {
      const activePlans = await studyPlanService.getActivePlans();
      // 最も直近の試験日のプランを選択
      const nearestPlan = activePlans
        .filter((p: StudyPlan) => new Date(p.examDate) > new Date())
        .sort(
          (a: StudyPlan, b: StudyPlan) =>
            new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
        )[0];

      if (nearestPlan) {
        examDate = new Date(nearestPlan.examDate);
        examName = nearestPlan.examName ?? nearestPlan.name;

        // プランのカテゴリーを使用（弱点検出で取れなかった場合）
        if (autoCategories.length === 0 && nearestPlan.targetCategories.length > 0) {
          autoCategories = nearestPlan.targetCategories;
        }
      }
    } catch (e) {
      console.warn('[PromptTemplateEngine] プラン取得エラー:', e);
    }
  }

  // 4. デフォルトカテゴリー: DBから上位3つのカテゴリーを自動取得
  if (autoCategories.length === 0) {
    try {
      const allProblems = await problemService.getAll();
      const categoryCount = new Map<string, number>();
      for (const p of allProblems) {
        if (p.category) {
          categoryCount.set(p.category, (categoryCount.get(p.category) ?? 0) + 1);
        }
      }
      autoCategories = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);
    } catch (e) {
      console.warn('[PromptTemplateEngine] カテゴリー取得エラー:', e);
    }
  }

  // 5. パラメータをマージしてプロンプト生成
  return buildPrompt({
    ...overrides,
    categories: autoCategories,
    weaknessTags,
    currentLevel,
    examDate,
    examName,
    difficulty: overrides.difficulty ?? 'auto',
  });
}
