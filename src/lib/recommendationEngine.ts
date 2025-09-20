import { analyticsStatisticsService } from './analyticsStatistics';
import { learningAnalyticsService } from './database';

export interface StudyRecommendation {
  type: 'focus_category' | 'optimal_timing' | 'session_length' | 'difficulty_adjustment' | 'review_problems';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionText: string;
  data?: any;
  estimatedImpact: number; // 1-10 scale
}

export interface LearningSchedule {
  recommendedSessionLength: number; // minutes
  optimalTimes: number[]; // hours of day
  breakIntervals: number; // minutes
  weeklyGoal: number; // problems per week
}

export interface DifficultyAdjustment {
  currentLevel: number; // 1-5
  recommendedLevel: number; // 1-5
  reason: string;
  confidence: number; // 0-1
}

export class RecommendationEngine {

  // 翻訳テキスト
  private getTranslations(_language: 'ja' | 'en' = 'ja') {
    return {
      ja: {
        highAccuracyRecommendation: '高い正答率を維持しているため、より高い難易度に挑戦することをお勧めします',
        appropriateDifficulty: '適切な難易度を維持しています',
        lowAccuracyRecommendation: '正答率が低下気味です。少し易しい問題で基礎を固めることをお勧めします',
        reviewBasicsRecommendation: '基礎的な問題から復習することをお勧めします',
        efficiencyConsidered: '（学習効率も考慮）',
        dataInsufficient: 'データ不足のため標準難易度を推薦',
        categoryStrengthening: 'の強化',
        categoryMaintenance: 'の維持',
        lowAccuracyDescription: '正答率%と低下しています。集中的な学習をお勧めします。',
        highAccuracyDescription: '正答率%と高水準です。定期的な復習で維持しましょう。',
        solveProblem: 'の問題を解く',
        solveReviewProblem: 'の復習問題を解く',
        optimalTimingNow: '今が学習の最適時間です',
        optimalTimingDescription: 'あなたのパフォーマンスが高い時間帯です。今すぐ学習を始めませんか？',
        startQuiz: 'クイズを始める',
        optimalTimingSuggestion: '最適な学習時間の提案',
        optimalTimingDescriptionLater: '時頃があなたの最適な学習時間です。その時間に学習スケジュールを設定しませんか？',
        setReminder: 'リマインダーを設定',
        sessionOptimization: 'セッション長の最適化',
        sessionOptimizationDescription: 'あなたの学習パターンから、分のセッションが最も効率的です。',
        changeSessionSettings: 'セッション設定を変更',
        shortSessionRecommendation: '短時間学習の推奨',
        shortSessionDescription: '分で集中力が低下する傾向があります。短時間集中型の学習をお勧めします。',
        tryShortSession: '短時間セッションを試す',
        reviewIncorrectProblems: '間違えた問題の復習',
        reviewIncorrectDescription: '最近間違えた問題が問あります。復習で理解を深めましょう。',
        solveReviewProblems: '復習問題を解く'
      },
      en: {
        highAccuracyRecommendation: 'You maintain high accuracy. We recommend challenging yourself with higher difficulty',
        appropriateDifficulty: 'You are maintaining an appropriate difficulty level',
        lowAccuracyRecommendation: 'Accuracy is declining. We recommend strengthening fundamentals with easier problems',
        reviewBasicsRecommendation: 'We recommend reviewing from basic problems',
        efficiencyConsidered: ' (learning efficiency considered)',
        dataInsufficient: 'Standard difficulty recommended due to insufficient data',
        categoryStrengthening: ' Strengthening',
        categoryMaintenance: ' Maintenance',
        lowAccuracyDescription: 'Accuracy is % and declining. We recommend intensive study.',
        highAccuracyDescription: 'Accuracy is % and at a high level. Maintain with regular review.',
        solveProblem: ' problems',
        solveReviewProblem: ' review problems',
        optimalTimingNow: 'Now is the optimal time for studying',
        optimalTimingDescription: 'This is your high-performance time. Why not start studying now?',
        startQuiz: 'Start Quiz',
        optimalTimingSuggestion: 'Optimal study time suggestion',
        optimalTimingDescriptionLater: ' o\'clock is your optimal study time. Would you like to set a study schedule for that time?',
        setReminder: 'Set Reminder',
        sessionOptimization: 'Session length optimization',
        sessionOptimizationDescription: 'Based on your learning patterns, minute sessions are most efficient.',
        changeSessionSettings: 'Change session settings',
        shortSessionRecommendation: 'Short session study recommendation',
        shortSessionDescription: 'Your concentration tends to decline after minutes. We recommend short, focused study sessions.',
        tryShortSession: 'Try short sessions',
        reviewIncorrectProblems: 'Review incorrect problems',
        reviewIncorrectDescription: 'You have problems you got wrong recently. Deepen understanding through review.',
        solveReviewProblems: 'Solve review problems'
      }
    };
  }

  // フェーズ3-A: パーソナライズ推薦システム
  async generatePersonalizedRecommendations(_language: 'ja' | 'en' = 'ja'): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];

    try {
      // 1. 弱点分野の特定と強化推薦
      const categoryRecommendations = await this.generateCategoryRecommendations(_language);
      recommendations.push(...categoryRecommendations);

      // 2. 最適な学習タイミング推薦
      const timingRecommendations = await this.generateTimingRecommendations(_language);
      recommendations.push(...timingRecommendations);

      // 3. セッション長の最適化推薦
      const sessionRecommendations = await this.generateSessionRecommendations(_language);
      recommendations.push(...sessionRecommendations);

      // 4. 復習タイミング推薦
      const reviewRecommendations = await this.generateReviewRecommendations(_language);
      recommendations.push(...reviewRecommendations);

      // 優先度とインパクトでソート
      return recommendations.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const priorityScore = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (priorityScore !== 0) return priorityScore;
        return b.estimatedImpact - a.estimatedImpact;
      });

    } catch (error) {
      console.error('推薦生成エラー:', error);
      return [];
    }
  }

  // フェーズ3-B: 適応的難易度調整
  async calculateAdaptiveDifficulty(language: 'ja' | 'en' = 'ja'): Promise<DifficultyAdjustment> {
    try {
      const stats = await analyticsStatisticsService.getWeightedStats();
      const patterns = await analyticsStatisticsService.analyzeLearningPatterns();
      const t = this.getTranslations(language);

      let currentLevel = 3; // デフォルト中級
      let recommendedLevel = 3;
      let reason = '';
      let confidence = 0.5;

      // 統計データに基づく難易度判定
      if (stats.reliableAnswers >= 20) { // 十分なデータがある場合
        confidence = Math.min(0.9, stats.reliableAnswers / 50);

        if (stats.weightedAccuracy >= 85) {
          recommendedLevel = Math.min(5, currentLevel + 1);
          reason = t[language].highAccuracyRecommendation;
        } else if (stats.weightedAccuracy >= 70) {
          recommendedLevel = currentLevel;
          reason = t[language].appropriateDifficulty;
        } else if (stats.weightedAccuracy >= 50) {
          recommendedLevel = Math.max(1, currentLevel - 1);
          reason = t[language].lowAccuracyRecommendation;
        } else {
          recommendedLevel = Math.max(1, currentLevel - 2);
          reason = t[language].reviewBasicsRecommendation;
        }

        // 学習効率も考慮
        const recentEfficiency = patterns.learningEfficiencyTrend.slice(-3);
        if (recentEfficiency.length > 0) {
          const avgEfficiency = recentEfficiency.reduce((sum, trend) => sum + trend.efficiency, 0) / recentEfficiency.length;
          if (avgEfficiency < 0.6) {
            recommendedLevel = Math.max(1, recommendedLevel - 1);
            reason += t[language].efficiencyConsidered;
          }
        }
      }

      return {
        currentLevel,
        recommendedLevel,
        reason,
        confidence
      };

    } catch (error) {
      console.error('難易度調整計算エラー:', error);
      const t = this.getTranslations(language);
      return {
        currentLevel: 3,
        recommendedLevel: 3,
        reason: t[language].dataInsufficient,
        confidence: 0.1
      };
    }
  }

  // フェーズ3-C: 最適学習スケジュール生成
  async generateOptimalSchedule(): Promise<LearningSchedule> {
    try {
      const patterns = await analyticsStatisticsService.analyzeLearningPatterns();
      const stats = await analyticsStatisticsService.getWeightedStats();

      // 最適セッション長（疲労閾値の80%を推奨）
      const recommendedSessionLength = Math.round(patterns.fatigueThreshold * 0.8);

      // 最適時間帯（パフォーマンスの高い時間帯）
      const optimalTimes = patterns.peakPerformanceHours.length > 0
        ? patterns.peakPerformanceHours
        : [9, 14, 19]; // デフォルト値

      // 休憩間隔（セッション長の20%）
      const breakIntervals = Math.round(recommendedSessionLength * 0.2);

      // 週間目標（現在のペースと改善目標を考慮）
      let weeklyGoal = 50; // デフォルト
      if (stats.reliableAnswers > 0) {
        const dailyAverage = stats.reliableAnswers / 7; // 仮に1週間のデータと仮定
        weeklyGoal = Math.round(dailyAverage * 7 * 1.2); // 20%向上を目標
      }

      return {
        recommendedSessionLength,
        optimalTimes,
        breakIntervals,
        weeklyGoal
      };

    } catch (error) {
      console.error('スケジュール生成エラー:', error);
      return {
        recommendedSessionLength: 25,
        optimalTimes: [9, 14, 19],
        breakIntervals: 5,
        weeklyGoal: 50
      };
    }
  }

  // プライベートヘルパーメソッド
  private async generateCategoryRecommendations(_language: 'ja' | 'en' = 'ja'): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];

    try {
      const categoryAnalysis = await analyticsStatisticsService.analyzeCategoryPerformance();

      // 要強化分野の推薦
      const weakCategories = categoryAnalysis.filter(cat => cat.recommendedFocus);

      weakCategories.slice(0, 2).forEach(category => { // 上位2つの弱点分野
        recommendations.push({
          type: 'focus_category',
          priority: 'high',
          title: `${category.category}の強化`,
          description: `正答率${category.weightedAccuracy.toFixed(1)}%と低下しています。集中的な学習をお勧めします。`,
          actionText: `${category.category}の問題を解く`,
          data: { category: category.category },
          estimatedImpact: 8
        });
      });

      // 得意分野の維持推薦
      const strongCategories = categoryAnalysis
        .filter(cat => !cat.recommendedFocus && cat.weightedAccuracy >= 80)
        .slice(0, 1);

      strongCategories.forEach(category => {
        recommendations.push({
          type: 'focus_category',
          priority: 'low',
          title: `${category.category}の維持`,
          description: `正答率${category.weightedAccuracy.toFixed(1)}%と高水準です。定期的な復習で維持しましょう。`,
          actionText: `${category.category}の復習問題を解く`,
          data: { category: category.category },
          estimatedImpact: 4
        });
      });

    } catch (error) {
      console.error('カテゴリー推薦生成エラー:', error);
    }

    return recommendations;
  }

  private async generateTimingRecommendations(_language: 'ja' | 'en' = 'ja'): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];

    try {
      const patterns = await analyticsStatisticsService.analyzeLearningPatterns();
      const currentHour = new Date().getHours();

      // 現在時刻が最適時間帯かチェック
      if (patterns.peakPerformanceHours.includes(currentHour)) {
        recommendations.push({
          type: 'optimal_timing',
          priority: 'medium',
          title: '今が学習の最適時間です',
          description: 'あなたのパフォーマンスが高い時間帯です。今すぐ学習を始めませんか？',
          actionText: 'クイズを始める',
          data: { currentHour },
          estimatedImpact: 6
        });
      } else {
        const nextOptimalHour = patterns.peakPerformanceHours
          .find(hour => hour > currentHour) || patterns.peakPerformanceHours[0];

        recommendations.push({
          type: 'optimal_timing',
          priority: 'low',
          title: '最適な学習時間の提案',
          description: `${nextOptimalHour}時頃があなたの最適な学習時間です。その時間に学習スケジュールを設定しませんか？`,
          actionText: 'リマインダーを設定',
          data: { nextOptimalHour },
          estimatedImpact: 5
        });
      }

    } catch (error) {
      console.error('タイミング推薦生成エラー:', error);
    }

    return recommendations;
  }

  private async generateSessionRecommendations(_language: 'ja' | 'en' = 'ja'): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];

    try {
      const patterns = await analyticsStatisticsService.analyzeLearningPatterns();

      // 最適セッション長の推薦
      if (patterns.optimalSessionLength !== 25) { // デフォルトと異なる場合
        recommendations.push({
          type: 'session_length',
          priority: 'medium',
          title: 'セッション長の最適化',
          description: `あなたの学習パターンから、${patterns.optimalSessionLength}分のセッションが最も効率的です。`,
          actionText: 'セッション設定を変更',
          data: { optimalLength: patterns.optimalSessionLength },
          estimatedImpact: 6
        });
      }

      // 疲労警告
      if (patterns.fatigueThreshold < 30) {
        recommendations.push({
          type: 'session_length',
          priority: 'high',
          title: '短時間学習の推奨',
          description: `${patterns.fatigueThreshold}分で集中力が低下する傾向があります。短時間集中型の学習をお勧めします。`,
          actionText: '短時間セッションを試す',
          data: { fatigueThreshold: patterns.fatigueThreshold },
          estimatedImpact: 7
        });
      }

    } catch (error) {
      console.error('セッション推薦生成エラー:', error);
    }

    return recommendations;
  }

  private async generateReviewRecommendations(_language: 'ja' | 'en' = 'ja'): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];

    try {
      // 最近間違えた問題の特定
      const recentAnalytics = await learningAnalyticsService.getRecentAnswerAnalytics(50);
      const incorrectAnswers = recentAnalytics.filter(analytics => !analytics.isCorrect);

      if (incorrectAnswers.length >= 5) {
        // 重複を除去して実際に利用可能な問題IDを取得
        const uniqueProblemIds = Array.from(new Set(incorrectAnswers.map(a => a.problemId)));
        const problemIds = uniqueProblemIds.slice(0, 15); // より多くの問題を含める

        console.log('復習問題推薦生成:', {
          totalIncorrect: incorrectAnswers.length,
          uniqueProblems: uniqueProblemIds.length,
          selectedProblems: problemIds.length,
          problemIds
        });

        recommendations.push({
          type: 'review_problems',
          priority: 'medium',
          title: '間違えた問題の復習',
          description: `最近間違えた問題が${problemIds.length}問あります。復習で理解を深めましょう。`,
          actionText: '復習問題を解く',
          data: { problemIds },
          estimatedImpact: 7
        });
      }

    } catch (error) {
      console.error('復習推薦生成エラー:', error);
    }

    return recommendations;
  }
}

export const recommendationEngine = new RecommendationEngine();