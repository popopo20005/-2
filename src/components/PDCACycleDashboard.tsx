/**
 * PDCA Cycle Dashboard
 * Visualizes the entire A-PDCA learning cycle in a single screen.
 * Shows current phase, key metrics per phase, and action buttons.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ClipboardList, Play, BarChart3, RefreshCw,
  ChevronRight, Target, HelpCircle
} from 'lucide-react';
import { historyService, spacedRepetitionService } from '../lib/database';
import { detectTopWeaknesses } from '../services/weaknessDetectionService';
import { getUserProgress } from '../services/gamificationService';
import type { View } from '../types';

interface PDCACycleDashboardProps {
  onNavigate: (view: View, options?: any) => void;
  onBack: () => void;
  language: 'ja' | 'en';
}

interface PhaseData {
  id: 'analyze' | 'plan' | 'do' | 'check' | 'act';
  icon: typeof Search;
  label: string;
  labelEn: string;
  color: string;
  gradient: string;
  borderColor: string;
  status: 'not_started' | 'in_progress' | 'complete';
  metrics: { label: string; value: string }[];
  actionLabel: string;
  actionLabelEn: string;
  onAction: () => void;
}

const guideSteps = {
  ja: [
    { icon: '🔍', label: '分析 (Analyze)', text: '弱点分析で自分の苦手分野を把握します' },
    { icon: '📋', label: '計画 (Plan)', text: '弱点に基づいて学習プランや復習スケジュールを立てます' },
    { icon: '▶️', label: '実行 (Do)', text: 'クイズや復習を実行して問題を解きます' },
    { icon: '📊', label: '確認 (Check)', text: '統計で正答率や学習量の推移を確認します' },
    { icon: '🔄', label: '改善 (Act)', text: '結果に基づいてプランを調整し、次のサイクルへ' },
  ],
  en: [
    { icon: '🔍', label: 'Analyze', text: 'Identify your weak areas through analysis' },
    { icon: '📋', label: 'Plan', text: 'Create a study plan based on your weaknesses' },
    { icon: '▶️', label: 'Do', text: 'Practice by solving quizzes and reviews' },
    { icon: '📊', label: 'Check', text: 'Check your accuracy and progress in statistics' },
    { icon: '🔄', label: 'Act', text: 'Adjust your plan based on results and repeat' },
  ],
};

export function PDCACycleDashboard({ onNavigate, onBack, language }: PDCACycleDashboardProps) {
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadPhaseData();
  }, []);

  const loadPhaseData = async () => {
    try {
      const allHistory = await historyService.getAll();

      // These can fail individually, so wrap each
      let dueCards: any[] = [];
      try { dueCards = await spacedRepetitionService.getDueCards(100); } catch { /* ignore */ }
      let weaknesses: any[] = [];
      try { weaknesses = await detectTopWeaknesses(); } catch { /* ignore */ }
      let progress = { currentStreak: 0, level: 1 };
      try { progress = await getUserProgress(); } catch { /* ignore */ }

      // Calculate metrics
      const totalProblems = allHistory.length;
      const correctCount = allHistory.filter(h => h.isCorrect).length;
      const accuracy = totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0;

      // Today's activity
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayHistory = allHistory.filter(h => new Date(h.timestamp) >= today);
      const todayCount = todayHistory.length;

      // This week's activity
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekHistory = allHistory.filter(h => new Date(h.timestamp) >= weekAgo);
      const weekAccuracy = weekHistory.length > 0
        ? Math.round((weekHistory.filter(h => h.isCorrect).length / weekHistory.length) * 100)
        : 0;

      // Determine current recommended phase
      let recommendedPhase = 0;
      if (totalProblems === 0) {
        recommendedPhase = 0; // Analyze - no data yet
      } else if (weaknesses.length > 0 && !dueCards.length && todayCount === 0) {
        recommendedPhase = 1; // Plan - has weaknesses but no reviews due
      } else if (dueCards.length > 0 || todayCount < 5) {
        recommendedPhase = 2; // Do - has reviews or hasn't done much today
      } else if (todayCount >= 5) {
        recommendedPhase = 3; // Check - did some problems, time to review results
      } else {
        recommendedPhase = 4; // Act - time to adjust
      }
      setCurrentPhaseIndex(recommendedPhase);

      const phaseData: PhaseData[] = [
        {
          id: 'analyze',
          icon: Search,
          label: '分析',
          labelEn: 'Analyze',
          color: 'text-cyan-400',
          gradient: 'from-cyan-500/20 to-blue-500/20',
          borderColor: 'border-cyan-500/30',
          status: totalProblems > 0 ? 'complete' : 'not_started',
          metrics: [
            { label: language === 'ja' ? '総合正答率' : 'Accuracy', value: `${accuracy}%` },
            { label: language === 'ja' ? '弱点分野' : 'Weak areas', value: `${weaknesses.length}` },
          ],
          actionLabel: '弱点分析を見る',
          actionLabelEn: 'View Analysis',
          onAction: () => onNavigate('recommendations'),
        },
        {
          id: 'plan',
          icon: ClipboardList,
          label: '計画',
          labelEn: 'Plan',
          color: 'text-violet-400',
          gradient: 'from-violet-500/20 to-purple-500/20',
          borderColor: 'border-violet-500/30',
          status: 'in_progress',
          metrics: [
            { label: language === 'ja' ? '復習予定' : 'Due reviews', value: `${dueCards.length}` },
            { label: language === 'ja' ? '目標' : 'Goals', value: progress.currentStreak > 0 ? `🔥${progress.currentStreak}` : '-' },
          ],
          actionLabel: '学習プランを見る',
          actionLabelEn: 'View Plan',
          onAction: () => onNavigate('studyPlanDashboard' as View),
        },
        {
          id: 'do',
          icon: Play,
          label: '実行',
          labelEn: 'Do',
          color: 'text-green-400',
          gradient: 'from-green-500/20 to-emerald-500/20',
          borderColor: 'border-green-500/30',
          status: todayCount >= 5 ? 'complete' : todayCount > 0 ? 'in_progress' : 'not_started',
          metrics: [
            { label: language === 'ja' ? '今日の問題数' : 'Today', value: `${todayCount}` },
            { label: language === 'ja' ? '復習待ち' : 'Due', value: `${dueCards.length}` },
          ],
          actionLabel: 'クイズを始める',
          actionLabelEn: 'Start Quiz',
          onAction: () => onNavigate('quiz'),
        },
        {
          id: 'check',
          icon: BarChart3,
          label: '確認',
          labelEn: 'Check',
          color: 'text-amber-400',
          gradient: 'from-amber-500/20 to-yellow-500/20',
          borderColor: 'border-amber-500/30',
          status: todayCount > 0 ? 'in_progress' : 'not_started',
          metrics: [
            { label: language === 'ja' ? '今週の正答率' : 'Week accuracy', value: `${weekAccuracy}%` },
            { label: language === 'ja' ? '今週の問題数' : 'Week total', value: `${weekHistory.length}` },
          ],
          actionLabel: '統計を見る',
          actionLabelEn: 'View Stats',
          onAction: () => onNavigate('stats'),
        },
        {
          id: 'act',
          icon: RefreshCw,
          label: '改善',
          labelEn: 'Act',
          color: 'text-rose-400',
          gradient: 'from-rose-500/20 to-pink-500/20',
          borderColor: 'border-rose-500/30',
          status: 'not_started',
          metrics: [
            { label: language === 'ja' ? '調整提案' : 'Suggestions', value: weaknesses.length > 0 ? `${weaknesses.length}` : '-' },
            { label: language === 'ja' ? 'レベル' : 'Level', value: `Lv.${progress.level}` },
          ],
          actionLabel: 'プランを調整',
          actionLabelEn: 'Adjust Plan',
          onAction: () => onNavigate('studyPlanDashboard' as View),
        },
      ];

      setPhases(phaseData);
    } catch (error) {
      console.error('PDCA Dashboard load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
          {language === 'ja' ? '完了' : 'Done'}
        </span>;
      case 'in_progress':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
          {language === 'ja' ? '進行中' : 'Active'}
        </span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">
          {language === 'ja' ? '未着手' : 'Todo'}
        </span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  const guide = guideSteps[language];

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">
              {language === 'ja' ? 'A-PDCAサイクル' : 'A-PDCA Cycle'}
            </h1>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: showGuide ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
                color: showGuide ? '#818CF8' : '#94A3B8',
              }}
            >
              <HelpCircle className="size-4" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {language === 'ja' ? '学習サイクルの全体像' : 'Your learning cycle overview'}
          </p>
        </div>
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Usage Guide */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <p className="text-xs font-semibold text-[#818CF8] mb-3">
                {language === 'ja' ? '使い方ガイド — 5つのフェーズを順に回すことで学習効率が上がります' : 'How to Use — Rotate through 5 phases to improve learning efficiency'}
              </p>
              <div className="space-y-2">
                {guide.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0">{step.icon}</span>
                    <div>
                      <span className="text-xs font-semibold text-[#F8FAFC]">{step.label}</span>
                      <span className="text-xs text-[#CBD5E1] ml-1.5">{step.text}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#64748B] mt-3">
                {language === 'ja'
                  ? '※ 紫色でハイライトされているフェーズが現在のおすすめです。各フェーズの「>」ボタンで該当画面に移動できます。'
                  : '※ The purple-highlighted phase is recommended now. Click ">" on each phase to navigate.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Phase Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20"
      >
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Target className="size-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-purple-300/70">
              {language === 'ja' ? '今のおすすめフェーズ' : 'Recommended phase'}
            </p>
            <p className="text-sm font-bold text-white">
              {phases[currentPhaseIndex] && (language === 'ja' ? phases[currentPhaseIndex].label : phases[currentPhaseIndex].labelEn)}
            </p>
          </div>
          {phases[currentPhaseIndex] && (
            <motion.button
              onClick={phases[currentPhaseIndex].onAction}
              className="ml-auto px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-sm font-medium
                         hover:bg-purple-500/30 transition-colors flex items-center gap-1"
              whileTap={{ scale: 0.95 }}
            >
              {language === 'ja' ? '開始' : 'Go'}
              <ChevronRight className="size-4" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Phase Cards */}
      <div className="space-y-3">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isCurrent = index === currentPhaseIndex;

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`relative p-4 rounded-2xl border transition-all
                bg-gradient-to-r ${phase.gradient}
                ${isCurrent ? `${phase.borderColor} ring-1 ring-inset ring-white/5` : 'border-gray-700/50'}
              `}
            >
              {/* Connection line */}
              {index < phases.length - 1 && (
                <div className="absolute left-7 top-full w-0.5 h-3 bg-gray-700/50 z-0" />
              )}

              <div className="flex items-center gap-3">
                {/* Phase icon */}
                <div className={`size-10 rounded-xl flex items-center justify-center
                  ${isCurrent ? 'bg-white/10' : 'bg-white/5'}`}>
                  <Icon className={`size-5 ${phase.color}`} />
                </div>

                {/* Phase info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                      {language === 'ja' ? phase.label : phase.labelEn}
                    </span>
                    {getStatusBadge(phase.status)}
                  </div>
                  {/* Metrics */}
                  <div className="flex gap-4 mt-1">
                    {phase.metrics.map((m, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-gray-500">{m.label}: </span>
                        <span className={`font-semibold ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <motion.button
                  onClick={phase.onAction}
                  className={`p-2.5 rounded-xl transition-colors
                    ${isCurrent
                      ? 'bg-white/10 hover:bg-white/15 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="size-4" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Cycle complete hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center"
      >
        <p className="text-xs text-gray-500">
          {language === 'ja'
            ? 'サイクルを繰り返すことで学習効率が向上します'
            : 'Repeating the cycle improves learning efficiency'}
        </p>
      </motion.div>
    </div>
  );
}
