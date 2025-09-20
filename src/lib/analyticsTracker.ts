import { learningAnalyticsService } from './database';
import type { AnswerAnalytics, SessionAnalytics, ReliabilityAssessment } from '../types';

export class AnalyticsTracker {
  private sessionId: string;
  private sessionStartTime: Date;
  private currentProblemStartTime: Date | null = null;
  private currentProblemId: number | null = null;
  private answerChangeCount = 0;
  private windowFocused = true;
  private firstClickTime: number | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.sessionStartTime = new Date();
    this.setupFocusTracking();
  }

  // ウィンドウフォーカス追跡設定
  private setupFocusTracking(): void {
    window.addEventListener('focus', () => {
      this.windowFocused = true;
    });

    window.addEventListener('blur', () => {
      this.windowFocused = false;
    });

    // ページ可視性API
    document.addEventListener('visibilitychange', () => {
      this.windowFocused = !document.hidden;
    });
  }

  // 問題開始時刻記録
  startProblem(problemId: number): void {
    this.currentProblemStartTime = new Date();
    this.currentProblemId = problemId;
    this.answerChangeCount = 0;
    this.firstClickTime = null;
  }

  // 初回クリック時刻記録
  recordFirstClick(): void {
    if (this.firstClickTime === null && this.currentProblemStartTime) {
      this.firstClickTime = Date.now() - this.currentProblemStartTime.getTime();
    }
  }

  // 解答変更カウント
  recordAnswerChange(): void {
    this.answerChangeCount++;
    this.recordFirstClick(); // 初回クリックも記録
  }

  // 解答完了時の分析データ記録
  async recordAnswer(
    selectedAnswer: boolean | number,
    isCorrect: boolean,
    confidenceLevel?: 'high' | 'medium' | 'low',
    wasCasualAnswer: boolean = false,
    perceivedDifficulty?: 1 | 2 | 3 | 4 | 5
  ): Promise<number | null> {
    if (!this.currentProblemStartTime || !this.currentProblemId) {
      console.warn('Problem start time or ID not set');
      return null;
    }

    const answerSubmitTime = new Date();
    const responseTime = answerSubmitTime.getTime() - this.currentProblemStartTime.getTime();

    const analyticsData: Omit<AnswerAnalytics, 'id' | 'createdAt'> = {
      sessionId: this.sessionId,
      problemId: this.currentProblemId,
      answerStartTime: this.currentProblemStartTime,
      answerSubmitTime,
      responseTime,
      isCorrect,
      selectedAnswer,
      timeToFirstClick: this.firstClickTime || undefined,
      answerChangeCount: this.answerChangeCount,
      wasWindowFocused: this.windowFocused,
      confidenceLevel,
      wasCasualAnswer,
      perceivedDifficulty
    };

    try {
      const id = await learningAnalyticsService.recordAnswerAnalytics(analyticsData);

      // 信頼性評価を実行
      await this.assessReliability(id, analyticsData);

      return id;
    } catch (error) {
      console.error('Failed to record answer analytics:', error);
      return null;
    }
  }

  // 信頼性評価（フェーズ1-B）
  private async assessReliability(
    answerAnalyticsId: number,
    data: Omit<AnswerAnalytics, 'id' | 'createdAt'>
  ): Promise<void> {
    const flags: string[] = [];
    let reliabilityScore = 1.0;

    // 1. 極端に短い解答時間チェック
    const minReadTime = this.estimateMinimumReadTime();
    if (data.responseTime < minReadTime) {
      flags.push('too_fast');
      reliabilityScore -= 0.4;
    }

    // 2. 適当回答の自己申告チェック
    if (data.wasCasualAnswer) {
      flags.push('self_reported_casual');
      reliabilityScore -= 0.6;
    }

    // 3. ウィンドウフォーカス外チェック
    if (!data.wasWindowFocused) {
      flags.push('unfocused');
      reliabilityScore -= 0.3;
    }

    // 4. 極端に長い解答時間チェック（注意散漫の可能性）
    if (data.responseTime > 60000) { // 1分以上
      flags.push('too_slow');
      reliabilityScore -= 0.2;
    }

    // 5. 解答変更が多すぎる場合
    if (data.answerChangeCount > 3) {
      flags.push('excessive_changes');
      reliabilityScore -= 0.1;
    }

    reliabilityScore = Math.max(0, reliabilityScore); // 0以下にならないよう調整

    // 重み付け計算
    const weight = reliabilityScore >= 0.7 ? 1.0 : reliabilityScore >= 0.3 ? 0.5 : 0.0;

    const assessment: Omit<ReliabilityAssessment, 'id' | 'createdAt'> = {
      answerAnalyticsId,
      reliabilityScore,
      flags,
      weight,
      assessmentReason: this.generateAssessmentReason(flags, reliabilityScore)
    };

    await learningAnalyticsService.recordReliabilityAssessment(assessment);
  }

  // 最小読解時間推定（問題IDから問題文の長さを推定）
  private estimateMinimumReadTime(): number {
    // 基本的な最小読解時間を設定（実際は問題文の長さに基づいて調整）
    return 2000; // 2秒
  }

  // 評価理由生成
  private generateAssessmentReason(flags: string[], score: number): string {
    if (score >= 0.8) return '高信頼度: 正常な学習行動';
    if (score >= 0.5) return `中信頼度: ${flags.join(', ')}の要因により信頼性が低下`;
    return `低信頼度: ${flags.join(', ')}により統計から除外推奨`;
  }

  // セッション完了時の分析データ記録
  async recordSessionComplete(
    totalProblems: number,
    completedProblems: number,
    casualAnswerCount: number
  ): Promise<void> {
    const sessionEndTime = new Date();
    const sessionDuration = sessionEndTime.getTime() - this.sessionStartTime.getTime();

    // 時間帯判定
    const hour = sessionEndTime.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const sessionData: Omit<SessionAnalytics, 'id' | 'createdAt'> = {
      sessionId: this.sessionId,
      sessionStartTime: this.sessionStartTime,
      sessionEndTime,
      totalProblems,
      completedProblems,
      timeOfDay,
      dayOfWeek: sessionEndTime.getDay(),
      sessionDuration,
      focusedTime: sessionDuration, // 後で詳細な集中時間計算を実装
      casualAnswerCount,
      reliabilityScore: this.calculateSessionReliability(casualAnswerCount, completedProblems)
    };

    try {
      await learningAnalyticsService.recordSessionAnalytics(sessionData);
    } catch (error) {
      console.error('Failed to record session analytics:', error);
    }
  }

  // セッションの信頼性スコア計算
  private calculateSessionReliability(casualAnswerCount: number, completedProblems: number): number {
    if (completedProblems === 0) return 0;
    const casualRatio = casualAnswerCount / completedProblems;
    return Math.max(0, 1 - casualRatio * 2); // 適当回答率の2倍を信頼性から減算
  }

}

// シングルトンパターンでアクティブなトラッカーを管理
export class AnalyticsManager {
  private static activeTracker: AnalyticsTracker | null = null;

  static startSession(sessionId: string): AnalyticsTracker {
    this.activeTracker = new AnalyticsTracker(sessionId);
    return this.activeTracker;
  }

  static getActiveTracker(): AnalyticsTracker | null {
    return this.activeTracker;
  }

  static endSession(): void {
    this.activeTracker = null;
  }
}