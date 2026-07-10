/**
 * SubtopicPromptGenerator - AI分析プロンプト生成
 *
 * 問題データからAI(Claude/GPT等)に分析を依頼するための
 * プロンプトを生成する。ユーザーはこのプロンプトをAIに貼り付け、
 * 返ってきたJSON結果をパースしてセッションに登録する。
 */

import type { Problem } from '../types/index';
import type { AnalysisSession, AnalysisSessionProblem, BatchParsedAIResponse } from '../types/subtopicAnalysis';

// ============================================================
// プロンプト生成
// ============================================================

/**
 * 問題リストからAI分析プロンプトを生成
 */
export function generateAnalysisPrompt(
  problems: Problem[],
  examName: string,
  category: string,
  lang: 'ja' | 'en' = 'ja'
): string {
  const problemTexts = problems.map((p, i) => {
    let text = `問題${i + 1}: ${p.question}`;
    if (p.options && p.options.length > 0) {
      text += '\n' + p.options.map((opt, j) => `  ${String.fromCharCode(65 + j)}. ${opt}`).join('\n');
    }
    return text;
  }).join('\n\n');

  if (lang === 'ja') {
    return `以下は「${examName}」の「${category}」に関する問題です。
各問題のサブトピック（小分類）を分析し、JSON形式で返してください。

【出力形式】
\`\`\`json
{
  "distribution": {
    "サブトピック名1": 出現回数,
    "サブトピック名2": 出現回数
  },
  "problems": [
    {
      "questionNumber": 1,
      "subtopic": "サブトピック名",
      "questionText": "問題文（最初の50文字程度）"
    }
  ],
  "totalProblems": ${problems.length}
}
\`\`\`

【ルール】
- サブトピック名は簡潔で一貫性のある名前にしてください
- 同じ内容は同じサブトピック名に統一してください
- 5〜15程度のサブトピックに分類してください

【問題データ】
${problemTexts}`;
  }

  return `Below are problems from "${examName}" in the "${category}" section.
Analyze each problem's subtopic (sub-classification) and return in JSON format.

【Output Format】
\`\`\`json
{
  "distribution": {
    "subtopic_name_1": occurrence_count,
    "subtopic_name_2": occurrence_count
  },
  "problems": [
    {
      "questionNumber": 1,
      "subtopic": "subtopic_name",
      "questionText": "question text (first ~50 chars)"
    }
  ],
  "totalProblems": ${problems.length}
}
\`\`\`

【Rules】
- Use concise, consistent subtopic names
- Unify same content under the same subtopic name
- Classify into approximately 5-15 subtopics

【Problem Data】
${problemTexts}`;
}

// ============================================================
// AIレスポンスのパース
// ============================================================

export interface ParsedAIResponse {
  distribution: Record<string, number>;
  problems: AnalysisSessionProblem[];
  totalProblems: number;
}

/**
 * AI応答テキストからJSONをパースする
 *
 * ```json ... ``` ブロック内のJSONを抽出し、
 * AnalysisSession用のデータに変換する。
 */
export function parseAIResponse(responseText: string): ParsedAIResponse {
  // JSONブロックを抽出
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('JSONのパースに失敗しました。AI応答をコピー&ペーストしてください。');
  }

  // バリデーション
  if (!parsed.distribution || typeof parsed.distribution !== 'object') {
    throw new Error('distribution フィールドが見つかりません');
  }

  const distribution: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed.distribution)) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error(`distribution["${key}"] の値が不正です: ${value}`);
    }
    distribution[key] = value;
  }

  const problems: AnalysisSessionProblem[] = [];
  if (Array.isArray(parsed.problems)) {
    for (const p of parsed.problems) {
      problems.push({
        questionText: String(p.questionText || ''),
        subtopic: String(p.subtopic || '不明'),
        questionNumber: typeof p.questionNumber === 'number' ? p.questionNumber : undefined,
      });
    }
  }

  const totalProblems = typeof parsed.totalProblems === 'number'
    ? parsed.totalProblems
    : Object.values(distribution).reduce((a: number, b) => a + (b as number), 0);

  return { distribution, problems, totalProblems };
}

/**
 * パース結果からAnalysisSessionを作成
 */
export function createSessionFromParsed(
  parsed: ParsedAIResponse,
  sessionName: string,
  sourceType: AnalysisSession['sourceType'] = 'past-exam',
  sourceYear?: number
): AnalysisSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sessionName,
    sourceType,
    sourceYear,
    distribution: parsed.distribution,
    totalProblems: parsed.totalProblems,
    analyzedAt: new Date(),
    problemTexts: parsed.problems.length > 0 ? parsed.problems : undefined,
  };
}

/**
 * 問題データベースから直接セッションを作成する
 * (AIを使わず、Problem.subtopic フィールドが既にある場合)
 */
export function createSessionFromProblems(
  problems: Problem[],
  sessionName: string,
  sourceType: AnalysisSession['sourceType'] = 'question-bank'
): AnalysisSession | null {
  const withSubtopic = problems.filter((p) => p.subtopic);
  if (withSubtopic.length === 0) return null;

  const distribution: Record<string, number> = {};
  const problemTexts: AnalysisSessionProblem[] = [];

  for (const p of withSubtopic) {
    const st = p.subtopic!;
    distribution[st] = (distribution[st] || 0) + 1;
    problemTexts.push({
      questionText: p.question,
      subtopic: st,
      answer: p.answer !== undefined ? String(p.answer) : undefined,
      year: p.sourceExamYear,
    });
  }

  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sessionName,
    sourceType,
    distribution,
    totalProblems: withSubtopic.length,
    analyzedAt: new Date(),
    problemTexts,
  };
}

// ============================================================
// バッチ分析（複数年度一括）
// ============================================================

/**
 * 複数年度の問題からバッチ分析プロンプトを生成
 */
export function generateBatchAnalysisPrompt(
  problemsByYear: Map<number, Problem[]>,
  examName: string,
  category: string,
  lang: 'ja' | 'en' = 'ja'
): string {
  const yearArray = Array.from(problemsByYear.keys()).sort((a, b) => a - b);
  const totalCount = Array.from(problemsByYear.values())
    .reduce((sum, probs) => sum + probs.length, 0);

  let problemSections = '';
  const yearCounts: string[] = [];

  for (const year of yearArray) {
    const probs = problemsByYear.get(year)!;
    yearCounts.push(lang === 'ja' ? `第${year}回(${probs.length}問)` : `#${year}(${probs.length})`);
    problemSections += `\n=== ${lang === 'ja' ? `第${year}回` : `Year ${year}`} (${probs.length}${lang === 'ja' ? '問' : ' problems'}) ===\n`;
    probs.forEach((p, i) => {
      let text = `${lang === 'ja' ? '問題' : 'Q'}${i + 1}: ${p.question}`;
      if (p.options && p.options.length > 0) {
        text += '\n' + p.options.map((opt, j) => `  ${String.fromCharCode(65 + j)}. ${opt}`).join('\n');
      }
      problemSections += text + '\n\n';
    });
  }

  const yearKeys = yearArray.map(y => `"${y}"`).join(', ');

  if (lang === 'ja') {
    return `以下は「${examName}」の「${category}」に関する複数年度の問題です。
各問題のサブトピック（小分類）を分析し、**年度別の分布も含めて**JSON形式で返してください。

【検出された年度】
${yearCounts.join(' / ')}
合計: ${totalCount}問

【出力形式】
\`\`\`json
{
  "distribution": {
    "サブトピック名1": 全年度合計の出現回数,
    "サブトピック名2": 全年度合計の出現回数
  },
  "yearDistribution": {
    ${yearKeys.split(', ').map(k => `${k}: { "サブトピック名1": 出現回数 }`).join(',\n    ')}
  },
  "problems": [
    {
      "questionNumber": 1,
      "year": ${yearArray[0]},
      "subtopic": "サブトピック名",
      "questionText": "問題文（最初の50文字程度）"
    }
  ],
  "totalProblems": ${totalCount}
}
\`\`\`

【ルール】
- サブトピック名は簡潔で一貫性のある名前にしてください
- 同じ内容は**年度をまたいで**同じサブトピック名に統一してください
- yearDistributionのキーは年度番号（${yearKeys}）です
- 5〜15程度のサブトピックに分類してください

【問題データ】
${problemSections}`;
  }

  return `Below are problems from "${examName}" in "${category}" across multiple years.
Analyze each problem's subtopic and return in JSON format **with per-year distribution**.

【Detected Years】
${yearCounts.join(' / ')}
Total: ${totalCount} problems

【Output Format】
\`\`\`json
{
  "distribution": {
    "subtopic_name": total_count_across_all_years
  },
  "yearDistribution": {
    ${yearKeys.split(', ').map(k => `${k}: { "subtopic_name": count }`).join(',\n    ')}
  },
  "problems": [
    {
      "questionNumber": 1,
      "year": ${yearArray[0]},
      "subtopic": "subtopic_name",
      "questionText": "first ~50 chars"
    }
  ],
  "totalProblems": ${totalCount}
}
\`\`\`

【Rules】
- Use concise, consistent subtopic names
- Unify same content across years under the same subtopic name
- yearDistribution keys are year numbers (${yearKeys})
- Classify into 5-15 subtopics

【Problem Data】
${problemSections}`;
}

/**
 * バッチ分析のAI応答をパース
 */
export function parseBatchAIResponse(responseText: string): BatchParsedAIResponse {
  const base = parseAIResponse(responseText);

  // yearDistributionを追加パース
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

  let yearDistribution: Record<string, Record<string, number>> | undefined;
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed.yearDistribution && typeof parsed.yearDistribution === 'object') {
      yearDistribution = {};
      for (const [year, dist] of Object.entries(parsed.yearDistribution)) {
        if (typeof dist === 'object' && dist !== null) {
          yearDistribution[year] = dist as Record<string, number>;
        }
      }
      if (Object.keys(yearDistribution).length === 0) {
        yearDistribution = undefined;
      }
    }
  } catch {
    // base parseAIResponse already validated JSON, this shouldn't fail
  }

  return {
    ...base,
    yearDistribution,
  };
}

/**
 * バッチ分析結果から年度別セッションを生成
 */
export function createBatchSessions(
  parsed: BatchParsedAIResponse,
  sessionNameBase: string,
  sourceType: AnalysisSession['sourceType'] = 'past-exam'
): AnalysisSession[] {
  if (!parsed.yearDistribution) {
    // yearDistributionがない場合は1つのセッションとして返す
    return [createSessionFromParsed(parsed, sessionNameBase, sourceType)];
  }

  return Object.entries(parsed.yearDistribution).map(([yearStr, distribution]) => {
    const year = parseInt(yearStr, 10);
    const yearProblems = (parsed.problems || []).filter(p => p.year === year);
    const totalProblems = Object.values(distribution).reduce((a, b) => a + b, 0);

    return {
      id: `session_${Date.now()}_${year}_${Math.random().toString(36).slice(2, 8)}`,
      sessionName: `${sessionNameBase} - 第${year}回`,
      sourceType,
      sourceYear: year,
      distribution,
      totalProblems,
      analyzedAt: new Date(),
      problemTexts: yearProblems.length > 0 ? yearProblems : undefined,
    };
  });
}
