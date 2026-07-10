/**
 * レポート生成サービス
 *
 * PDF/PNG形式での学習レポート生成機能
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { statisticsService } from '../lib/database';
import { generateStatisticsSummary } from './statisticsAggregator';

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export type ReportScope = 'all' | 'quizSet' | 'category';

export interface ReportFilter {
  scope: ReportScope;
  quizSetId?: number;
  quizSetName?: string;
  category?: string;
}

export interface ReportOptions {
  period: ReportPeriod;
  format: 'pdf' | 'png';
  filter: ReportFilter;
  includeSummary: boolean;
  includeCategories: boolean;
  includeTrends: boolean;
  includeWeakAreas: boolean;
  language: 'ja' | 'en';
}

export interface ReportData {
  period: ReportPeriod;
  filter: ReportFilter;
  summary: {
    totalProblems: number;
    totalCorrect: number;
    accuracy: number;
    studyTime: number; // 分単位
    studyDays: number;
  };
  categories: Array<{
    category: string;
    problemCount: number;
    accuracy: number;
    totalAnswered: number;
  }>;
  weakAreas: Array<{
    category: string;
    accuracy: number;
    problemCount: number;
  }>;
  trends: {
    accuracyTrend: 'improving' | 'stable' | 'declining';
    activityTrend: 'improving' | 'stable' | 'declining';
  };
}

export const translations = {
  ja: {
    title: '学習レポート',
    period: '期間',
    scope: '対象範囲',
    scopeAll: '全体',
    scopeQuizSet: '問題集',
    scopeCategory: 'カテゴリー',
    summary: '概要',
    totalProblems: '解答問題数',
    accuracy: '正答率',
    studyTime: '学習時間',
    studyDays: '学習日数',
    minutes: '分',
    days: '日',
    categories: 'カテゴリー別分析',
    category: 'カテゴリー',
    problemCount: '問題数',
    answered: '解答数',
    weakAreas: '弱点分野トップ3',
    trends: 'トレンド分析',
    accuracyTrend: '正答率トレンド',
    activityTrend: '学習量トレンド',
    improving: '上昇中',
    stable: '安定',
    declining: '低下中',
    generatedAt: 'レポート生成日時',
  },
  en: {
    title: 'Learning Report',
    period: 'Period',
    scope: 'Scope',
    scopeAll: 'All',
    scopeQuizSet: 'Quiz Set',
    scopeCategory: 'Category',
    summary: 'Summary',
    totalProblems: 'Problems Solved',
    accuracy: 'Accuracy',
    studyTime: 'Study Time',
    studyDays: 'Study Days',
    minutes: 'min',
    days: 'days',
    categories: 'Category Analysis',
    category: 'Category',
    problemCount: 'Problems',
    answered: 'Answered',
    weakAreas: 'Top 3 Weak Areas',
    trends: 'Trend Analysis',
    accuracyTrend: 'Accuracy Trend',
    activityTrend: 'Activity Trend',
    improving: 'Improving',
    stable: 'Stable',
    declining: 'Declining',
    generatedAt: 'Generated At',
  },
};

/**
 * 期間とフィルタに基づいてレポートデータを生成
 */
export async function generateReportData(
  period: ReportPeriod,
  filter: ReportFilter
): Promise<ReportData> {
  // 統計サマリーを取得
  const summary = await generateStatisticsSummary();

  // カテゴリー統計を取得
  const categoryStats = await statisticsService.getCategoryStats();

  // フィルタリングされたデータを取得
  let filteredCategoryStats = categoryStats;
  let filteredSummary = summary.allTime;

  if (filter.scope === 'quizSet' && filter.quizSetId) {
    // 問題集別フィルタリング
    const { db } = await import('../lib/database');
    const quizSets = await db.quizSets.toArray();
    const quizSet = quizSets.find(qs => qs.id === filter.quizSetId);

    if (quizSet) {
      const history = await db.history.toArray();
      const quizSetHistory = history.filter(entry =>
        quizSet.problemIds.includes(entry.problemId)
      );

      // 問題集の統計を計算
      const totalProblems = quizSetHistory.length;
      const totalCorrect = quizSetHistory.filter(e => e.isCorrect).length;
      const accuracy = totalProblems > 0 ? (totalCorrect / totalProblems * 100) : 0;

      filteredSummary = {
        ...summary.allTime,
        totalProblems,
        totalCorrect,
        accuracy,
      };

      // カテゴリー統計も問題集でフィルタリング
      const categoryMap = new Map<string, { total: number; correct: number }>();
      quizSetHistory.forEach(entry => {
        const existing = categoryMap.get(entry.category) || { total: 0, correct: 0 };
        categoryMap.set(entry.category, {
          total: existing.total + 1,
          correct: existing.correct + (entry.isCorrect ? 1 : 0),
        });
      });

      filteredCategoryStats = Array.from(categoryMap.entries()).map(([category, stats]) => ({
        category,
        problemCount: stats.total,
        totalAnswered: stats.total,
        totalCorrect: stats.correct,
        accuracy: stats.total > 0 ? (stats.correct / stats.total * 100) : 0,
      }));
    }
  } else if (filter.scope === 'category' && filter.category) {
    // カテゴリー別フィルタリング
    const categoryData = categoryStats.find(cat => cat.category === filter.category);

    if (categoryData) {
      filteredSummary = {
        ...summary.allTime,
        totalProblems: categoryData.totalAnswered,
        totalCorrect: Math.round(categoryData.totalAnswered * (categoryData.accuracy / 100)),
        accuracy: categoryData.accuracy,
      };

      filteredCategoryStats = [categoryData];
    }
  }

  const reportData: ReportData = {
    period,
    filter,
    summary: {
      totalProblems: filteredSummary.totalProblems,
      totalCorrect: filteredSummary.totalCorrect || Math.round(filteredSummary.totalProblems * (filteredSummary.accuracy / 100)),
      accuracy: Math.round(filteredSummary.accuracy),
      studyTime: Math.round(filteredSummary.totalStudyTime / 60),
      studyDays: filteredSummary.studyDays,
    },
    categories: filteredCategoryStats.map(cat => ({
      category: cat.category,
      problemCount: cat.problemCount,
      accuracy: cat.accuracy,
      totalAnswered: cat.totalAnswered,
    })),
    weakAreas: filteredCategoryStats
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3)
      .map(cat => ({
        category: cat.category,
        accuracy: cat.accuracy,
        problemCount: cat.problemCount,
      })),
    trends: {
      accuracyTrend: summary.trends?.accuracy.trend || 'stable',
      activityTrend: summary.trends?.activity.trend || 'stable',
    },
  };

  return reportData;
}

/**
 * PDFレポートを生成してダウンロード（HTML→画像→PDF方式）
 */
export async function generatePDFReport(
  data: ReportData,
  options: ReportOptions
): Promise<void> {
  const t = translations[options.language];

  // HTMLテンプレートを作成
  const htmlContent = createReportHTML(data, options, t);

  // 一時的なHTML要素を作成
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '794px'; // A4幅（ピクセル）
  tempDiv.style.padding = '40px';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.style.color = '#000000';
  document.body.appendChild(tempDiv);

  try {
    // HTML→Canvas変換
    const canvas = await html2canvas(tempDiv, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    });

    // Canvas→PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // ページ分割が必要な場合
    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    // ダウンロード
    const filename = `learning-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    console.log(`[ReportGenerator] PDFレポートを生成しました: ${filename}`);
  } finally {
    // 一時要素を削除
    document.body.removeChild(tempDiv);
  }
}

/**
 * レポート用HTMLを生成
 */
export function createReportHTML(
  data: ReportData,
  options: ReportOptions,
  t: typeof translations.ja
): string {
  // スコープのラベルを取得
  let scopeLabel = t.scopeAll;
  let scopeDetail = '';

  if (data.filter.scope === 'quizSet' && data.filter.quizSetName) {
    scopeLabel = t.scopeQuizSet;
    scopeDetail = `: ${data.filter.quizSetName}`;
  } else if (data.filter.scope === 'category' && data.filter.category) {
    scopeLabel = t.scopeCategory;
    scopeDetail = `: ${data.filter.category}`;
  }

  let html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937;">
      <h1 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">${t.title}</h1>
      <p style="color: #374151; margin-bottom: 10px;">${t.period}: ${data.period.label}</p>
      <p style="color: #374151; margin-bottom: 30px;">${t.scope}: ${scopeLabel}${scopeDetail}</p>
  `;

  // 概要セクション
  if (options.includeSummary) {
    html += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">${t.summary}</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p style="margin: 8px 0; color: #1f2937;"><strong>${t.totalProblems}:</strong> ${data.summary.totalProblems}</p>
          <p style="margin: 8px 0; color: #1f2937;"><strong>${t.accuracy}:</strong> ${data.summary.accuracy}%</p>
          <p style="margin: 8px 0; color: #1f2937;"><strong>${t.studyTime}:</strong> ${data.summary.studyTime} ${t.minutes}</p>
          <p style="margin: 8px 0; color: #1f2937;"><strong>${t.studyDays}:</strong> ${data.summary.studyDays} ${t.days}</p>
        </div>
      </div>
    `;
  }

  // カテゴリー別分析
  if (options.includeCategories && data.categories.length > 0) {
    html += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">${t.categories}</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
    `;
    data.categories.forEach((cat) => {
      html += `<p style="margin: 6px 0; font-size: 14px; color: #1f2937;">${cat.category}: <strong>${cat.accuracy.toFixed(1)}%</strong> (${cat.totalAnswered} ${t.answered})</p>`;
    });
    html += `</div></div>`;
  }

  // 弱点分野
  if (options.includeWeakAreas && data.weakAreas.length > 0) {
    html += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">${t.weakAreas}</h2>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
    `;
    data.weakAreas.forEach((area, index) => {
      html += `<p style="margin: 8px 0; color: #1f2937;"><strong>${index + 1}.</strong> ${area.category}: ${area.accuracy.toFixed(1)}%</p>`;
    });
    html += `</div></div>`;
  }

  // トレンド分析
  if (options.includeTrends) {
    const accuracyTrendText =
      data.trends.accuracyTrend === 'improving'
        ? t.improving
        : data.trends.accuracyTrend === 'declining'
        ? t.declining
        : t.stable;

    const activityTrendText =
      data.trends.activityTrend === 'improving'
        ? t.improving
        : data.trends.activityTrend === 'declining'
        ? t.declining
        : t.stable;

    html += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">${t.trends}</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p style="margin: 8px 0; color: #1f2937;"><strong>${t.accuracyTrend}:</strong> ${accuracyTrendText}</p>
          <p style="margin: 8px 0; color: #1f2937;"><strong>${t.activityTrend}:</strong> ${activityTrendText}</p>
        </div>
      </div>
    `;
  }

  // フッター
  html += `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
        <p>${t.generatedAt}: ${new Date().toLocaleString(options.language === 'ja' ? 'ja-JP' : 'en-US')}</p>
      </div>
    </div>
  `;

  return html;
}

/**
 * PNG画像レポートを生成してダウンロード
 */
export async function generatePNGReport(
  data: ReportData,
  options: ReportOptions
): Promise<void> {
  const t = translations[options.language];

  // HTMLテンプレートを作成
  const htmlContent = createReportHTML(data, options, t);

  // 一時的なHTML要素を作成
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '1200px'; // PNG用の幅（より大きめ）
  tempDiv.style.padding = '60px';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.style.color = '#000000';
  document.body.appendChild(tempDiv);

  try {
    // HTML→Canvas変換
    const canvas = await html2canvas(tempDiv, {
      backgroundColor: '#ffffff',
      scale: 2, // 高解像度
      logging: false,
    });

    // CanvasをBlob化してダウンロード
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to generate PNG blob');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `learning-report-${new Date().toISOString().split('T')[0]}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      console.log('[ReportGenerator] PNG画像レポートを生成しました');
    }, 'image/png');
  } finally {
    // 一時要素を削除
    document.body.removeChild(tempDiv);
  }
}

/**
 * 期間プリセット
 */
export const PERIOD_PRESETS = {
  last7Days: {
    label: '過去7日間',
    labelEn: 'Last 7 Days',
    getDates: () => ({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }),
  },
  last30Days: {
    label: '過去30日間',
    labelEn: 'Last 30 Days',
    getDates: () => ({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }),
  },
  last90Days: {
    label: '過去90日間',
    labelEn: 'Last 90 Days',
    getDates: () => ({
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }),
  },
  thisMonth: {
    label: '今月',
    labelEn: 'This Month',
    getDates: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };
    },
  },
  allTime: {
    label: '全期間',
    labelEn: 'All Time',
    getDates: () => ({
      startDate: new Date(2020, 0, 1), // 開始日（適当な過去の日付）
      endDate: new Date(),
    }),
  },
};
