/**
 * 弱点分析コンポーネント
 *
 * ユーザーの苦手分野を可視化し、推奨問題を提示する
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
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
      console.log('[WeaknessAnalysis] 練習開始:', category);
      toast.loading(language === 'ja' ? '推奨問題を取得中...' : 'Loading recommended problems...', { id: 'loading-problems' });

      const problemIds = await getRecommendedProblemsForWeakness(category, quizSetId, 10);
      console.log('[WeaknessAnalysis] 取得した問題IDs:', problemIds);

      toast.dismiss('loading-problems');

      if (problemIds.length === 0) {
        toast.error(
          language === 'ja'
            ? 'この分野の推奨問題が見つかりませんでした'
            : 'No recommended problems found for this category'
        );
        return;
      }

      if (onStartRecommendedQuiz) {
        console.log('[WeaknessAnalysis] クイズを開始:', problemIds);
        onStartRecommendedQuiz(problemIds);
      } else {
        console.error('[WeaknessAnalysis] onStartRecommendedQuiz コールバックがありません');
        toast.error(language === 'ja' ? 'クイズを開始できませんでした' : 'Failed to start quiz');
      }

      toast.success(
        language === 'ja'
          ? `${category}の推奨問題 ${problemIds.length}件を開始します`
          : `Starting ${problemIds.length} recommended problems for ${category}`
      );
    } catch (error) {
      console.error('[WeaknessAnalysis] 推奨問題取得エラー:', error);
      toast.dismiss('loading-problems');
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
          <h2 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <TrendingDown className="w-8 h-8 text-[#EF4444]" />
            {t.title}
          </h2>
          <p className="text-[#CBD5E1] mt-1">{t.description}</p>
          <p className="text-sm text-[#64748B] mt-1">
            {t.lastAnalyzed}: {summary.lastAnalyzedAt.toLocaleString(language)}
          </p>
        </div>
        <button
          onClick={handleReanalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[#CBD5E1] hover:bg-white/5 transition-colors disabled:opacity-50"
          style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? t.analyzing : t.reanalyze}
        </button>
      </motion.div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div
            className="rounded-2xl p-5 h-full transition-transform hover:scale-[1.02]"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-center">
              <p className="text-sm text-[#94A3B8]">{t.overallAccuracy}</p>
              <p className="text-3xl font-bold text-[#818CF8] mt-2">
                {(summary.overallAccuracy * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div
            className="rounded-2xl p-5 h-full transition-transform hover:scale-[1.02]"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-center">
              <p className="text-sm text-[#94A3B8]">{t.totalCategories}</p>
              <p className="text-3xl font-bold text-[#34D399] mt-2">
                {summary.totalCategories}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div
            className="rounded-2xl p-5 h-full transition-transform hover:scale-[1.02]"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-center">
              <p className="text-sm text-[#94A3B8]">{t.improvableAreas}</p>
              <p className="text-3xl font-bold text-[#F59E0B] mt-2">
                {summary.improvableAreas}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 苦手分野リスト */}
      <div>
        <h3 className="text-lg font-bold text-[#F8FAFC] mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#818CF8]" />
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
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          borderColor: '#EF4444',
          badgeBg: 'rgba(239,68,68,0.15)',
          badgeText: '#EF4444',
        };
      case 2:
        return {
          borderColor: '#F59E0B',
          badgeBg: 'rgba(245,158,11,0.15)',
          badgeText: '#F59E0B',
        };
      case 3:
        return {
          borderColor: '#F59E0B',
          badgeBg: 'rgba(245,158,11,0.15)',
          badgeText: '#F59E0B',
        };
      default:
        return {
          borderColor: 'rgba(255,255,255,0.1)',
          badgeBg: 'rgba(255,255,255,0.08)',
          badgeText: '#94A3B8',
        };
    }
  };

  const rankStyle = getRankStyle(rank);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div
        className="rounded-2xl p-5 transition-transform hover:scale-[1.01]"
        style={{
          background: 'rgba(30,41,59,0.7)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderLeftWidth: '4px',
          borderLeftColor: rankStyle.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ background: rankStyle.badgeBg, color: rankStyle.badgeText }}
              >
                {rank}
              </div>
              <h4 className="text-lg font-bold text-[#F8FAFC]">
                {weakness.category}
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[#94A3B8]">
                  {language === 'ja' ? '正解率' : 'Accuracy'}
                </p>
                <p className="text-lg font-semibold text-[#F8FAFC]">
                  {(weakness.accuracy * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[#94A3B8]">
                  {language === 'ja' ? '解答回数' : 'Attempts'}
                </p>
                <p className="text-lg font-semibold text-[#F8FAFC]">
                  {weakness.totalAttempts}
                </p>
              </div>
              <div>
                <p className="text-[#94A3B8]">
                  {language === 'ja' ? '弱点スコア' : 'Weakness Score'}
                </p>
                <p className="text-lg font-semibold text-[#F8FAFC]">
                  {weakness.weaknessScore.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onStartPractice(weakness.category)}
            className="ml-4 flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-colors bg-[#6366F1] hover:bg-[#5558E6]"
          >
            {language === 'ja' ? '練習する' : 'Practice'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* プログレスバー */}
        <div className="mt-4">
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weakness.accuracy * 100}%` }}
              transition={{ duration: 1, delay: delay + 0.5 }}
              className="h-full"
              style={{ background: 'linear-gradient(to right, #EF4444, #F59E0B, #10B981)' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
