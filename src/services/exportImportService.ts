/**
 * 拡張エクスポート/インポートサービス
 *
 * 全データの完全バックアップ、選択的インポート、データ検証、マイグレーション機能
 */

import { db } from '../lib/database';
import type {
  Problem,
  Category,
  QuizSet,
  HistoryEntry,
  SpacedRepetitionCard,
  StudyTimeSession,
} from '../types';
import type { Goal } from '../types/goal';
import type { CategoryStat } from '../types/weakness';

/**
 * 完全エクスポートデータ構造
 */
export interface FullExportData {
  version: string;
  exportDate: string;
  appVersion: string;
  dataTypes: string[];
  data: {
    categories?: Category[];
    problems?: Problem[];
    history?: HistoryEntry[];
    quizSets?: QuizSet[];
    spacedRepetitionCards?: SpacedRepetitionCard[];
    studyTimeSessions?: StudyTimeSession[];
    goals?: Goal[];
    categoryStats?: CategoryStat[];
  };
  metadata: {
    totalProblems: number;
    totalHistory: number;
    totalQuizSets: number;
    totalCards: number;
    totalSessions: number;
    totalGoals: number;
    exportSize: number;
  };
}

/**
 * インポートオプション
 */
export interface ImportOptions {
  includeProblems: boolean;
  includeHistory: boolean;
  includeQuizSets: boolean;
  includeCards: boolean;
  includeSessions: boolean;
  includeGoals: boolean;
  includeStats: boolean;
  overwriteExisting: boolean;
  validateData: boolean;
}

/**
 * インポート結果
 */
export interface ImportResult {
  success: boolean;
  imported: {
    problems: number;
    history: number;
    quizSets: number;
    cards: number;
    sessions: number;
    goals: number;
    stats: number;
  };
  skipped: {
    problems: number;
    history: number;
    quizSets: number;
    cards: number;
    sessions: number;
    goals: number;
    stats: number;
  };
  errors: string[];
  warnings: string[];
  duration: number;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dataTypes: string[];
  version: string;
}

const CURRENT_VERSION = '1.0.0';
const SUPPORTED_VERSIONS = ['1.0.0'];

/**
 * 全データを完全エクスポート
 */
export async function exportFullData(): Promise<FullExportData> {
  try {
    console.log('[ExportImportService] 全データをエクスポート中...');

    const [
      categories,
      problems,
      history,
      quizSets,
      spacedRepetitionCards,
      studyTimeSessions,
      goals,
      categoryStats,
    ] = await Promise.all([
      db.categories.toArray(),
      db.problems.toArray(),
      db.history.toArray(),
      db.quizSets.toArray(),
      db.spacedRepetitionCards.toArray(),
      db.studyTimeSessions.toArray(),
      db.goals.toArray(),
      db.categoryStats.toArray(),
    ]);

    const exportData: FullExportData = {
      version: CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      dataTypes: [
        'categories',
        'problems',
        'history',
        'quizSets',
        'spacedRepetitionCards',
        'studyTimeSessions',
        'goals',
        'categoryStats',
      ],
      data: {
        categories,
        problems,
        history,
        quizSets,
        spacedRepetitionCards,
        studyTimeSessions,
        goals,
        categoryStats,
      },
      metadata: {
        totalProblems: problems.length,
        totalHistory: history.length,
        totalQuizSets: quizSets.length,
        totalCards: spacedRepetitionCards.length,
        totalSessions: studyTimeSessions.length,
        totalGoals: goals.length,
        exportSize: 0, // 後で計算
      },
    };

    // エクスポートサイズを計算
    const jsonString = JSON.stringify(exportData);
    exportData.metadata.exportSize = new Blob([jsonString]).size;

    console.log('[ExportImportService] エクスポート完了:', exportData.metadata);

    return exportData;
  } catch (error) {
    console.error('[ExportImportService] エクスポートエラー:', error);
    throw error;
  }
}

/**
 * データをバリデーション
 */
export function validateImportData(jsonData: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    dataTypes: [],
    version: '',
  };

  try {
    // JSON パース
    const data = JSON.parse(jsonData);

    // バージョンチェック
    if (!data.version) {
      result.errors.push('バージョン情報がありません');
      result.valid = false;
    } else if (!SUPPORTED_VERSIONS.includes(data.version)) {
      result.errors.push(
        `サポートされていないバージョンです: ${data.version} (サポート: ${SUPPORTED_VERSIONS.join(', ')})`
      );
      result.valid = false;
    }
    result.version = data.version || 'unknown';

    // データ構造チェック
    if (!data.data) {
      result.errors.push('データ構造が不正です');
      result.valid = false;
      return result;
    }

    // データタイプの確認
    const dataTypes = Object.keys(data.data);
    result.dataTypes = dataTypes;

    if (dataTypes.length === 0) {
      result.warnings.push('インポートするデータがありません');
    }

    // 各データタイプの検証
    if (data.data.problems) {
      const problems = data.data.problems;
      if (!Array.isArray(problems)) {
        result.errors.push('problems: 配列である必要があります');
        result.valid = false;
      } else {
        problems.forEach((p: any, idx: number) => {
          if (!p.question || !p.category) {
            result.errors.push(`problems[${idx}]: questionとcategoryは必須です`);
            result.valid = false;
          }
        });
      }
    }

    if (data.data.history) {
      const history = data.data.history;
      if (!Array.isArray(history)) {
        result.errors.push('history: 配列である必要があります');
        result.valid = false;
      }
    }

    if (data.data.quizSets) {
      const quizSets = data.data.quizSets;
      if (!Array.isArray(quizSets)) {
        result.errors.push('quizSets: 配列である必要があります');
        result.valid = false;
      }
    }

    // メタデータの確認
    if (data.metadata) {
      const actualCounts = {
        problems: data.data.problems?.length || 0,
        history: data.data.history?.length || 0,
        quizSets: data.data.quizSets?.length || 0,
      };

      if (data.metadata.totalProblems !== actualCounts.problems) {
        result.warnings.push(
          `問題数の不一致: メタデータ=${data.metadata.totalProblems}, 実際=${actualCounts.problems}`
        );
      }
    }

    console.log('[ExportImportService] バリデーション結果:', result);

    return result;
  } catch (error) {
    result.valid = false;
    result.errors.push(`JSONパースエラー: ${error}`);
    return result;
  }
}

/**
 * データをインポート
 */
export async function importData(
  jsonData: string,
  options: ImportOptions
): Promise<ImportResult> {
  const startTime = Date.now();

  const result: ImportResult = {
    success: false,
    imported: {
      problems: 0,
      history: 0,
      quizSets: 0,
      cards: 0,
      sessions: 0,
      goals: 0,
      stats: 0,
    },
    skipped: {
      problems: 0,
      history: 0,
      quizSets: 0,
      cards: 0,
      sessions: 0,
      goals: 0,
      stats: 0,
    },
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    console.log('[ExportImportService] インポート開始...', options);

    // バリデーション
    if (options.validateData) {
      const validation = validateImportData(jsonData);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        result.duration = Date.now() - startTime;
        return result;
      }
      result.warnings.push(...validation.warnings);
    }

    const data: FullExportData = JSON.parse(jsonData);

    // カテゴリのインポート（問題の前に必要）
    if (data.data.categories && options.includeProblems) {
      await importCategories(data.data.categories, options, result);
    }

    // 問題のインポート
    if (data.data.problems && options.includeProblems) {
      await importProblems(data.data.problems, options, result);
    }

    // 履歴のインポート
    if (data.data.history && options.includeHistory) {
      await importHistory(data.data.history, options, result);
    }

    // クイズセットのインポート
    if (data.data.quizSets && options.includeQuizSets) {
      await importQuizSets(data.data.quizSets, options, result);
    }

    // 間隔反復カードのインポート
    if (data.data.spacedRepetitionCards && options.includeCards) {
      await importCards(data.data.spacedRepetitionCards, options, result);
    }

    // 学習時間セッションのインポート
    if (data.data.studyTimeSessions && options.includeSessions) {
      await importSessions(data.data.studyTimeSessions, options, result);
    }

    // 目標のインポート
    if (data.data.goals && options.includeGoals) {
      await importGoals(data.data.goals, options, result);
    }

    // カテゴリ統計のインポート
    if (data.data.categoryStats && options.includeStats) {
      await importStats(data.data.categoryStats, options, result);
    }

    result.success = result.errors.length === 0;
    result.duration = Date.now() - startTime;

    console.log('[ExportImportService] インポート完了:', result);

    return result;
  } catch (error) {
    result.errors.push(`インポートエラー: ${error}`);
    result.duration = Date.now() - startTime;
    console.error('[ExportImportService] インポートエラー:', error);
    return result;
  }
}

/**
 * カテゴリをインポート
 */
async function importCategories(
  categories: Category[],
  options: ImportOptions,
  result: ImportResult
): Promise<void> {
  try {
    const existingCategories = await db.categories.toArray();
    const existingNames = new Set(existingCategories.map((c) => c.name));

    for (const category of categories) {
      if (existingNames.has(category.name) && !options.overwriteExisting) {
        result.skipped.problems++; // カテゴリはproblemsカウントに含める
        continue;
      }

      await db.categories.put(category);
    }
  } catch (error) {
    result.errors.push(`カテゴリインポートエラー: ${error}`);
  }
}

/**
 * 問題をインポート
 */
async function importProblems(
  problems: Problem[],
  options: ImportOptions,
  result: ImportResult
): Promise<void> {
  try {
    for (const problem of problems) {
      try {
        if (problem.id && !options.overwriteExisting) {
          const existing = await db.problems.get(problem.id);
          if (existing) {
            result.skipped.problems++;
            continue;
          }
        }

        // IDを削除して新規追加（重複回避）
        const { id, ...problemData } = problem;
        await db.problems.add(problemData as Problem);
        result.imported.problems++;
      } catch (error) {
        result.errors.push(`問題[${problem.id}]のインポートエラー: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`問題インポートエラー: ${error}`);
  }
}

/**
 * 履歴をインポート
 */
async function importHistory(
  history: HistoryEntry[],
  _options: ImportOptions,
  result: ImportResult
): Promise<void> {
  try {
    for (const entry of history) {
      try {
        const { id, ...entryData } = entry;
        await db.history.add(entryData as HistoryEntry);
        result.imported.history++;
      } catch (error) {
        result.errors.push(`履歴[${entry.id}]のインポートエラー: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`履歴インポートエラー: ${error}`);
  }
}

/**
 * クイズセットをインポート
 */
async function importQuizSets(
  quizSets: QuizSet[],
  options: ImportOptions,
  result: ImportResult
): Promise<void> {
  try {
    for (const quizSet of quizSets) {
      try {
        if (quizSet.id && !options.overwriteExisting) {
          const existing = await db.quizSets.get(quizSet.id);
          if (existing) {
            result.skipped.quizSets++;
            continue;
          }
        }

        const { id, ...quizSetData } = quizSet;
        await db.quizSets.add(quizSetData as QuizSet);
        result.imported.quizSets++;
      } catch (error) {
        result.errors.push(`クイズセット[${quizSet.id}]のインポートエラー: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`クイズセットインポートエラー: ${error}`);
  }
}

/**
 * カードをインポート
 */
async function importCards(
  cards: SpacedRepetitionCard[],
  _options: ImportOptions,
  result: ImportResult
): Promise<void> {
  try {
    for (const card of cards) {
      try {
        const { id, ...cardData } = card;
        await db.spacedRepetitionCards.add(cardData as SpacedRepetitionCard);
        result.imported.cards++;
      } catch (error) {
        result.errors.push(`カード[${card.id}]のインポートエラー: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`カードインポートエラー: ${error}`);
  }
}

/**
 * セッションをインポート
 */
async function importSessions(
  sessions: StudyTimeSession[],
  _options: ImportOptions,
  result: ImportResult
): Promise<void> {
  try {
    for (const session of sessions) {
      try {
        const { id, ...sessionData } = session;
        await db.studyTimeSessions.add(sessionData as StudyTimeSession);
        result.imported.sessions++;
      } catch (error) {
        result.errors.push(`セッション[${session.id}]のインポートエラー: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`セッションインポートエラー: ${error}`);
  }
}

/**
 * 目標をインポート
 */
async function importGoals(
  goals: Goal[],
  _options: ImportOptions,
  result: ImportResult
): Promise<void> {
  try {
    for (const goal of goals) {
      try {
        const { id, ...goalData } = goal;
        await db.goals.add(goalData as Goal);
        result.imported.goals++;
      } catch (error) {
        result.errors.push(`目標[${goal.id}]のインポートエラー: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`目標インポートエラー: ${error}`);
  }
}

/**
 * 統計をインポート
 */
async function importStats(
  stats: CategoryStat[],
  _options: ImportOptions,
  result: ImportResult
): Promise<void> {
  try {
    for (const stat of stats) {
      try {
        const { id, ...statData } = stat;
        await db.categoryStats.add(statData as CategoryStat);
        result.imported.stats++;
      } catch (error) {
        result.errors.push(`統計[${stat.id}]のインポートエラー: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`統計インポートエラー: ${error}`);
  }
}

/**
 * データをファイルとしてダウンロード
 */
export async function downloadFullBackup(): Promise<void> {
  try {
    const exportData = await exportFullData();
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `minguella-backup-${timestamp}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    console.log('[ExportImportService] バックアップをダウンロードしました');
  } catch (error) {
    console.error('[ExportImportService] ダウンロードエラー:', error);
    throw error;
  }
}

/**
 * デフォルトインポートオプション
 */
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  includeProblems: true,
  includeHistory: true,
  includeQuizSets: true,
  includeCards: true,
  includeSessions: true,
  includeGoals: true,
  includeStats: true,
  overwriteExisting: false,
  validateData: true,
};
