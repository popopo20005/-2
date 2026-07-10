/**
 * AI Problem Generator - AI駆動問題生成エンジン
 *
 * Gemini APIを使用し、カテゴリー・難易度・参考資料ベースで
 * 問題を自動生成します。キャッシュ戦略とバリデーションを含む。
 *
 * 生成フロー:
 * 1. クォータチェック（月間制限）
 * 2. キャッシュチェック（同リクエストの再利用）
 * 3. プロンプト構築（トークン最適化）
 * 4. Gemini API呼び出し
 * 5. レスポンスのJSONパース
 * 6. 品質バリデーション
 * 7. キャッシュ保存・使用量記録
 */

import { geminiService } from './geminiService';
import { db } from '../lib/database';
import type { Problem } from '../types';

// ============================================================
// 型定義
// ============================================================

export type ProblemDifficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type ProblemFormat = 'multiple-choice' | 'true-false';

export interface AIGenerateRequest {
  category: string;
  difficulty: ProblemDifficulty;
  count: number;
  format?: ProblemFormat;
  basedOn?: string; // 参考資料テキスト
  skipCache?: boolean; // trueの場合、キャッシュを使わず新規生成
}

interface GeneratedProblem {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// ============================================================
// 使用量追跡
// ============================================================

const USAGE_KEY = 'minguella_ai_usage';

interface UsageRecord {
  year: number;
  month: number;
  totalProblems: number;
}

function getMonthlyUsage(): number {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return 0;

    const records: UsageRecord[] = JSON.parse(raw);
    const now = new Date();
    const current = records.find(
      (r) => r.year === now.getFullYear() && r.month === now.getMonth()
    );
    return current?.totalProblems || 0;
  } catch {
    return 0;
  }
}

function recordUsage(count: number): void {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    const records: UsageRecord[] = raw ? JSON.parse(raw) : [];
    const now = new Date();

    let current = records.find(
      (r) => r.year === now.getFullYear() && r.month === now.getMonth()
    );

    if (!current) {
      current = { year: now.getFullYear(), month: now.getMonth(), totalProblems: 0 };
      records.push(current);
    }

    current.totalProblems += count;

    // 過去6ヶ月分のみ保持
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const filtered = records.filter(
      (r) => new Date(r.year, r.month, 1) >= sixMonthsAgo
    );

    localStorage.setItem(USAGE_KEY, JSON.stringify(filtered));
  } catch {
    // 失敗は無視
  }
}

// ============================================================
// 履歴管理
// ============================================================

const HISTORY_KEY = 'minguella_ai_history';
const MAX_HISTORY_ITEMS = 50; // 最大50件の履歴を保持

export interface GenerationHistory {
  id: string;
  category: string;
  difficulty: ProblemDifficulty;
  count: number;
  problems: Problem[];
  generatedAt: number;
}

function saveToHistory(request: AIGenerateRequest, problems: Problem[]): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: GenerationHistory[] = raw ? JSON.parse(raw) : [];

    const newEntry: GenerationHistory = {
      id: `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      category: request.category,
      difficulty: request.difficulty,
      count: problems.length,
      problems,
      generatedAt: Date.now(),
    };

    // 新しい履歴を先頭に追加
    history.unshift(newEntry);

    // 最大件数を超えたら古いものを削除
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('履歴保存エラー:', error);
  }
}

export function getHistory(): GenerationHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('履歴クリアエラー:', error);
  }
}

// ============================================================
// 難易度説明
// ============================================================

const DIFFICULTY_DESCRIPTIONS: Record<ProblemDifficulty, string> = {
  easy: '初級（基本用語の定義、単純な事実の確認）',
  normal: '標準（概念の理解、基本的な応用、一般的なケース）',
  hard: '上級（複合的な推論、複数知識の統合、応用力が必要）',
  expert: '超上級（極めて難解、エッジケース、専門的な臨床判断、高度な分析力が必要）',
};

const DIFFICULTY_INSTRUCTIONS: Record<ProblemDifficulty, string> = {
  easy: `
【初級問題の特徴】
- 基本用語の定義や単純な事実を問う
- 教科書の太字部分レベルの知識
- 選択肢は明確に区別できる
例：「インスリンを分泌する臓器はどれか？」`,
  normal: `
【標準問題の特徴】
- 概念の理解や基本的な応用を問う
- 一般的な臨床ケースや標準的な状況
- ある程度の思考が必要だが、基本知識で解ける
例：「2型糖尿病の初期治療として最も適切なものはどれか？」`,
  hard: `
【上級問題の特徴】
- 複数の知識を統合して考える必要がある
- 複雑なケーススタディや鑑別診断
- 誤答選択肢も一見正しく見える
例：「糖尿病ケトアシドーシスと高浸透圧高血糖状態の鑑別で最も有用な検査はどれか？」`,
  expert: `
【超上級問題の特徴】
- 極めて難解で専門的な知識が必要
- 稀なケースやエッジケース
- 最新の研究や高度な臨床判断を要する
- 専門医レベルの思考が必要
例：「SGLT2阻害薬投与中の患者が正常血糖ケトアシドーシスを発症した。最も考慮すべき誘因はどれか？」`,
};

// ============================================================
// プロンプト構築
// ============================================================

function buildPrompt(request: AIGenerateRequest): string {
  const format = request.format || 'multiple-choice';
  const optionCount = format === 'multiple-choice' ? 4 : 2;

  // 参考資料の処理（セクション別に切り詰め）
  let referenceSection = '';
  if (request.basedOn) {
    const maxChars = 80000; // Gemini 2.5 Flash 1Mトークン対応、80K文字≈20Kトークン
    let text = request.basedOn;

    if (text.length > maxChars) {
      // セクション区切り（---、改行2つ以上）を尊重して切り詰め
      const cutPoint = text.lastIndexOf('\n', maxChars);
      text = text.slice(0, cutPoint > maxChars * 0.8 ? cutPoint : maxChars);
      console.warn(`[AI] 参考資料を${text.length}文字に切り詰め（元: ${request.basedOn.length}文字）`);
    }

    console.log('[AI] 参考資料:', { total: request.basedOn.length, used: text.length });

    referenceSection = `
## 参考資料
以下の資料の内容に**基づいて**問題を作成してください。
資料に含まれる事実・概念・用語を正確に反映し、資料にない情報で問題を作らないでください。

<reference>
${text}
</reference>
`;
  }

  const prompt = `# 役割
あなたは「${request.category}」分野の試験問題を作成する専門家です。
正確で教育効果の高い問題を生成してください。

# 生成条件
- カテゴリー: ${request.category}
- 難易度: ${DIFFICULTY_DESCRIPTIONS[request.difficulty]}
- 問題数: ${request.count}問
- 形式: ${format === 'multiple-choice' ? `${optionCount}肢選択（正解は1つのみ）` : '○/×判定'}

# 難易度の詳細ガイドライン
${DIFFICULTY_INSTRUCTIONS[request.difficulty]}
${referenceSection}
# 問題作成ルール
1. **正確性**: 事実に基づいた問題のみ作成する。曖昧・不正確な選択肢は避ける
2. **難易度遵守**: 指定された難易度に厳密に従う。特に「初級」で応用問題を出さない、「上級」で基本問題を出さないこと
3. **誤答選択肢の質**: 誤答は「もっともらしいが明確に間違い」であること。正解と全く関係のない選択肢は避ける
4. **正解の分散**: correctAnswerの値（0〜${optionCount - 1}）が偏らないようランダムに配置する
5. **解説の充実**: なぜその答えが正解なのか、なぜ他が不正解なのかを簡潔に説明する（150〜250字）
6. **問題の独立性**: 各問題は独立して解答可能であること

# 出力形式
以下のJSONのみを出力してください。\`\`\`マーカーや説明文は一切不要です。

{"problems":[{"question":"問題文をここに書く","options":["選択肢A","選択肢B"${format === 'multiple-choice' ? ',"選択肢C","選択肢D"' : ''}],"correctAnswer":0,"explanation":"解説文をここに書く"}]}

# JSON出力の注意
- 純粋なJSONのみ出力（前後に余計なテキストを含めない）
- 文字列はダブルクォート(")で囲む
- 日本語の引用符「」『』は使用しない（代わりに""を使用）
- 改行は\\nでエスケープ
- correctAnswerは0始まりの整数（0〜${optionCount - 1}）
- 全て日本語で出力`;

  return prompt;
}

// ============================================================
// レスポンス解析
// ============================================================

function parseResponse(response: string): GeneratedProblem[] {
  let jsonStr = response.trim();

  console.log('[AI] レスポンス長:', response.length, '文字');

  // Step 1: ```json ... ``` ブロックを抽出
  const jsonBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  // Step 2: 最外部の { ... } を非貪欲に抽出（ネスト対応）
  const jsonMatch = extractOutermostJson(jsonStr);
  if (!jsonMatch) {
    // フォールバック: problems配列だけでも取れるか試す
    const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      jsonStr = `{"problems":${arrayMatch[0]}}`;
    } else {
      console.error('[AI] JSON抽出失敗。レスポンス先頭:', jsonStr.slice(0, 300));
      throw new Error('AIの応答からJSON形式のデータを抽出できませんでした。再度お試しください');
    }
  } else {
    jsonStr = jsonMatch;
  }

  console.log('[AI] 抽出したJSON長:', jsonStr.length, '文字');

  // Step 3: JSONクリーニング
  let cleanedJson = jsonStr
    // BOM削除
    .replace(/^\uFEFF/, '')
    // 制御文字を削除（改行、タブ、スペース以外）
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 日本語引用符をエスケープ済みダブルクォートに変換（文字列値内）
    .replace(/「/g, '"').replace(/」/g, '"')
    .replace(/『/g, '"').replace(/』/g, '"')
    // 末尾カンマの除去（JSON仕様外）
    .replace(/,\s*([}\]])/g, '$1');

  // Step 4: パース（リトライ付き）
  let parsed;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (firstError: any) {
    console.warn('[AI] 1回目のパース失敗:', firstError.message);

    // リトライ: エラー位置の特殊文字を修復
    try {
      const posMatch = firstError.message.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        // エラー位置周辺の不正文字を削除
        cleanedJson = cleanedJson.slice(0, Math.max(0, pos - 5)) +
          cleanedJson.slice(pos - 5, pos + 5).replace(/[^\x20-\x7E\u3000-\u9FFF\uF900-\uFAFF]/g, '') +
          cleanedJson.slice(pos + 5);
      }
      // 不正なエスケープを修復
      cleanedJson = cleanedJson.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      parsed = JSON.parse(cleanedJson);
    } catch (secondError: any) {
      console.error('[AI] JSONパース最終失敗:', secondError.message);
      console.error('[AI] JSON先頭300文字:', cleanedJson.slice(0, 300));
      throw new Error('AIの応答のJSON解析に失敗しました。再度お試しください');
    }
  }

  // Step 5: problems配列の検証
  const problems = parsed.problems ?? parsed.Problems ?? parsed.PROBLEMS;
  if (!problems || !Array.isArray(problems)) {
    // トップレベルが配列の場合
    if (Array.isArray(parsed)) {
      return parsed as GeneratedProblem[];
    }
    throw new Error('AIの応答に問題データ(problems)が含まれていません');
  }

  if (problems.length === 0) {
    throw new Error('AIが問題を生成できませんでした。条件を変更して再度お試しください');
  }

  return problems as GeneratedProblem[];
}

/** ネスト対応のJSON抽出（ブレース対応） */
function extractOutermostJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }
  }

  // 閉じブレースが見つからない場合、最後の}まで取る
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace > start) {
    return text.slice(start, lastBrace + 1);
  }

  return null;
}

// ============================================================
// バリデーション
// ============================================================

function validateProblems(problems: GeneratedProblem[], _format: ProblemFormat): GeneratedProblem[] {

  return problems.filter((p, idx) => {
    // 必須フィールドチェック
    if (!p.question || typeof p.question !== 'string') {
      console.warn(`[Problem ${idx}] 問題文が不正`);
      return false;
    }
    if (!p.options || !Array.isArray(p.options)) {
      console.warn(`[Problem ${idx}] 選択肢が不正`);
      return false;
    }
    if (!p.explanation || typeof p.explanation !== 'string') {
      console.warn(`[Problem ${idx}] 解説が不正`);
      return false;
    }

    // 選択肢数チェック
    if (p.options.length < 2 || p.options.length > 5) {
      console.warn(`[Problem ${idx}] 選択肢数が不正: ${p.options.length}`);
      return false;
    }

    // 正解インデックスチェック
    if (typeof p.correctAnswer !== 'number' || p.correctAnswer < 0 || p.correctAnswer >= p.options.length) {
      console.warn(`[Problem ${idx}] 正解インデックスが不正: ${p.correctAnswer}`);
      return false;
    }

    // 問題文長チェック
    if (p.question.length < 5 || p.question.length > 1000) {
      console.warn(`[Problem ${idx}] 問題文の長さが不正: ${p.question.length}`);
      return false;
    }

    // 選択肢の重複チェック
    const uniqueOptions = new Set(p.options);
    if (uniqueOptions.size < p.options.length) {
      console.warn(`[Problem ${idx}] 選択肢に重複あり`);
      return false;
    }

    return true;
  });
}

// ============================================================
// AI問題生成クラス
// ============================================================

class AIProblemGenerator {
  /** 月間生成上限（デフォルト: 無料プラン） */
  private static readonly FREE_MONTHLY_LIMIT = 20;

  /** 動的に設定可能な月間上限（-1 = 無制限） */
  private _monthlyLimit: number = AIProblemGenerator.FREE_MONTHLY_LIMIT;

  /** サブスクリプションプランに基づく上限を設定 */
  setMonthlyLimit(limit: number): void {
    this._monthlyLimit = limit;
  }

  /** 現在の上限を取得 */
  getMonthlyLimit(): number {
    return this._monthlyLimit;
  }

  /**
   * 問題を生成する
   *
   * @param request - 生成リクエスト
   * @returns 生成された問題の配列
   * @throws クォータ超過・API・パースエラー時
   */
  async generateProblems(request: AIGenerateRequest): Promise<Problem[]> {
    // Gemini APIの設定確認
    if (!geminiService.isConfigured()) {
      throw new Error(
        'Firebase設定が見つかりません。ログインしてからAI問題生成をお試しください'
      );
    }

    // クォータチェック
    this.checkQuota(request.count);

    const format = request.format || 'multiple-choice';

    // キャッシュは使用しない（常に新規生成）
    console.log('🔄 [AI] 新規問題を生成します');
    console.log('難易度:', request.difficulty, 'カテゴリー:', request.category, '問題数:', request.count);

    // プロンプト構築
    const prompt = buildPrompt(request);

    // デバッグ: プロンプトの難易度部分を出力
    console.log('[AI] 難易度:', request.difficulty);
    console.log('[AI] プロンプト（先頭500文字）:', prompt.slice(0, 500));

    // API呼び出し
    // 参考資料がある場合はtemperatureを下げて資料に忠実な問題を生成
    const temperature = request.basedOn ? 0.3 : 0.7;
    let response: string;
    try {
      response = await geminiService.generate(prompt, {
        temperature,
        maxOutputTokens: 8192,
      });
    } catch (error) {
      throw error; // geminiService のエラーはそのまま再スロー
    }

    // レスポンス解析
    let generated: GeneratedProblem[];
    try {
      generated = parseResponse(response);
    } catch (parseError) {
      console.error('[AI] パース失敗、レスポンス:', response.slice(0, 500));
      console.error('[AI] パースエラー:', parseError);
      // レスポンス先頭を表示してデバッグ可能にする
      const preview = response.slice(0, 120).replace(/\n/g, ' ');
      throw new Error(`AI生成結果の解析に失敗しました。レスポンス: "${preview}"`);
    }

    // バリデーション
    const validated = validateProblems(generated, format);
    if (validated.length === 0) {
      throw new Error('生成された問題がすべてバリデーションを通過しませんでした');
    }

    // 使用量記録
    const actualCount = Math.min(validated.length, request.count);
    recordUsage(actualCount);

    console.log(`[AI] ${actualCount}問 生成完了（バリデーション通過率: ${validated.length}/${generated.length}）`);

    const finalProblems = this.toProblems(validated.slice(0, request.count), request.category, format);

    // 履歴に保存
    saveToHistory(request, finalProblems);
    console.log(`[AI] 履歴に保存しました（${finalProblems.length}問）`);

    return finalProblems;
  }

  /**
   * クォータチェック
   */
  private checkQuota(count: number): void {
    // 無制限プランの場合はスキップ
    if (this._monthlyLimit === -1) return;

    const usage = getMonthlyUsage();
    const remaining = this._monthlyLimit - usage;

    if (remaining <= 0) {
      throw new Error(
        `月間生成上限(${this._monthlyLimit}問)に達しています。` +
        `プランをアップグレードすると上限が増えます`
      );
    }

    if (count > remaining) {
      throw new Error(
        `要求された${count}問は残り${remaining}問の上限を超えます。` +
        `${remaining}問以下で再試してください`
      );
    }
  }

  /**
   * GeneratedProblem[] → Problem[] に変換
   */
  private toProblems(generated: GeneratedProblem[], category: string, format: ProblemFormat): Problem[] {
    return generated.map((g) => ({
      category,
      question: g.question,
      type: format as 'multiple-choice' | 'true-false',
      options: g.options,
      correctAnswer: g.correctAnswer,
      explanation: g.explanation,
      // true-false の場合は answer フィールドも設定
      answer: format === 'true-false' ? g.correctAnswer === 0 : undefined,
    }));
  }

  /**
   * 生成した問題をDBに保存する
   *
   * @param problems - 保存する問題の配列
   * @returns 保存された問題IDの配列
   */
  async saveProblems(problems: Problem[]): Promise<number[]> {
    const ids: number[] = [];
    for (const problem of problems) {
      const id = await db.problems.add(problem);
      ids.push(id as number);
    }
    return ids;
  }

  /**
   * 現在の月間使用量と上限を取得
   */
  getUsageInfo(): { used: number; limit: number; remaining: number } {
    const used = getMonthlyUsage();
    if (this._monthlyLimit === -1) {
      return { used, limit: -1, remaining: Infinity };
    }
    return {
      used,
      limit: this._monthlyLimit,
      remaining: Math.max(0, this._monthlyLimit - used),
    };
  }
}

export const aiProblemGenerator = new AIProblemGenerator();
