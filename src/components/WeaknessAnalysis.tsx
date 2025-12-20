/**
 * 弱点分析コンポーネント
 *
 * ユーザーの苦手分野を可視化し、推奨問題を提示する
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { SkeletonCard, SkeletonStatGrid, SkeletonList } from './ui/Skeleton';
import {
  generateWeaknessSummary,
  getRecommendedProblemsForWeakness,
  calculateCategoryStats,
  saveCategoryStats,
} from '../services/weaknessDetectionService';
import type { WeakArea, WeaknessSummary } from '../types/weakness';
import { TrendingDown, Target, BookOpen, RefreshCw, ChevronRight } from 'lucide-react';

interface WeaknessAnalysisProps {
  quizSetId?: number;
  onStartRecommendedQuiz?: (problemIds: number[]) => void;
  language?: 'ja' | 'en';
}

export function WeaknessAnalysis({
  quizSetId,
  onStartRecommendedQuiz,
  language = 'ja',
}: WeaknessAnalysisProps) {
  const [summary, setSummary] = useState<WeaknessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const translations = {
    ja: {
      title: '弱点分析',
      description: 'あなたの苦手分野を分析し、効果的な学習をサポートします',
      analyze: '分析を実行',
      reanalyze: '再分析',
      analyzing: '分析中...',
      overallAccuracy: '全体正解率',
      totalCategories: '学習カテゴリー数',
      improvableAreas: '改善可能な分野',
      topWeaknesses: '苦手分野トップ3',
      noWeaknesses: '弱点が見つかりませんでした',
      noWeaknessesDescription: '十分なデータがありません。もっと問題を解いてみましょう！',
      startPractice: '推奨問題を解く',
      accuracy: '正解率',
      attempts: '解答回数',
      weaknessScore: '弱点スコア',
      lastAnalyzed: '最終分析',
      error: 'エラーが発生しました',
    },
    en: {
      title: 'Weakness Analysis',
      description: 'Analyze your weak areas and support effective learning',
      analyze: 'Run Analysis',
      reanalyze: 'Re-analyze',
      analyzing: 'Analyzing...',
      overallAccuracy: 'Overall Accuracy',
      totalCategories: 'Study Categories',
      improvableAreas: 'Improvable Areas',
      topWeaknesses: 'Top 3 Weaknesses',
      noWeaknesses: 'No weaknesses found',
      noWeaknessesDescription: 'Not enough data. Try solving more problems!',
      startPractice: 'Practice Recommended',
      accuracy: 'Accuracy',
      attempts: 'Attempts',
      weaknessScore: 'Weakness Score',
      lastAnalyzed: 'Last Analyzed',
      error: 'An error occurred',
    },
  };

  const t = translations[language];

  // 初回分析
  useEffect(() => {
    loadAnalysis();
  }, [quizSetId]);

  const loadAnalysis = async () => {
    try {
      setIsLoading(true);
      const result = await generateWeaknessSummary(quizSetId);
      setSummary(result);

      // カテゴリー統計を保存
      const stats = await calculateCategoryStats(quizSetId);
      await saveCategoryStats(stats);

      console.log('[WeaknessAnalysis] 分析完了:', result);
    } catch (error) {
      console.error('[WeaknessAnalysis] 分析エラー:', error);
      toast.error(t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyze = async () => {
    setIsAnalyzing(true);
    await loadAnalysis();
    setIsAnalyzing(false);
    toast.success(language === 'ja' ? '分析が完了しました' : 'Analysis completed');
  };

  const handleStartPractice = async (category: string) => {
    try {
      const problemIds = await getRecommendedProblemsForWeakness(category, quizSetId, 10);

      if (problemIds.length === 0) {
        toast.error(
          language === 'ja'
            ? 'この分野の推奨問題が見つかりませんでした'
            : 'No recommended problems found for this category'
        );
        return;
      }

      if (onStartRecommendedQuiz) {
        onStartRecommendedQuiz(problemIds);
      }

      toast.success(
        language === 'ja'
          ? `${category}の推奨問題 ${problemIds.length}件を開始します`
          : `Starting ${problemIds.length} recommended problems for ${category}`
      );
    } catch (error) {
      console.error('[WeaknessAnalysis] 推奨問題取得エラー:', error);
      toast.error(t.error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonStatGrid count={3} />
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!summary || summary.topWeaknesses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <EmptyState
          title={t.noWeaknesses}
          description={t.noWeaknessesDescription}
          icon={Target}
          actionText={t.analyze}
          onAction={handleReanalyze}
        />
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-start"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TrendingDown className="w-8 h-8 text-red-500" />
            {t.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t.description}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {t.lastAnalyzed}: {summary.lastAnalyzedAt.toLocaleString(language)}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleReanalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? t.analyzing : t.reanalyze}
        </Button>
      </motion.div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card padding="md" hoverable className="h-full">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.overallAccuracy}</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {(summary.overallAccuracy * 100).toFixed(1)}%
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card padding="md" hoverable className="h-full">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.totalCategories}</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {summary.totalCategories}
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card padding="md" hoverable className="h-full">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.improvableAreas}</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {summary.improvableAreas}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* 苦手分野リスト */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-purple-500" />
          {t.topWeaknesses}
        </h3>

        <div className="space-y-4">
          {summary.topWeaknesses.map((weakness, index) => (
            <WeaknessCard
              key={weakness.category}
              weakness={weakness}
              rank={index + 1}
              onStartPractice={handleStartPractice}
              language={language}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface WeaknessCardProps {
  weakness: WeakArea;
  rank: number;
  onStartPractice: (category: string) => void;
  language: 'ja' | 'en';
  delay?: number;
}

function WeaknessCard({ weakness, rank, onStartPractice, language, delay = 0 }: WeaknessCardProps) {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-red-100 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300';
      case 2:
        return 'bg-orange-100 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-300';
      case 3:
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-500 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card
        padding="md"
        hoverable
        className={`border-l-4 ${getRankColor(rank)}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${getRankColor(rank)}`}>
                {rank}
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {weakness.category}
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  {language === 'ja' ? '正解率' : 'Accuracy'}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {(weakness.accuracy * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  {language === 'ja' ? '解答回数' : 'Attempts'}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {weakness.totalAttempts}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  {language === 'ja' ? '弱点スコア' : 'Weakness Score'}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {weakness.weaknessScore.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => onStartPractice(weakness.category)}
            className="ml-4 flex items-center gap-2"
          >
            {language === 'ja' ? '練習する' : 'Practice'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* プログレスバー */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weakness.accuracy * 100}%` }}
              transition={{ duration: 1, delay: delay + 0.5 }}
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
