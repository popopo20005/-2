/**
 * 学習メモサービス
 *
 * 問題に対するユーザーのメモを管理
 * - Markdown形式のメモ
 * - 全文検索（Fuse.js）
 * - メモのエクスポート/インポート
 */

import { db } from '../lib/database';
import Fuse from 'fuse.js';
import type { Problem, NotebookTemplateType, NotebookTemplate } from '../types';

/**
 * メモ付き問題の型
 */
export interface ProblemWithNote extends Problem {
  userNotes: string; // 必須にする（メモ付きなので）
}

/**
 * メモ検索結果
 */
export interface NoteSearchResult {
  problem: ProblemWithNote;
  score: number;
  matches: Array<{
    key: string;
    value: string;
    indices: [number, number][];
  }>;
}

/**
 * メモ統計
 */
export interface NoteStatistics {
  totalNotes: number;
  totalProblems: number;
  notesPercentage: number;
  averageNoteLength: number;
  recentlyUpdated: ProblemWithNote[];
  topTags: Array<{ tag: string; count: number }>;
}

/**
 * エクスポート形式
 */
export type ExportFormat = 'json' | 'markdown' | 'csv';

/**
 * 問題にメモを追加・更新
 */
export async function saveNote(
  problemId: number,
  noteText: string,
  tags?: string[]
): Promise<void> {
  try {
    console.log(`[NoteService] メモを保存中: 問題ID ${problemId}`);

    const problem = await db.problems.get(problemId);

    if (!problem) {
      throw new Error(`問題ID ${problemId} が見つかりません`);
    }

    await db.problems.update(problemId, {
      userNotes: noteText,
      noteUpdatedAt: new Date(),
      noteTags: tags || [],
    });

    console.log(`[NoteService] メモを保存しました`);
  } catch (error) {
    console.error('[NoteService] メモの保存に失敗:', error);
    throw error;
  }
}

/**
 * 問題のメモを取得
 */
export async function getNote(problemId: number): Promise<string | undefined> {
  try {
    const problem = await db.problems.get(problemId);
    return problem?.userNotes;
  } catch (error) {
    console.error('[NoteService] メモの取得に失敗:', error);
    return undefined;
  }
}

/**
 * 問題のメモを削除
 */
export async function deleteNote(problemId: number): Promise<void> {
  try {
    console.log(`[NoteService] メモを削除中: 問題ID ${problemId}`);

    await db.problems.update(problemId, {
      userNotes: undefined,
      noteUpdatedAt: undefined,
      noteTags: undefined,
    });

    console.log(`[NoteService] メモを削除しました`);
  } catch (error) {
    console.error('[NoteService] メモの削除に失敗:', error);
    throw error;
  }
}

/**
 * メモがある問題を全て取得
 */
export async function getAllProblemsWithNotes(): Promise<ProblemWithNote[]> {
  try {
    const allProblems = await db.problems.toArray();
    const problemsWithNotes = allProblems.filter(
      (p) => p.userNotes && p.userNotes.trim().length > 0
    ) as ProblemWithNote[];

    // 更新日時でソート（新しい順）
    problemsWithNotes.sort((a, b) => {
      const dateA = a.noteUpdatedAt?.getTime() || 0;
      const dateB = b.noteUpdatedAt?.getTime() || 0;
      return dateB - dateA;
    });

    return problemsWithNotes;
  } catch (error) {
    console.error('[NoteService] メモ付き問題の取得に失敗:', error);
    return [];
  }
}

/**
 * メモを全文検索
 */
export async function searchNotes(query: string): Promise<NoteSearchResult[]> {
  try {
    console.log(`[NoteService] メモを検索中: "${query}"`);

    if (!query || query.trim().length === 0) {
      return [];
    }

    const problemsWithNotes = await getAllProblemsWithNotes();

    // Fuse.jsで全文検索
    const fuse = new Fuse(problemsWithNotes, {
      keys: [
        { name: 'question', weight: 0.3 },
        { name: 'userNotes', weight: 0.5 },
        { name: 'category', weight: 0.1 },
        { name: 'noteTags', weight: 0.1 },
      ],
      includeScore: true,
      includeMatches: true,
      threshold: 0.4, // 0.0 = 完全一致、1.0 = 何でもマッチ
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    const results = fuse.search(query);

    const searchResults: NoteSearchResult[] = results.map((result) => ({
      problem: result.item,
      score: result.score || 0,
      matches: (result.matches || []).map((match) => ({
        key: match.key || '',
        value: match.value || '',
        indices: (match.indices || []).map(([start, end]) => [start, end] as [number, number]),
      })),
    }));

    console.log(`[NoteService] ${searchResults.length}件の検索結果`);

    return searchResults;
  } catch (error) {
    console.error('[NoteService] メモの検索に失敗:', error);
    return [];
  }
}

/**
 * タグで問題を検索
 */
export async function searchByTag(tag: string): Promise<ProblemWithNote[]> {
  try {
    const problemsWithNotes = await getAllProblemsWithNotes();

    return problemsWithNotes.filter((p) =>
      p.noteTags?.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
  } catch (error) {
    console.error('[NoteService] タグ検索に失敗:', error);
    return [];
  }
}

/**
 * カテゴリでメモ付き問題を取得
 */
export async function getNotesByCategory(category: string): Promise<ProblemWithNote[]> {
  try {
    const problemsWithNotes = await getAllProblemsWithNotes();

    return problemsWithNotes.filter((p) => p.category === category);
  } catch (error) {
    console.error('[NoteService] カテゴリ別メモの取得に失敗:', error);
    return [];
  }
}

/**
 * メモ統計を取得
 */
export async function getNoteStatistics(): Promise<NoteStatistics> {
  try {
    const allProblems = await db.problems.toArray();
    const problemsWithNotes = await getAllProblemsWithNotes();

    // 平均メモ長を計算
    const totalNoteLength = problemsWithNotes.reduce(
      (sum, p) => sum + (p.userNotes?.length || 0),
      0
    );
    const averageNoteLength =
      problemsWithNotes.length > 0
        ? Math.round(totalNoteLength / problemsWithNotes.length)
        : 0;

    // タグ集計
    const tagMap = new Map<string, number>();
    problemsWithNotes.forEach((p) => {
      p.noteTags?.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    const topTags = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 最近更新されたメモ（上位5件）
    const recentlyUpdated = problemsWithNotes.slice(0, 5);

    return {
      totalNotes: problemsWithNotes.length,
      totalProblems: allProblems.length,
      notesPercentage:
        allProblems.length > 0
          ? Math.round((problemsWithNotes.length / allProblems.length) * 100)
          : 0,
      averageNoteLength,
      recentlyUpdated,
      topTags,
    };
  } catch (error) {
    console.error('[NoteService] メモ統計の取得に失敗:', error);
    return {
      totalNotes: 0,
      totalProblems: 0,
      notesPercentage: 0,
      averageNoteLength: 0,
      recentlyUpdated: [],
      topTags: [],
    };
  }
}

/**
 * メモをエクスポート
 */
export async function exportNotes(format: ExportFormat = 'json'): Promise<string> {
  try {
    console.log(`[NoteService] メモを${format}形式でエクスポート中...`);

    const problemsWithNotes = await getAllProblemsWithNotes();

    switch (format) {
      case 'json':
        return exportAsJSON(problemsWithNotes);
      case 'markdown':
        return exportAsMarkdown(problemsWithNotes);
      case 'csv':
        return exportAsCSV(problemsWithNotes);
      default:
        throw new Error(`未対応のエクスポート形式: ${format}`);
    }
  } catch (error) {
    console.error('[NoteService] メモのエクスポートに失敗:', error);
    throw error;
  }
}

/**
 * JSON形式でエクスポート
 */
function exportAsJSON(problems: ProblemWithNote[]): string {
  const exportData = problems.map((p) => ({
    id: p.id,
    question: p.question,
    category: p.category,
    userNotes: p.userNotes,
    noteTags: p.noteTags,
    noteUpdatedAt: p.noteUpdatedAt?.toISOString(),
  }));

  return JSON.stringify(exportData, null, 2);
}

/**
 * Markdown形式でエクスポート
 */
function exportAsMarkdown(problems: ProblemWithNote[]): string {
  let markdown = '# 学習メモ\n\n';
  markdown += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
  markdown += `総メモ数: ${problems.length}\n\n`;
  markdown += '---\n\n';

  problems.forEach((p, index) => {
    markdown += `## ${index + 1}. ${p.question}\n\n`;
    markdown += `**カテゴリ**: ${p.category}\n\n`;

    if (p.noteTags && p.noteTags.length > 0) {
      markdown += `**タグ**: ${p.noteTags.map((t) => `\`${t}\``).join(', ')}\n\n`;
    }

    if (p.noteUpdatedAt) {
      markdown += `**更新日時**: ${p.noteUpdatedAt.toLocaleString('ja-JP')}\n\n`;
    }

    markdown += '### メモ\n\n';
    markdown += `${p.userNotes}\n\n`;
    markdown += '---\n\n';
  });

  return markdown;
}

/**
 * CSV形式でエクスポート
 */
function exportAsCSV(problems: ProblemWithNote[]): string {
  const headers = ['ID', 'カテゴリ', '問題文', 'メモ', 'タグ', '更新日時'];
  const rows = [headers];

  problems.forEach((p) => {
    const row = [
      p.id?.toString() || '',
      p.category || '',
      escapeCSV(p.question),
      escapeCSV(p.userNotes || ''),
      p.noteTags?.join(';') || '',
      p.noteUpdatedAt?.toISOString() || '',
    ];
    rows.push(row);
  });

  return rows.map((row) => row.join(',')).join('\n');
}

/**
 * CSV用の文字列エスケープ
 */
function escapeCSV(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * メモをインポート（JSON形式のみ）
 */
export async function importNotes(jsonData: string): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  try {
    console.log('[NoteService] メモをインポート中...');

    const data = JSON.parse(jsonData);

    if (!Array.isArray(data)) {
      throw new Error('無効なJSON形式です。配列である必要があります。');
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of data) {
      try {
        if (!item.id || !item.userNotes) {
          failed++;
          errors.push(`無効なデータ: ID=${item.id}`);
          continue;
        }

        const problem = await db.problems.get(item.id);

        if (!problem) {
          failed++;
          errors.push(`問題が見つかりません: ID=${item.id}`);
          continue;
        }

        await saveNote(item.id, item.userNotes, item.noteTags || []);
        success++;
      } catch (error) {
        failed++;
        errors.push(`ID ${item.id} のインポートに失敗: ${error}`);
      }
    }

    console.log(`[NoteService] インポート完了: 成功=${success}, 失敗=${failed}`);

    return { success, failed, errors };
  } catch (error) {
    console.error('[NoteService] メモのインポートに失敗:', error);
    throw error;
  }
}

/**
 * メモをファイルとしてダウンロード
 */
export function downloadNotes(format: ExportFormat = 'json'): void {
  exportNotes(format)
    .then((content) => {
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/plain',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'csv';
      link.download = `study-notes-${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      console.log(`[NoteService] メモをダウンロードしました: ${link.download}`);
    })
    .catch((error) => {
      console.error('[NoteService] メモのダウンロードに失敗:', error);
    });
}

/**
 * Markdownプレビュー用にHTMLに変換（簡易実装）
 */
export function markdownToHTML(markdown: string): string {
  let html = markdown;

  // ヘッダー
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 太字
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // イタリック
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // リンク
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // コードブロック
  html = html.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');

  // インラインコード
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // リスト
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // 改行
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  return html;
}

/**
 * 問題集のメモ付き問題数を取得
 */
export async function getQuizSetsWithNoteCount(): Promise<Array<{
  id: number;
  name: string;
  noteCount: number;
}>> {
  try {
    // まず全ての問題を取得してメモがあるものをフィルタリング
    const allProblems = await db.problems.toArray();
    const problemsWithNotes = allProblems.filter(p => p.userNotes && p.userNotes.trim().length > 0);

    console.log('[NoteService] メモがある問題数:', problemsWithNotes.length);

    if (problemsWithNotes.length === 0) {
      return [];
    }

    // メモがある問題のIDセット
    const problemIdsWithNotes = new Set(problemsWithNotes.map(p => p.id!).filter(id => id !== undefined));
    console.log('[NoteService] メモがある問題ID:', Array.from(problemIdsWithNotes));

    // 全ての問題集を取得
    const quizSets = await db.quizSets.toArray();
    console.log('[NoteService] 全問題集:', quizSets.map(q => ({ name: q.name, problemCount: q.problemIds.length })));

    // 各問題集のメモ数を計算
    const quizSetsWithCount = quizSets.map(quizSet => {
      // 問題集に含まれる問題のうち、メモがある問題の数をカウント
      const noteCount = quizSet.problemIds.filter(id => problemIdsWithNotes.has(id)).length;

      console.log(`[NoteService] 問題集「${quizSet.name}」: ${quizSet.problemIds.length}問題中 ${noteCount}メモ`);

      return {
        id: quizSet.id!,
        name: quizSet.name,
        noteCount,
      };
    });

    const result = quizSetsWithCount.filter(qs => qs.noteCount > 0);
    console.log('[NoteService] メモがある問題集:', result);

    return result;
  } catch (error) {
    console.error('[NoteService] 問題集のメモ数取得に失敗:', error);
    return [];
  }
}

/**
 * 問題集のノートブックを生成
 */
export async function generateNotebook(quizSetId: number): Promise<string> {
  try {
    console.log(`[NoteService] 問題集 ${quizSetId} のノートブックを生成中...`);

    const quizSet = await db.quizSets.get(quizSetId);
    if (!quizSet) {
      throw new Error(`問題集が見つかりません: ID=${quizSetId}`);
    }

    console.log(`[NoteService] 問題集「${quizSet.name}」の問題ID:`, quizSet.problemIds);

    // 問題集に含まれる問題を取得
    const allProblems = await db.problems.bulkGet(quizSet.problemIds);

    // undefined を除外してメモがある問題のみフィルタリング
    const quizSetProblems = allProblems
      .filter(p => p !== undefined && p.userNotes && p.userNotes.trim().length > 0) as ProblemWithNote[];

    console.log(`[NoteService] メモがある問題数: ${quizSetProblems.length}`);

    if (quizSetProblems.length === 0) {
      throw new Error('この問題集にはメモがありません');
    }

    // カテゴリ別にグループ化
    const problemsByCategory = new Map<string, ProblemWithNote[]>();
    quizSetProblems.forEach(p => {
      const category = p.category || 'その他';
      if (!problemsByCategory.has(category)) {
        problemsByCategory.set(category, []);
      }
      problemsByCategory.get(category)!.push(p);
    });

    // Markdown生成
    let markdown = '';

    // 表紙
    markdown += `# 📚 ${quizSet.name} - 学習ノートブック\n\n`;
    markdown += `---\n\n`;
    markdown += `**作成日時**: ${new Date().toLocaleString('ja-JP')}\n\n`;
    markdown += `**総メモ数**: ${quizSetProblems.length}問\n\n`;
    markdown += `**カテゴリ数**: ${problemsByCategory.size}\n\n`;
    markdown += `---\n\n`;

    // 目次
    markdown += `## 📑 目次\n\n`;
    let problemIndex = 1;
    for (const [category, problems] of problemsByCategory) {
      markdown += `### ${category} (${problems.length}問)\n\n`;
      problems.forEach(p => {
        markdown += `${problemIndex}. ${p.question.substring(0, 50)}${p.question.length > 50 ? '...' : ''}\n`;
        problemIndex++;
      });
      markdown += `\n`;
    }
    markdown += `---\n\n`;

    // 本文
    problemIndex = 1;
    for (const [category, problems] of problemsByCategory) {
      markdown += `## 📂 ${category}\n\n`;

      problems.forEach(p => {
        markdown += `### ${problemIndex}. ${p.question}\n\n`;

        // メタ情報
        markdown += `**カテゴリ**: ${p.category}\n\n`;
        if (p.noteTags && p.noteTags.length > 0) {
          markdown += `**タグ**: ${p.noteTags.map(t => `\`${t}\``).join(', ')}\n\n`;
        }
        if (p.noteUpdatedAt) {
          markdown += `**更新日時**: ${new Date(p.noteUpdatedAt).toLocaleString('ja-JP')}\n\n`;
        }

        // 問題詳細
        if (p.options && p.options.length > 0) {
          markdown += `**選択肢**:\n\n`;
          p.options.forEach((choice: string, idx: number) => {
            const marker = idx === p.correctAnswer ? '✅' : '○';
            markdown += `${marker} ${String.fromCharCode(65 + idx)}. ${choice}\n`;
          });
          markdown += `\n`;
        }

        // 解説
        if (p.explanation) {
          markdown += `**解説**: ${p.explanation}\n\n`;
        }

        // ユーザーメモ
        markdown += `#### 📝 学習メモ\n\n`;
        markdown += `${p.userNotes}\n\n`;

        markdown += `---\n\n`;
        problemIndex++;
      });
    }

    // フッター
    markdown += `\n\n*Generated by Minguella - Interactive Quiz Application*\n`;

    console.log(`[NoteService] ノートブック生成完了: ${quizSetProblems.length}問`);
    return markdown;
  } catch (error) {
    console.error('[NoteService] ノートブック生成に失敗:', error);
    throw error;
  }
}

/**
 * ノートブックをダウンロード
 */
export async function downloadNotebook(quizSetId: number): Promise<void> {
  try {
    const quizSet = await db.quizSets.get(quizSetId);
    if (!quizSet) {
      throw new Error('問題集が見つかりません');
    }

    const content = await generateNotebook(quizSetId);

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = quizSet.name.replace(/[/\\?%*:|"<>]/g, '-');
    link.download = `notebook-${sanitizedName}-${timestamp}.md`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    console.log(`[NoteService] ノートブックをダウンロードしました: ${link.download}`);
  } catch (error) {
    console.error('[NoteService] ノートブックのダウンロードに失敗:', error);
    throw error;
  }
}

/**
 * ノートブックテンプレート一覧
 */
export const NOTEBOOK_TEMPLATES: NotebookTemplate[] = [
  {
    type: 'standard',
    name: '標準版',
    emoji: '📚',
    description: '問題・解答・メモを完全網羅。復習に最適な基本形式'
  },
  {
    type: 'review',
    name: '復習特化版',
    emoji: '🔄',
    description: '重要ポイントと間違えやすい箇所を抽出。効率的な復習向け'
  },
  {
    type: 'exam',
    name: '試験対策版',
    emoji: '📝',
    description: 'カテゴリー別サマリーと頻出ポイント。試験直前に最適'
  },
  {
    type: 'flashcard',
    name: 'フラッシュカード版',
    emoji: '🗂️',
    description: '表面（問題）裏面（答え+メモ）形式。暗記学習向け'
  },
  {
    type: 'diary',
    name: '学習日記版',
    emoji: '📖',
    description: '振り返りと気づきを記録。学習の軌跡を残したい方向け'
  }
];

/**
 * テンプレートに応じたノートブックを生成
 */
export async function generateNotebookWithTemplate(
  quizSetId: number,
  templateType: NotebookTemplateType = 'standard'
): Promise<string> {
  try {
    console.log(`[NoteService] テンプレート「${templateType}」でノートブックを生成中...`);

    const quizSet = await db.quizSets.get(quizSetId);
    if (!quizSet) {
      throw new Error(`問題集が見つかりません: ID=${quizSetId}`);
    }

    // 問題集に含まれる問題を取得
    const allProblems = await db.problems.bulkGet(quizSet.problemIds);
    const quizSetProblems = allProblems
      .filter(p => p !== undefined && p.userNotes && p.userNotes.trim().length > 0) as ProblemWithNote[];

    if (quizSetProblems.length === 0) {
      throw new Error('この問題集にはメモがありません');
    }

    // テンプレートに応じた生成
    switch (templateType) {
      case 'standard':
        return generateStandardNotebook(quizSet.name, quizSetProblems);
      case 'review':
        return generateReviewNotebook(quizSet.name, quizSetProblems);
      case 'exam':
        return generateExamNotebook(quizSet.name, quizSetProblems);
      case 'flashcard':
        return generateFlashcardNotebook(quizSet.name, quizSetProblems);
      case 'diary':
        return generateDiaryNotebook(quizSet.name, quizSetProblems);
      default:
        return generateStandardNotebook(quizSet.name, quizSetProblems);
    }
  } catch (error) {
    console.error('[NoteService] ノートブック生成に失敗:', error);
    throw error;
  }
}

/**
 * 標準版ノートブック生成
 */
function generateStandardNotebook(quizSetName: string, problems: ProblemWithNote[]): string {
  const problemsByCategory = groupProblemsByCategory(problems);

  let markdown = '';
  markdown += `# 📚 ${quizSetName} - 学習ノートブック（標準版）\n\n`;
  markdown += `---\n\n`;
  markdown += `**作成日時**: ${new Date().toLocaleString('ja-JP')}\n\n`;
  markdown += `**総メモ数**: ${problems.length}問\n\n`;
  markdown += `**カテゴリ数**: ${problemsByCategory.size}\n\n`;
  markdown += `---\n\n`;

  // 目次
  markdown += `## 📑 目次\n\n`;
  let problemIndex = 1;
  for (const [category, probs] of problemsByCategory) {
    markdown += `### ${category} (${probs.length}問)\n\n`;
    probs.forEach(p => {
      markdown += `${problemIndex}. ${p.question.substring(0, 50)}${p.question.length > 50 ? '...' : ''}\n`;
      problemIndex++;
    });
    markdown += `\n`;
  }
  markdown += `---\n\n`;

  // 本文
  problemIndex = 1;
  for (const [category, probs] of problemsByCategory) {
    markdown += `## ${category}\n\n`;
    probs.forEach(p => {
      markdown += `### 問題 ${problemIndex}: ${p.question}\n\n`;

      if (p.type === 'multiple-choice' && p.options && p.options.length > 0) {
        markdown += `**選択肢:**\n\n`;
        p.options.forEach((choice: string, idx: number) => {
          const isCorrect = idx === p.correctAnswer;
          markdown += `${idx + 1}. ${choice} ${isCorrect ? '✅' : ''}\n`;
        });
        markdown += `\n`;
      } else if (p.type === 'true-false') {
        markdown += `**正解**: ${p.answer ? '⭕ 正しい' : '❌ 誤り'}\n\n`;
      }

      if (p.explanation) {
        markdown += `**解説:**\n\n${p.explanation}\n\n`;
      }

      markdown += `**📝 学習メモ:**\n\n${p.userNotes}\n\n`;
      markdown += `---\n\n`;
      problemIndex++;
    });
  }

  return markdown;
}

/**
 * 復習特化版ノートブック生成
 */
function generateReviewNotebook(quizSetName: string, problems: ProblemWithNote[]): string {
  let markdown = '';
  markdown += `# 🔄 ${quizSetName} - 復習特化版ノート\n\n`;
  markdown += `**作成日時**: ${new Date().toLocaleString('ja-JP')}\n\n`;
  markdown += `**重要ポイント抽出**: ${problems.length}問\n\n`;
  markdown += `---\n\n`;

  markdown += `## ⚠️ 間違えやすいポイント\n\n`;
  problems.forEach((p, idx) => {
    markdown += `### ${idx + 1}. ${p.question.substring(0, 80)}${p.question.length > 80 ? '...' : ''}\n\n`;
    markdown += `**カテゴリー**: ${p.category}\n\n`;
    markdown += `**重要メモ:**\n\n`;
    markdown += `${p.userNotes}\n\n`;

    if (p.explanation) {
      markdown += `<details>\n<summary>💡 解説を表示</summary>\n\n${p.explanation}\n\n</details>\n\n`;
    }
    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * 試験対策版ノートブック生成
 */
function generateExamNotebook(quizSetName: string, problems: ProblemWithNote[]): string {
  const problemsByCategory = groupProblemsByCategory(problems);

  let markdown = '';
  markdown += `# 📝 ${quizSetName} - 試験対策ノート\n\n`;
  markdown += `**作成日時**: ${new Date().toLocaleString('ja-JP')}\n\n`;
  markdown += `---\n\n`;

  markdown += `## 📊 カテゴリー別サマリー\n\n`;
  for (const [category, probs] of problemsByCategory) {
    markdown += `### ${category} (${probs.length}問)\n\n`;
    markdown += `**頻出ポイント:**\n\n`;
    probs.forEach((p, idx) => {
      markdown += `${idx + 1}. ${p.question.substring(0, 60)}${p.question.length > 60 ? '...' : ''}\n`;
      const firstLine = p.userNotes.split('\n')[0];
      markdown += `   - ${firstLine.substring(0, 100)}\n`;
    });
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  markdown += `## 📌 詳細ノート\n\n`;

  for (const [category, probs] of problemsByCategory) {
    markdown += `### ${category}\n\n`;
    probs.forEach((p, idx) => {
      markdown += `#### ${idx + 1}. ${p.question}\n\n`;
      markdown += `${p.userNotes}\n\n`;
    });
  }

  return markdown;
}

/**
 * フラッシュカード版ノートブック生成
 */
function generateFlashcardNotebook(quizSetName: string, problems: ProblemWithNote[]): string {
  let markdown = '';
  markdown += `# 🗂️ ${quizSetName} - フラッシュカード\n\n`;
  markdown += `**カード総数**: ${problems.length}枚\n\n`;
  markdown += `---\n\n`;

  problems.forEach((p, idx) => {
    markdown += `## カード ${idx + 1}\n\n`;
    markdown += `### 表面（Question）\n\n`;
    markdown += `\`\`\`\n${p.question}\n\`\`\`\n\n`;
    markdown += `---\n\n`;
    markdown += `### 裏面（Answer + Notes）\n\n`;

    if (p.type === 'multiple-choice' && p.correctAnswer !== undefined && p.options) {
      markdown += `**正解:** ${p.options[p.correctAnswer]}\n\n`;
    } else if (p.type === 'true-false') {
      markdown += `**正解:** ${p.answer ? '⭕ 正しい' : '❌ 誤り'}\n\n`;
    }

    markdown += `**解説:** ${p.explanation}\n\n`;
    markdown += `**メモ:**\n\n${p.userNotes}\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * 学習日記版ノートブック生成
 */
function generateDiaryNotebook(quizSetName: string, problems: ProblemWithNote[]): string {
  let markdown = '';
  markdown += `# 📖 ${quizSetName} - 学習日記\n\n`;
  markdown += `**記録日**: ${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}\n\n`;
  markdown += `---\n\n`;

  markdown += `## 今日の学習内容\n\n`;
  markdown += `**学習した問題数**: ${problems.length}問\n\n`;

  const categories = [...new Set(problems.map(p => p.category))];
  markdown += `**学習カテゴリー**: ${categories.join(', ')}\n\n`;
  markdown += `---\n\n`;

  markdown += `## 💡 学びと気づき\n\n`;
  problems.forEach((p, idx) => {
    markdown += `### ${idx + 1}. ${p.category} - ${p.question.substring(0, 50)}...\n\n`;
    markdown += `**気づき:**\n\n${p.userNotes}\n\n`;
  });

  markdown += `---\n\n`;
  markdown += `## 📝 振り返り\n\n`;
  markdown += `- 理解できたこと:\n\n`;
  markdown += `- まだ理解が必要なこと:\n\n`;
  markdown += `- 次回の学習計画:\n\n`;

  return markdown;
}

/**
 * カテゴリー別に問題をグループ化
 */
function groupProblemsByCategory(problems: ProblemWithNote[]): Map<string, ProblemWithNote[]> {
  const problemsByCategory = new Map<string, ProblemWithNote[]>();
  problems.forEach(p => {
    const category = p.category || 'その他';
    if (!problemsByCategory.has(category)) {
      problemsByCategory.set(category, []);
    }
    problemsByCategory.get(category)!.push(p);
  });
  return problemsByCategory;
}
