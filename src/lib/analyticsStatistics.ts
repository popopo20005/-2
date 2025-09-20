import { learningAnalyticsService, db } from './database';
import type { AnswerAnalytics, SessionAnalytics, ReliabilityAssessment, Problem } from '../types';

export interface WeightedStatsResult {
  totalAnswered: number;
  reliableAnswers: number;
  weightedAccuracy: number;
  avgResponseTime: number;
  reliableResponseTime: number;
  confidenceDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  casualAnswerRate: number;
}

export interface LearningPatternAnalysis {
  optimalSessionLength: number; // minutes
  peakPerformanceHours: number[];
  fatigueThreshold: number; // minutes
  avgFocusRetention: number; // 0-1
  learningEfficiencyTrend: Array<{
    date: string;
    efficiency: number;
    reliability: number;
  }>;
}

export interface CategoryAnalysis {
  category: string;
  weightedAccuracy: number;
  reliableAnswers: number;
  avgResponseTime: number;
  improvementTrend: number; // -1 to 1
  difficultyRating: number; // 1-5
  recommendedFocus: boolean;
}

export class AnalyticsStatisticsService {

  // フェーズ2-A: 基本パフォーマンス指標
  async getWeightedStats(sessionId?: string): Promise<WeightedStatsResult> {
    const analytics = sessionId
      ? await learningAnalyticsService.getSessionAnswerAnalytics(sessionId)
      : await this.getAllAnswerAnalytics();

    let totalAnswered = 0;
    let reliableAnswers = 0;
    let totalWeightedCorrect = 0;
    let totalWeights = 0;
    let totalResponseTime = 0;
    let reliableResponseTime = 0;
    let reliableCount = 0;

    const confidenceDistribution: Record<string, number> = {};
    const difficultyDistribution: Record<string, number> = {};
    let casualAnswers = 0;

    for (const analytic of analytics) {
      totalAnswered++;
      totalResponseTime += analytic.responseTime;

      // 信頼性評価を取得
      const assessment = await this.getReliabilityAssessment(analytic.id!);
      const weight = assessment?.weight || 0;

      if (weight > 0) {
        reliableAnswers++;
        totalWeights += weight;

        if (analytic.isCorrect) {
          totalWeightedCorrect += weight;
        }

        if (weight >= 0.7) {
          reliableResponseTime += analytic.responseTime;
          reliableCount++;
        }
      }

      // 主観的データの分布
      if (analytic.confidenceLevel) {
        confidenceDistribution[analytic.confidenceLevel] =
          (confidenceDistribution[analytic.confidenceLevel] || 0) + 1;
      }

      if (analytic.perceivedDifficulty) {
        const key = analytic.perceivedDifficulty.toString();
        difficultyDistribution[key] =
          (difficultyDistribution[key] || 0) + 1;
      }

      if (analytic.wasCasualAnswer) {
        casualAnswers++;
      }
    }

    return {
      totalAnswered,
      reliableAnswers,
      weightedAccuracy: totalWeights > 0 ? (totalWeightedCorrect / totalWeights) * 100 : 0,
      avgResponseTime: totalAnswered > 0 ? totalResponseTime / totalAnswered : 0,
      reliableResponseTime: reliableCount > 0 ? reliableResponseTime / reliableCount : 0,
      confidenceDistribution,
      difficultyDistribution,
      casualAnswerRate: totalAnswered > 0 ? (casualAnswers / totalAnswered) * 100 : 0
    };
  }

  // フェーズ2-B: 学習パターン分析
  async analyzeLearningPatterns(): Promise<LearningPatternAnalysis> {
    const sessions = await this.getAllSessionAnalytics();
    const userSessions = sessions;

    // 最適セッション時間の分析
    const sessionPerformance = userSessions.map(session => ({
      duration: session.sessionDuration || 0,
      reliability: session.reliabilityScore
    })).filter(s => s.duration > 0);

    const optimalSessionLength = this.calculateOptimalSessionLength(sessionPerformance);

    // 時間帯別パフォーマンス分析
    const hourlyPerformance: Record<number, number[]> = {};
    userSessions.forEach(session => {
      const hour = new Date(session.sessionStartTime).getHours();
      if (!hourlyPerformance[hour]) hourlyPerformance[hour] = [];
      hourlyPerformance[hour].push(session.reliabilityScore);
    });

    const peakPerformanceHours = Object.entries(hourlyPerformance)
      .map(([hour, scores]) => ({
        hour: parseInt(hour),
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length
      }))
      .filter(h => h.avgScore > 0.7)
      .map(h => h.hour);

    // 疲労閾値の計算
    const fatigueThreshold = this.calculateFatigueThreshold(sessionPerformance);

    // 学習効率トレンドの計算
    const efficiencyTrend = await this.calculateEfficiencyTrend(userSessions);

    return {
      optimalSessionLength,
      peakPerformanceHours,
      fatigueThreshold,
      avgFocusRetention: this.calculateAvgFocusRetention(userSessions),
      learningEfficiencyTrend: efficiencyTrend
    };
  }

  // フェーズ2-C: 弱点・得意分野特定
  async analyzeCategoryPerformance(): Promise<CategoryAnalysis[]> {
    const analytics = await this.getAllAnswerAnalytics();
    const categoryGroups: Record<string, AnswerAnalytics[]> = {};

    // カテゴリー別にグループ化
    for (const analytic of analytics) {
      const problem = await this.getProblemByAnalyticId(analytic.problemId);
      const category = problem?.category || 'Unknown';

      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(analytic);
    }

    const results: CategoryAnalysis[] = [];

    for (const [category, categoryAnalytics] of Object.entries(categoryGroups)) {
      const analysis = await this.analyzeSingleCategory(category, categoryAnalytics);
      results.push(analysis);
    }

    // 改善が必要な順にソート
    return results.sort((a, b) => {
      if (a.recommendedFocus !== b.recommendedFocus) {
        return a.recommendedFocus ? -1 : 1;
      }
      return a.weightedAccuracy - b.weightedAccuracy;
    });
  }

  // プライベートヘルパーメソッド
  private async getAllAnswerAnalytics(): Promise<AnswerAnalytics[]> {
    try {
      return await db.answerAnalytics.toArray();
    } catch (error) {
      console.error('Failed to get answer analytics:', error);
      return [];
    }
  }

  private async getAllSessionAnalytics(): Promise<SessionAnalytics[]> {
    try {
      return await db.sessionAnalytics.toArray();
    } catch (error) {
      console.error('Failed to get session analytics:', error);
      return [];
    }
  }

  private async getReliabilityAssessment(analyticsId: number): Promise<ReliabilityAssessment | undefined> {
    try {
      return await db.reliabilityAssessments
        .where('answerAnalyticsId')
        .equals(analyticsId)
        .first();
    } catch (error) {
      console.error('Failed to get reliability assessment:', error);
      return undefined;
    }
  }

  private async getProblemByAnalyticId(problemId: number): Promise<Problem | undefined> {
    try {
      return await db.problems.get(problemId);
    } catch (error) {
      console.error('Failed to get problem:', error);
      return undefined;
    }
  }

  private calculateOptimalSessionLength(performance: Array<{ duration: number; reliability: number }>): number {
    // パフォーマンスと時間の相関から最適時間を計算
    const durationGroups: Record<string, number[]> = {};

    performance.forEach(p => {
      const group = Math.floor(p.duration / (5 * 60 * 1000)) * 5; // 5分間隔でグループ化
      const key = group.toString();
      if (!durationGroups[key]) durationGroups[key] = [];
      durationGroups[key].push(p.reliability);
    });

    let bestDuration = 25; // デフォルト25分
    let bestScore = 0;

    Object.entries(durationGroups).forEach(([duration, scores]) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestDuration = parseInt(duration);
      }
    });

    return bestDuration;
  }

  private calculateFatigueThreshold(performance: Array<{ duration: number; reliability: number }>): number {
    // 信頼性が著しく低下し始める時間を検出
    const sortedByDuration = performance.sort((a, b) => a.duration - b.duration);

    for (let i = 1; i < sortedByDuration.length; i++) {
      const current = sortedByDuration[i];
      const previous = sortedByDuration[i - 1];

      if (current.reliability < previous.reliability * 0.7) { // 30%以上低下
        return Math.floor(current.duration / (60 * 1000)); // minutes
      }
    }

    return 45; // デフォルト45分
  }

  private calculateAvgFocusRetention(sessions: SessionAnalytics[]): number {
    if (sessions.length === 0) return 0;

    const focusRatios = sessions.map(s =>
      s.sessionDuration && s.focusedTime
        ? s.focusedTime / s.sessionDuration
        : 0
    ).filter(r => r > 0);

    return focusRatios.length > 0
      ? focusRatios.reduce((a, b) => a + b, 0) / focusRatios.length
      : 0;
  }

  private async calculateEfficiencyTrend(sessions: SessionAnalytics[]): Promise<Array<{
    date: string;
    efficiency: number;
    reliability: number;
  }>> {
    // 日別の学習効率トレンドを計算
    const dailyGroups: Record<string, SessionAnalytics[]> = {};

    sessions.forEach(session => {
      const date = session.sessionStartTime.toISOString().split('T')[0];
      if (!dailyGroups[date]) dailyGroups[date] = [];
      dailyGroups[date].push(session);
    });

    const trend = Object.entries(dailyGroups)
      .map(([date, daySessions]) => ({
        date,
        efficiency: this.calculateDayEfficiency(daySessions),
        reliability: daySessions.reduce((sum, s) => sum + s.reliabilityScore, 0) / daySessions.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return trend;
  }

  private calculateDayEfficiency(sessions: SessionAnalytics[]): number {
    // その日の学習効率を計算（時間あたりの質の高い学習量）
    const totalTime = sessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0);
    const qualityTime = sessions.reduce((sum, s) => sum + (s.focusedTime || 0), 0);

    return totalTime > 0 ? qualityTime / totalTime : 0;
  }

  private async analyzeSingleCategory(category: string, analytics: AnswerAnalytics[]): Promise<CategoryAnalysis> {
    const reliableData = [];
    let totalWeightedCorrect = 0;
    let totalWeights = 0;
    let totalResponseTime = 0;

    for (const analytic of analytics) {
      const assessment = await this.getReliabilityAssessment(analytic.id!);
      const weight = assessment?.weight || 0;

      if (weight > 0) {
        reliableData.push(analytic);
        totalWeights += weight;
        if (analytic.isCorrect) {
          totalWeightedCorrect += weight;
        }
        totalResponseTime += analytic.responseTime;
      }
    }

    const weightedAccuracy = totalWeights > 0 ? (totalWeightedCorrect / totalWeights) * 100 : 0;
    const avgResponseTime = reliableData.length > 0 ? totalResponseTime / reliableData.length : 0;

    // 改善トレンドの計算（最新50%と古い50%を比較）
    const sortedByTime = reliableData.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const midPoint = Math.floor(sortedByTime.length / 2);
    const oldData = sortedByTime.slice(0, midPoint);
    const newData = sortedByTime.slice(midPoint);

    const oldAccuracy = this.calculateAccuracy(oldData);
    const newAccuracy = this.calculateAccuracy(newData);
    const improvementTrend = newAccuracy - oldAccuracy;

    // 難易度評価（体感難易度の平均）
    const difficultyRatings = analytics
      .map(a => a.perceivedDifficulty)
      .filter(d => d !== undefined) as number[];
    const difficultyRating = difficultyRatings.length > 0
      ? difficultyRatings.reduce((a, b) => a + b, 0) / difficultyRatings.length
      : 3;

    return {
      category,
      weightedAccuracy,
      reliableAnswers: reliableData.length,
      avgResponseTime,
      improvementTrend,
      difficultyRating,
      recommendedFocus: weightedAccuracy < 70 || improvementTrend < -5 // 正答率70%未満または改善傾向-5%未満
    };
  }

  private calculateAccuracy(analytics: AnswerAnalytics[]): number {
    if (analytics.length === 0) return 0;
    const correct = analytics.filter(a => a.isCorrect).length;
    return (correct / analytics.length) * 100;
  }
}

export const analyticsStatisticsService = new AnalyticsStatisticsService();