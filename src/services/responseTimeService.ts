/**
 * Response Time Service
 * 自動解答時間計測とパーソナライゼーション
 */

import { historyService, problemService } from '../lib/database';
import type { Problem } from '../types';

/**
 * 🎯 適当回答・異常値の検知閾値
 */
const RESPONSE_TIME_THRESHOLDS = {
  // ○×問題
  trueFalse: {
    min: 1000,      // 1秒未満は適当回答（連打）と判断
    max: 300000,    // 5分以上は集中していない（離席）と判断
  },
  // 選択問題
  multipleChoice: {
    min: 3000,      // 3秒未満は適当回答（問題を読んでいない）と判断
    max: 300000,    // 5分以上は集中していない（離席）と判断
  }
} as const;

interface ResponseTimeStats {
  tfAverageMs: number; // ○×問題の平均解答時間（ミリ秒）
  mcAverageMs: number; // 選択問題の平均解答時間（ミリ秒）
  tfCount: number; // ○×問題の解答数
  mcCount: number; // 選択問題の解答数
  totalCount: number; // 総解答数
}

/**
 * 履歴から平均解答時間を計算
 */
export async function calculateAverageResponseTimes(): Promise<ResponseTimeStats> {
  try {
    // 解答時間が記録されている履歴のみを取得
    const allHistory = await historyService.getAll();
    const historyWithTime = allHistory.filter(h => h.responseTime && h.responseTime > 0);

    if (historyWithTime.length === 0) {
      console.log('📊 No response time data available yet');
      return {
        tfAverageMs: 10000, // デフォルト: 10秒
        mcAverageMs: 120000, // デフォルト: 2分
        tfCount: 0,
        mcCount: 0,
        totalCount: 0
      };
    }

    // 問題IDから問題タイプを取得
    const problemIds = [...new Set(historyWithTime.map(h => h.problemId))];
    const problems = await problemService.getByIds(problemIds);
    const problemMap = new Map<number, Problem>();
    problems.forEach(p => {
      if (p.id) problemMap.set(p.id, p);
    });

    // 問題タイプごとに解答時間を集計
    const tfTimes: number[] = [];
    const mcTimes: number[] = [];

    historyWithTime.forEach(h => {
      const problem = problemMap.get(h.problemId);
      if (!problem || !h.responseTime) return;

      const type = problem.type || 'true-false'; // デフォルトは○×

      // 🎯 適当回答と異常値を除外
      if (type === 'true-false') {
        const { min, max } = RESPONSE_TIME_THRESHOLDS.trueFalse;
        if (h.responseTime < min || h.responseTime > max) return;
        tfTimes.push(h.responseTime);
      } else if (type === 'multiple-choice') {
        const { min, max } = RESPONSE_TIME_THRESHOLDS.multipleChoice;
        if (h.responseTime < min || h.responseTime > max) return;
        mcTimes.push(h.responseTime);
      }
    });

    // 平均値を計算（外れ値を除外するため中央値を使用）
    const calculateMedian = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return sorted[mid];
    };

    const tfAverage = calculateMedian(tfTimes);
    const mcAverage = calculateMedian(mcTimes);

    console.log('📊 Response time statistics:', {
      tfCount: tfTimes.length,
      tfAverage: `${(tfAverage / 1000).toFixed(1)}s`,
      mcCount: mcTimes.length,
      mcAverage: `${(mcAverage / 1000).toFixed(1)}s`,
      totalCount: historyWithTime.length
    });

    return {
      tfAverageMs: tfAverage || 10000,
      mcAverageMs: mcAverage || 120000,
      tfCount: tfTimes.length,
      mcCount: mcTimes.length,
      totalCount: historyWithTime.length
    };
  } catch (error) {
    console.error('❌ Failed to calculate response times:', error);
    return {
      tfAverageMs: 10000,
      mcAverageMs: 120000,
      tfCount: 0,
      mcCount: 0,
      totalCount: 0
    };
  }
}

/**
 * 自動パーソナライゼーション
 * 十分なデータがある場合、localStorageの設定を自動更新
 *
 * @param minSampleSize 最小サンプル数（デフォルト: 10）
 * @returns 更新が行われたかどうか
 */
export async function autoPersonalizeSettings(minSampleSize: number = 10): Promise<boolean> {
  try {
    // 自動調整が有効かチェック
    const autoAdjust = localStorage.getItem('autoAdjustTime') === 'true';
    if (!autoAdjust) {
      console.log('⚙️ Auto-adjust is disabled, skipping personalization');
      return false;
    }

    const stats = await calculateAverageResponseTimes();

    // 十分なデータがあるかチェック
    const hasSufficientTfData = stats.tfCount >= minSampleSize;
    const hasSufficientMcData = stats.mcCount >= minSampleSize;

    if (!hasSufficientTfData && !hasSufficientMcData) {
      console.log('📊 Insufficient data for personalization:', {
        tfCount: stats.tfCount,
        mcCount: stats.mcCount,
        required: minSampleSize
      });
      return false;
    }

    // ○×問題の設定を更新
    if (hasSufficientTfData) {
      const tfSeconds = Math.round(stats.tfAverageMs / 1000);
      // 5〜30秒の範囲に制限
      const clampedTfSeconds = Math.max(5, Math.min(30, tfSeconds));
      localStorage.setItem('tfTimePerQuestion', clampedTfSeconds.toString());
      console.log(`✅ Updated TF time: ${clampedTfSeconds}s (from ${tfSeconds}s average)`);
    }

    // 選択問題の設定を更新
    if (hasSufficientMcData) {
      const mcSeconds = Math.round(stats.mcAverageMs / 1000);
      // 30〜300秒の範囲に制限
      const clampedMcSeconds = Math.max(30, Math.min(300, mcSeconds));
      localStorage.setItem('mcTimePerQuestion', clampedMcSeconds.toString());
      console.log(`✅ Updated MC time: ${clampedMcSeconds}s (from ${mcSeconds}s average)`);
    }

    return true;
  } catch (error) {
    console.error('❌ Auto-personalization failed:', error);
    return false;
  }
}

/**
 * パーソナライズされた推奨時間を計算
 *
 * @param problemCount 問題数
 * @param tfRatio ○×問題の割合（0.0〜1.0、デフォルト: 0.5）
 * @returns 推奨時間（分）
 */
export function calculatePersonalizedTime(
  problemCount: number,
  tfRatio: number = 0.5
): { minutes: number; formatted: string; isReduced: boolean } {
  if (problemCount === 0) {
    return { minutes: 0, formatted: '0分', isReduced: false };
  }

  // ユーザー設定を取得
  const tfTimePerQuestion = parseFloat(localStorage.getItem('tfTimePerQuestion') || '10') / 60;
  const mcTimePerQuestion = parseFloat(localStorage.getItem('mcTimePerQuestion') || '120') / 60;

  // 問題タイプの比率に基づいて計算
  const tfCount = Math.round(problemCount * tfRatio);
  const mcCount = problemCount - tfCount;

  let totalMinutes = Math.ceil(tfCount * tfTimePerQuestion + mcCount * mcTimePerQuestion);
  let isReduced = false;

  // 🎯 学習意欲を高めるテクニック: 1時間を超える場合のみ30％短縮して表示
  if (totalMinutes >= 60) {
    totalMinutes = Math.ceil(totalMinutes * 0.7);
    isReduced = true;
  }

  let formatted: string;
  if (totalMinutes < 60) {
    formatted = `${totalMinutes}分`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      formatted = `${hours}時間`;
    } else {
      formatted = `${hours}時間${minutes}分`;
    }
  }

  return { minutes: totalMinutes, formatted, isReduced };
}

/**
 * 統計情報を取得（設定画面用）
 */
export async function getResponseTimeStatistics(): Promise<{
  stats: ResponseTimeStats;
  canAutoPersonalize: boolean;
  recommendations: {
    tfSeconds?: number;
    mcSeconds?: number;
  };
}> {
  const stats = await calculateAverageResponseTimes();
  const minSampleSize = 10;

  const recommendations: { tfSeconds?: number; mcSeconds?: number } = {};

  if (stats.tfCount >= minSampleSize) {
    recommendations.tfSeconds = Math.round(stats.tfAverageMs / 1000);
  }
  if (stats.mcCount >= minSampleSize) {
    recommendations.mcSeconds = Math.round(stats.mcAverageMs / 1000);
  }

  return {
    stats,
    canAutoPersonalize: stats.tfCount >= minSampleSize || stats.mcCount >= minSampleSize,
    recommendations
  };
}
