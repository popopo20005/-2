/**
 * 理解度と正解/不正解の組み合わせから確信度、適当回答、体感難易度を推定
 */

export interface EstimatedLearningState {
  confidence: 'high' | 'medium' | 'low';
  wasGuessing: boolean;
  perceivedDifficulty: 1 | 2 | 3 | 4 | 5;
  reasoning: string; // 推定理由
  reliability: number; // 推定の信頼性 (0-1)
}

export interface LearningContext {
  understood: boolean;
  isCorrect: boolean;
  responseTime?: number; // milliseconds
  averageResponseTime?: number; // ユーザーの平均回答時間
  problemDifficulty?: number; // 問題の客観的難易度 (1-5)
  recentAccuracy?: number; // 最近の正答率 (0-1)
}

export class LearningStateEstimator {

  /**
   * 理解度と正解/不正解から学習状態を推定
   */
  static estimateLearningState(context: LearningContext): EstimatedLearningState {
    const { understood, isCorrect, responseTime, averageResponseTime, problemDifficulty, recentAccuracy } = context;

    // 基本的な4パターンから推定
    let confidence: 'high' | 'medium' | 'low';
    let wasGuessing: boolean;
    let perceivedDifficulty: 1 | 2 | 3 | 4 | 5;
    let reasoning: string;
    let reliability = 0.7; // 基本信頼性

    if (understood && isCorrect) {
      // パターン1: 理解できた + 正解
      confidence = 'high';
      wasGuessing = false;
      perceivedDifficulty = (problemDifficulty || 3) as 1 | 2 | 3 | 4 | 5;
      reasoning = '理解して正解 - 高い確信度と適切な理解を示している';
      reliability = 0.9;

    } else if (understood && !isCorrect) {
      // パターン2: 理解できた + 不正解
      confidence = 'medium';
      wasGuessing = false;
      perceivedDifficulty = Math.min(5, (problemDifficulty || 3) + 1) as 1 | 2 | 3 | 4 | 5;
      reasoning = '理解したが不正解 - 考えて答えたが知識に不足がある';
      reliability = 0.8;

    } else if (!understood && isCorrect) {
      // パターン3: 理解できなかった + 正解
      confidence = 'low';
      wasGuessing = true;
      perceivedDifficulty = Math.max(1, (problemDifficulty || 3) - 1) as 1 | 2 | 3 | 4 | 5;
      reasoning = '理解せず正解 - 偶然の正解か問題が易しすぎる可能性';
      reliability = 0.6;

    } else {
      // パターン4: 理解できなかった + 不正解
      confidence = 'low';
      wasGuessing = true;
      perceivedDifficulty = Math.min(5, (problemDifficulty || 3) + 1) as 1 | 2 | 3 | 4 | 5;
      reasoning = '理解せず不正解 - 知識不足または問題が難しすぎる';
      reliability = 0.8;
    }

    // 回答時間による調整
    if (responseTime && averageResponseTime) {
      const timeRatio = responseTime / averageResponseTime;

      if (timeRatio < 0.3) {
        // 非常に早い回答
        if (understood && isCorrect) {
          confidence = 'high';
          reasoning += '（即答での正解 - 高い習熟度）';
        } else {
          wasGuessing = true;
          confidence = 'low';
          reasoning += '（即答 - 適当回答の可能性が高い）';
        }
      } else if (timeRatio > 3.0) {
        // 非常に遅い回答
        perceivedDifficulty = Math.min(5, perceivedDifficulty + 1) as 1 | 2 | 3 | 4 | 5;
        reasoning += '（長時間の思考 - 問題を難しく感じている）';
      }
    }

    // 最近の正答率による調整
    if (recentAccuracy !== undefined) {
      if (recentAccuracy < 0.3) {
        // 最近の成績が悪い場合
        confidence = confidence === 'high' ? 'medium' : 'low';
        perceivedDifficulty = Math.min(5, perceivedDifficulty + 1) as 1 | 2 | 3 | 4 | 5;
        reasoning += '（最近の成績低下を考慮）';
      } else if (recentAccuracy > 0.8) {
        // 最近の成績が良い場合
        if (understood) {
          confidence = 'high';
          perceivedDifficulty = Math.max(1, perceivedDifficulty - 1) as 1 | 2 | 3 | 4 | 5;
          reasoning += '（最近の好調を考慮）';
        }
      }
    }

    return {
      confidence,
      wasGuessing,
      perceivedDifficulty,
      reasoning,
      reliability
    };
  }

  /**
   * 複数の回答データから学習パターンを分析
   */
  static analyzeLearningPattern(states: EstimatedLearningState[]): {
    averageConfidence: number;
    guessingRate: number;
    averageDifficulty: number;
    consistencyScore: number; // 推定の一貫性
    insights: string[];
  } {
    if (states.length === 0) {
      return {
        averageConfidence: 0,
        guessingRate: 0,
        averageDifficulty: 3,
        consistencyScore: 0,
        insights: ['データが不足しています']
      };
    }

    const confidenceValues = { high: 3, medium: 2, low: 1 };
    const avgConfidence = states.reduce((sum, state) =>
      sum + confidenceValues[state.confidence], 0) / states.length;

    const guessingRate = states.filter(state => state.wasGuessing).length / states.length;

    const avgDifficulty = states.reduce((sum, state) =>
      sum + state.perceivedDifficulty, 0) / states.length;

    const avgReliability = states.reduce((sum, state) =>
      sum + state.reliability, 0) / states.length;

    const insights: string[] = [];

    if (guessingRate > 0.6) {
      insights.push('適当回答が多い - 基礎知識の定着が必要');
    }

    if (avgConfidence < 1.5) {
      insights.push('全体的に確信度が低い - 理解度向上が必要');
    }

    if (avgDifficulty > 4) {
      insights.push('問題を難しく感じている - レベルを下げることを推奨');
    } else if (avgDifficulty < 2) {
      insights.push('問題が易しすぎる - より挑戦的な問題を推奨');
    }

    if (avgReliability > 0.8) {
      insights.push('推定の信頼性が高い - データの質が良好');
    }

    return {
      averageConfidence: avgConfidence,
      guessingRate,
      averageDifficulty: avgDifficulty,
      consistencyScore: avgReliability,
      insights
    };
  }

  /**
   * 学習状態に基づく推薦生成
   */
  static generateRecommendations(analysis: ReturnType<typeof LearningStateEstimator.analyzeLearningPattern>): {
    studyApproach: string;
    difficultyAdjustment: string;
    focusAreas: string[];
  } {
    const recommendations = {
      studyApproach: '',
      difficultyAdjustment: '',
      focusAreas: [] as string[]
    };

    // 学習アプローチの推奨
    if (analysis.guessingRate > 0.5) {
      recommendations.studyApproach = '基礎知識の定着を重視した学習が必要です。解説をよく読み、理解を深めることに集中しましょう。';
    } else if (analysis.averageConfidence < 1.5) {
      recommendations.studyApproach = '理解度向上を目指し、問題解法のプロセスを意識した学習が効果的です。';
    } else {
      recommendations.studyApproach = '現在の学習ペースを維持し、より高度な問題にも挑戦してみましょう。';
    }

    // 難易度調整の推奨
    if (analysis.averageDifficulty > 4) {
      recommendations.difficultyAdjustment = '現在の問題レベルを1-2段階下げることを推奨します。';
    } else if (analysis.averageDifficulty < 2) {
      recommendations.difficultyAdjustment = 'より挑戦的な問題に取り組むことで成長が期待できます。';
    } else {
      recommendations.difficultyAdjustment = '現在の難易度が適切です。このレベルを継続しましょう。';
    }

    // 重点分野の特定
    if (analysis.guessingRate > 0.4) {
      recommendations.focusAreas.push('基礎知識の復習');
    }
    if (analysis.averageConfidence < 2) {
      recommendations.focusAreas.push('概念理解の深化');
    }
    if (analysis.consistencyScore < 0.7) {
      recommendations.focusAreas.push('学習方法の見直し');
    }

    return recommendations;
  }
}