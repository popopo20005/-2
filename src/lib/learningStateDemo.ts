import { LearningStateEstimator } from './learningStateEstimator';

/**
 * 学習状態推定システムのデモンストレーション
 */
export function demonstrateLearningStateEstimation() {
  console.log('=== 学習状態推定システム デモ ===\n');

  // テストケース1: 理解できた + 正解
  const case1 = LearningStateEstimator.estimateLearningState({
    understood: true,
    isCorrect: true,
    responseTime: 15000,
    averageResponseTime: 20000
  });
  console.log('ケース1 (理解できた + 正解):', case1);

  // テストケース2: 理解できた + 不正解
  const case2 = LearningStateEstimator.estimateLearningState({
    understood: true,
    isCorrect: false,
    responseTime: 45000,
    averageResponseTime: 20000
  });
  console.log('ケース2 (理解できた + 不正解):', case2);

  // テストケース3: 理解できなかった + 正解
  const case3 = LearningStateEstimator.estimateLearningState({
    understood: false,
    isCorrect: true,
    responseTime: 5000,
    averageResponseTime: 20000
  });
  console.log('ケース3 (理解できなかった + 正解):', case3);

  // テストケース4: 理解できなかった + 不正解
  const case4 = LearningStateEstimator.estimateLearningState({
    understood: false,
    isCorrect: false,
    responseTime: 60000,
    averageResponseTime: 20000,
    recentAccuracy: 0.2
  });
  console.log('ケース4 (理解できなかった + 不正解):', case4);

  // 学習パターン分析のデモ
  const states = [case1, case2, case3, case4];
  const analysis = LearningStateEstimator.analyzeLearningPattern(states);
  console.log('\n学習パターン分析:', analysis);

  // 推薦生成のデモ
  const recommendations = LearningStateEstimator.generateRecommendations(analysis);
  console.log('\n学習推薦:', recommendations);

  return { cases: [case1, case2, case3, case4], analysis, recommendations };
}