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
import type { Problem } from '../types';

/**
 * メモ付き問題の型
 */
export interface ProblemWithNote extends Problem {
  userNotes?: string;
  noteUpdatedAt?: Date;
  noteTags?: string[];
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
