/**
 * 目標管理コンポーネント
 *
 * 目標の作成・表示・編集・削除を行うUI
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { SkeletonCard, SkeletonStatGrid, SkeletonList } from './ui/Skeleton';
import {
  Target,
  Plus,
  Trash2,
  Check,
  X,
  Trophy,
  TrendingUp,
  Calendar,
  Flag,
  Sparkles,
} from 'lucide-react';
import {
  createGoal,
  getAllGoals,
  deleteGoal,
  calculateGoalProgress,
  getGoalSummary,
  getUnitLabel,
} from '../services/goalService';
import type { Goal, GoalProgress, GoalSummary, GoalUnit, CreateGoalInput } from '../types/goal';
import { GOAL_PRESETS } from '../types/goal';
import { notificationService } from '../services/notificationService';

interface GoalManagerProps {
  onBack: () => void;
  language?: 'ja' | 'en';
}

export function GoalManager({ onBack, language = 'ja' }: GoalManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalProgresses, setGoalProgresses] = useState<Map<number, GoalProgress>>(new Map());
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [celebratingGoal, setCelebratingGoal] = useState<Goal | null>(null);

  const translations = {
    ja: {
      title: '目標管理',
      description: '学習目標を設定して、モチベーションを維持しましょう',
      back: '← 戻る',
      createGoal: '目標を作成',
      noGoals: '目標がまだありません',
      noGoalsDescription: '新しい目標を作成して、学習計画を立てましょう！',
      summary: '目標サマリー',
      totalGoals: '総目標数',
      activeGoals: 'アクティブ',
      completedGoals: '達成済み',
      completionRate: '達成率',
      progress: '進捗',
      remaining: '残り',
      daysRemaining: '残り日数',
      deadline: '期限',
      noDeadline: '期限なし',
      onTrack: '順調',
      behindSchedule: '遅れ気味',
      completed: '達成！',
      expired: '期限切れ',
      edit: '編集',
      delete: '削除',
      cancel: 'キャンセル',
      save: '保存',
      confirmDelete: 'この目標を削除しますか？',
      status: {
        active: 'アクティブ',
        completed: '達成済み',
        expired: '期限切れ',
        abandoned: '中断',
      },
    },
    en: {
      title: 'Goal Management',
      description: 'Set learning goals to stay motivated',
      back: '← Back',
      createGoal: 'Create Goal',
      noGoals: 'No goals yet',
      noGoalsDescription: 'Create a new goal to plan your learning!',
      summary: 'Goal Summary',
      totalGoals: 'Total Goals',
      activeGoals: 'Active',
      completedGoals: 'Completed',
      completionRate: 'Completion Rate',
      progress: 'Progress',
      remaining: 'Remaining',
      daysRemaining: 'Days Left',
      deadline: 'Deadline',
      noDeadline: 'No deadline',
      onTrack: 'On track',
      behindSchedule: 'Behind',
      completed: 'Completed!',
      expired: 'Expired',
      edit: 'Edit',
      delete: 'Delete',
      cancel: 'Cancel',
      save: 'Save',
      confirmDelete: 'Delete this goal?',
      status: {
        active: 'Active',
        completed: 'Completed',
        expired: 'Expired',
        abandoned: 'Abandoned',
      },
    },
  };

  const t = translations[language];

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async (checkForNewCompletions = false) => {
    try {
      setIsLoading(true);
      const previousGoals = goals; // 前回の目標を保存
      const allGoals = await getAllGoals();
      setGoals(allGoals);

      // 各目標の進捗を計算
      const progressMap = new Map<number, GoalProgress>();
      const newlyCompletedGoals: Goal[] = [];

      for (const goal of allGoals) {
        const progress = await calculateGoalProgress(goal);
        progressMap.set(goal.id!, progress);

        // 新しく達成した目標を検出
        if (checkForNewCompletions && goal.status === 'completed') {
          const previousGoal = previousGoals.find(g => g.id === goal.id);
          if (previousGoal && previousGoal.status === 'active') {
            newlyCompletedGoals.push(goal);
          }
        }
      }
      setGoalProgresses(progressMap);

      // 新しく達成した目標があれば祝福
      if (newlyCompletedGoals.length > 0) {
        celebrateGoalCompletion(newlyCompletedGoals[0]);
      }

      // サマリーを取得
      const summaryData = await getGoalSummary();
      setSummary(summaryData);

      console.log('[GoalManager] 目標を読み込みました:', allGoals);
    } catch (error) {
      console.error('[GoalManager] 目標の読み込みに失敗:', error);
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const celebrateGoalCompletion = async (goal: Goal) => {
    // Confetti演出
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: ReturnType<typeof setInterval> = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // 達成モーダル表示
    setCelebratingGoal(goal);
    toast.success(
      language === 'ja'
        ? `🎉 目標「${goal.title}」を達成しました！`
        : `🎉 Goal "${goal.title}" completed!`
    );

    // 通知を送信 (通知が有効な場合のみ)
    try {
      const settings = await notificationService.getSettings();
      if (settings && settings.enabled && settings.goalAchievementEnabled) {
        await notificationService.sendGoalAchievementNotification(goal.id!);
        console.log('[GoalManager] 目標達成通知を送信しました:', goal.id);
      }
    } catch (error) {
      console.error('[GoalManager] 目標達成通知の送信に失敗:', error);
      // 通知失敗しても祝福は続行
    }
  };

  const handleCreateGoal = async (input: CreateGoalInput) => {
    try {
      await createGoal(input);
      toast.success(language === 'ja' ? '目標を作成しました' : 'Goal created');
      setShowCreateForm(false);
      await loadGoals();
    } catch (error) {
      console.error('[GoalManager] 目標の作成に失敗:', error);
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!window.confirm(t.confirmDelete)) {
      return;
    }

    try {
      await deleteGoal(id);
      toast.success(language === 'ja' ? '目標を削除しました' : 'Goal deleted');
      await loadGoals();
    } catch (error) {
      console.error('[GoalManager] 目標の削除に失敗:', error);
      toast.error(language === 'ja' ? 'エラーが発生しました' : 'An error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <SkeletonCard />
          <SkeletonStatGrid count={4} />
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <button
              onClick={onBack}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
            >
              {t.back}
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-500" />
              {t.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t.description}</p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t.createGoal}
          </Button>
        </motion.div>

        {/* サマリー統計 */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card padding="md">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                {t.summary}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.totalGoals}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.totalGoals}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.activeGoals}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.activeGoals}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.completedGoals}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.completedGoals}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.completionRate}</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {summary.completionRate.toFixed(0)}%
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 目標リスト */}
        {goals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <EmptyState
              title={t.noGoals}
              description={t.noGoalsDescription}
              icon={Target}
              actionText={t.createGoal}
              onAction={() => setShowCreateForm(true)}
            />
          </motion.div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal, index) => {
              const progress = goalProgresses.get(goal.id!);
              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={progress}
                  onDelete={handleDeleteGoal}
                  language={language}
                  delay={index * 0.1}
                />
              );
            })}
          </div>
        )}

        {/* 目標作成モーダル */}
        <AnimatePresence>
          {showCreateForm && (
            <GoalCreateForm
              onSubmit={handleCreateGoal}
              onCancel={() => setShowCreateForm(false)}
              language={language}
            />
          )}
        </AnimatePresence>

        {/* 目標達成モーダル */}
        <AnimatePresence>
          {celebratingGoal && (
            <GoalCelebrationModal
              goal={celebratingGoal}
              onClose={() => setCelebratingGoal(null)}
              language={language}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  progress?: GoalProgress;
  onDelete: (id: number) => void;
  language: 'ja' | 'en';
  delay?: number;
}

function GoalCard({ goal, progress, onDelete, language, delay = 0 }: GoalCardProps) {
  const t = {
    ja: {
      progress: '進捗',
      remaining: '残り',
      daysRemaining: '残り日数',
      deadline: '期限',
      noDeadline: '期限なし',
      onTrack: '順調',
      behindSchedule: '遅れ気味',
      completed: '達成！',
      expired: '期限切れ',
      delete: '削除',
      days: '日',
    },
    en: {
      progress: 'Progress',
      remaining: 'Remaining',
      daysRemaining: 'Days Left',
      deadline: 'Deadline',
      noDeadline: 'No deadline',
      onTrack: 'On track',
      behindSchedule: 'Behind',
      completed: 'Completed!',
      expired: 'Expired',
      delete: 'Delete',
      days: ' days',
    },
  };

  const trans = t[language];

  if (!progress) return null;

  const getStatusColor = () => {
    if (goal.status === 'completed') return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    if (goal.status === 'expired') return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (progress.isOnTrack) return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card padding="md" hoverable className={`border-l-4 ${getStatusColor()}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {goal.status === 'completed' && <Trophy className="w-5 h-5 text-yellow-500" />}
              {goal.status === 'active' && <Flag className="w-5 h-5 text-blue-500" />}
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{goal.title}</h3>
            </div>
            {goal.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{goal.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {goal.deadline
                  ? new Date(goal.deadline).toLocaleDateString(language)
                  : trans.noDeadline}
              </span>
              {progress.daysRemaining !== undefined && progress.daysRemaining >= 0 && (
                <span>{progress.daysRemaining}{trans.days}</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => onDelete(goal.id!)}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* 進捗バー */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{trans.progress}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {progress.progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progress.progress)}%` }}
              transition={{ duration: 1, delay: delay + 0.3 }}
              className={`h-full rounded-full ${
                goal.status === 'completed'
                  ? 'bg-green-500'
                  : goal.status === 'expired'
                  ? 'bg-red-500'
                  : progress.isOnTrack
                  ? 'bg-blue-500'
                  : 'bg-orange-500'
              }`}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {progress.goal.currentValue.toFixed(goal.unit === 'hours' || goal.unit === 'accuracy' ? 1 : 0)}
              {getUnitLabel(goal.unit, language)}
            </span>
            <span>
              {goal.targetValue.toFixed(goal.unit === 'hours' || goal.unit === 'accuracy' ? 1 : 0)}
              {getUnitLabel(goal.unit, language)}
            </span>
          </div>
        </div>

        {/* ステータスバッジ */}
        <div className="mt-3 flex items-center gap-2">
          {goal.status === 'completed' && (
            <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              {trans.completed}
            </span>
          )}
          {goal.status === 'active' && progress.isOnTrack && (
            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trans.onTrack}
            </span>
          )}
          {goal.status === 'active' && !progress.isOnTrack && (
            <span className="px-2 py-1 text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
              {trans.behindSchedule}
            </span>
          )}
          {goal.status === 'expired' && (
            <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full flex items-center gap-1">
              <X className="w-3 h-3" />
              {trans.expired}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

interface GoalCreateFormProps {
  onSubmit: (input: CreateGoalInput) => void;
  onCancel: () => void;
  language: 'ja' | 'en';
}

function GoalCreateForm({ onSubmit, onCancel, language }: GoalCreateFormProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateGoalInput>({
    type: 'short',
    title: '',
    description: '',
    targetValue: 10,
    unit: 'problems',
    deadline: undefined,
  });

  const handlePresetSelect = (index: number) => {
    const preset = GOAL_PRESETS[index];
    setSelectedPreset(index);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + preset.suggestedDeadlineDays);

    setFormData({
      type: preset.type,
      title: preset.title,
      description: preset.description,
      targetValue: preset.targetValue,
      unit: preset.unit,
      deadline,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.targetValue <= 0) {
      toast.error(language === 'ja' ? 'タイトルと目標値を入力してください' : 'Please enter title and target value');
      return;
    }
    onSubmit(formData);
  };

  const t = {
    ja: {
      createGoal: '目標を作成',
      preset: 'プリセット',
      custom: 'カスタム',
      title: 'タイトル',
      description: '説明（任意）',
      targetValue: '目標値',
      unit: '単位',
      deadline: '期限（任意）',
      cancel: 'キャンセル',
      create: '作成',
      units: {
        problems: '問題数',
        hours: '時間',
        streak: '連続日数',
        accuracy: '正解率（%）',
        quizSets: '問題セット数',
      },
    },
    en: {
      createGoal: 'Create Goal',
      preset: 'Preset',
      custom: 'Custom',
      title: 'Title',
      description: 'Description (optional)',
      targetValue: 'Target Value',
      unit: 'Unit',
      deadline: 'Deadline (optional)',
      cancel: 'Cancel',
      create: 'Create',
      units: {
        problems: 'Problems',
        hours: 'Hours',
        streak: 'Days',
        accuracy: 'Accuracy (%)',
        quizSets: 'Quiz Sets',
      },
    },
  };

  const trans = t[language];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-500" />
            {trans.createGoal}
          </h2>

          {/* プリセット選択 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{trans.preset}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {GOAL_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetSelect(index)}
                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                    selectedPreset === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{preset.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* カスタムフォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {trans.title}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                placeholder={language === 'ja' ? '例: 今週50問解く' : 'e.g., Solve 50 problems this week'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {trans.description}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {trans.targetValue}
                </label>
                <input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                  min="1"
                  step={formData.unit === 'hours' ? '0.5' : '1'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {trans.unit}
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as GoalUnit })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="problems">{trans.units.problems}</option>
                  <option value="hours">{trans.units.hours}</option>
                  <option value="streak">{trans.units.streak}</option>
                  <option value="accuracy">{trans.units.accuracy}</option>
                  <option value="quizSets">{trans.units.quizSets}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {trans.deadline}
              </label>
              <input
                type="date"
                value={formData.deadline ? formData.deadline.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value ? new Date(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
                {trans.cancel}
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                {trans.create}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface GoalCelebrationModalProps {
  goal: Goal;
  onClose: () => void;
  language: 'ja' | 'en';
}

function GoalCelebrationModal({ goal, onClose, language }: GoalCelebrationModalProps) {
  const t = {
    ja: {
      congratulations: 'おめでとうございます！',
      goalCompleted: '目標を達成しました',
      achieved: '達成した目標',
      completedAt: '達成日時',
      close: '閉じる',
      createNewGoal: '新しい目標を作成',
    },
    en: {
      congratulations: 'Congratulations!',
      goalCompleted: 'Goal Completed',
      achieved: 'Achieved Goal',
      completedAt: 'Completed At',
      close: 'Close',
      createNewGoal: 'Create New Goal',
    },
  };

  const trans = t[language];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.5, y: 50, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          {/* トロフィーアイコンとスパークル */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2, duration: 0.8 }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <Trophy className="w-20 h-20 text-yellow-500" />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 180, 270, 360],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-8 h-8 text-yellow-400" />
              </motion.div>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [360, 270, 180, 90, 0],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-2 -left-2"
              >
                <Sparkles className="w-8 h-8 text-yellow-400" />
              </motion.div>
            </div>
          </motion.div>

          {/* タイトル */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2"
          >
            {trans.congratulations}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-600 dark:text-gray-400 mb-6"
          >
            {trans.goalCompleted}
          </motion.p>

          {/* 目標情報 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 mb-6"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{trans.achieved}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{goal.title}</p>
            {goal.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{goal.description}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {trans.completedAt}: {goal.completedAt ? new Date(goal.completedAt).toLocaleString(language) : new Date().toLocaleString(language)}
            </p>
          </motion.div>

          {/* ボタン */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex gap-3"
          >
            <Button variant="primary" onClick={onClose} className="flex-1">
              {trans.close}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
