/**
 * StudyPlanDashboard - 学習プラン一覧とダッシュボード
 *
 * アクティブなプラン概要・今日のタスク・プラン一覧を表示し、
 * プラン作成・削除・完了操作を提供します。
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studyPlanService, dailyGoalService, planAdjustmentService, problemService, milestoneService } from '../lib/database';
import { recalculatePlanProgress } from '../services/studyPlanGenerator';
import { performWeeklyRebalance } from '../services/pdcaAdjustmentService';
import { applyAdjustment, rejectAdjustment, getTriggerIcon } from '../services/planAdjustmentService';
import type { StudyPlan, DailyGoal, Milestone, PlanAdjustmentRecord } from '../types/studyPlan';
import { TodayTasksCard } from './TodayTasksCard';
import { getExamGrowthSummary } from '../services/subtopicAnalysisService';
import type { GrowthStatus } from '../services/subtopicAnalysisService';

// ============================================================
// 国際化テキスト
// ============================================================

const t = {
  ja: {
    back: '← 戻る',
    title: '学習プラン',
    todayTasks: '今日のタスク',
    noTasksToday: '今日の学習タスクはありません',
    totalProblems: '問題',
    estimatedTime: '見積もり時間',
    minutes: '分',
    allPlans: '全プラン',
    createPlan: '新規作成',
    noPlanYet: 'まだプランがありません',
    noPlanDesc: '学習プラン作成画面へのボタンをクリックして、最初のプランを作成してください',
    examDate: '試験日',
    studyDays: '学習日',
    days: '日',
    progress: '進捗',
    problems: '問題',
    active: 'アクティブ',
    completed: '完了',
    paused: '一時停止',
    markCompleted: '完了にする',
    resume: '再開',
    pause: '一時停止',
    delete: '削除',
    confirmDelete: 'このプランを削除しますか？関連する全日次目標も削除されます',
    riskLow: '順調',
    riskMedium: '注意',
    riskHigh: '危険',
    riskCritical: '緊急',
    onTrack: '計画通り',
    behind: '遅延中',
    targetScore: '目標',
    points: '点',
    problemsPerDay: '日/問題',
    viewDetail: '詳細を見る',
    planDetail: 'プラン詳細',
    close: '閉じる',
    targetCategories: '対象カテゴリー',
    dailySchedule: '日次スケジュール',
    newProblems: '新規',
    reviewProblems: '復習',
    noDailyGoals: '日次目標が生成されていません',
    categoryAllocation: 'カテゴリー配分',
    studyConfig: '学習設定',
    timePerDay: '1日の学習時間',
    studyDaysLabel: '学習曜日',
    dayShort: ['日', '月', '火', '水', '木', '金', '土'] as string[],
    includeReview: 'SM-2復習を含める',
    yes: 'はい',
    no: 'いいえ',
    scheduled: '予定',
    done: '完了',
    weaknessFocus: '弱点強化',
    subtopicGrowth: 'サブトピック分析',
    noSubtopicData: 'まだ分析データがありません',
    adjustmentTitle: 'プラン調整の提案があります',
    adjustmentCount: '件',
    approve: '承認',
    reject: '却下',
    adjustmentApplied: '調整を適用しました',
    adjustmentRejected: '調整を却下しました',
    edit: '編集',
    editPlan: 'プラン編集',
    planName: 'プラン名',
    save: '保存',
    cancel: 'キャンセル',
    dailyTime: '1日の学習時間（分）',
    editExamDate: '試験日',
    editTargetScore: '目標点数',
    editStudyDays: '学習曜日',
    editCategories: '対象カテゴリー',
    addCategory: 'カテゴリーを追加',
    noCategoriesAvailable: '利用可能なカテゴリーがありません',
  },
  en: {
    back: '← Back',
    title: 'Study Plans',
    todayTasks: "Today's Tasks",
    noTasksToday: 'No study tasks for today',
    totalProblems: 'Problems',
    estimatedTime: 'Est. Time',
    minutes: 'min',
    allPlans: 'All Plans',
    createPlan: 'New Plan',
    noPlanYet: 'No plans yet',
    noPlanDesc: 'Click the create button to set up your first study plan',
    examDate: 'Exam Date',
    studyDays: 'Study Days',
    days: 'days',
    progress: 'Progress',
    problems: 'Problems',
    active: 'Active',
    completed: 'Completed',
    paused: 'Paused',
    markCompleted: 'Mark Complete',
    resume: 'Resume',
    pause: 'Pause',
    delete: 'Delete',
    confirmDelete: 'Delete this plan? All related daily goals will also be removed',
    riskLow: 'On Track',
    riskMedium: 'Warning',
    riskHigh: 'High Risk',
    riskCritical: 'Critical',
    onTrack: 'On Track',
    behind: 'Behind',
    targetScore: 'Target',
    points: 'pts',
    problemsPerDay: 'day/problems',
    viewDetail: 'View Details',
    planDetail: 'Plan Details',
    close: 'Close',
    targetCategories: 'Target Categories',
    dailySchedule: 'Daily Schedule',
    newProblems: 'New',
    reviewProblems: 'Review',
    noDailyGoals: 'No daily goals generated',
    categoryAllocation: 'Category Allocation',
    studyConfig: 'Study Config',
    timePerDay: 'Study Time / Day',
    studyDaysLabel: 'Study Days',
    dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as string[],
    includeReview: 'Include SM-2 Review',
    yes: 'Yes',
    no: 'No',
    scheduled: 'Scheduled',
    done: 'Done',
    weaknessFocus: 'Weakness',
    subtopicGrowth: 'Subtopic Analysis',
    noSubtopicData: 'No analysis data yet',
    adjustmentTitle: 'Plan adjustments available',
    adjustmentCount: '',
    approve: 'Approve',
    reject: 'Reject',
    adjustmentApplied: 'Adjustment applied',
    adjustmentRejected: 'Adjustment rejected',
    edit: 'Edit',
    editPlan: 'Edit Plan',
    planName: 'Plan Name',
    save: 'Save',
    cancel: 'Cancel',
    dailyTime: 'Daily Study Time (min)',
    editExamDate: 'Exam Date',
    editTargetScore: 'Target Score',
    editStudyDays: 'Study Days',
    editCategories: 'Target Categories',
    addCategory: 'Add Category',
    noCategoriesAvailable: 'No categories available',
  },
};

type Lang = 'ja' | 'en';

// ============================================================
// Props
// ============================================================

interface StudyPlanDashboardProps {
  onBack: () => void;
  onCreatePlan: () => void;
  onNavigateToQuiz?: (sessionId: string) => void;
  language?: Lang;
}

// ============================================================
// リスクバッジ
// ============================================================

function RiskBadge({ level, lang }: { level: string; lang: Lang }) {
  const text = t[lang];
  const styles: Record<string, { bg: string; text: string }> = {
    low: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
    medium: { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24' },
    high: { bg: 'rgba(249,115,22,0.15)', text: '#FB923C' },
    critical: { bg: 'rgba(239,68,68,0.15)', text: '#F87171' },
  };
  const labels: Record<string, string> = {
    low: text.riskLow,
    medium: text.riskMedium,
    high: text.riskHigh,
    critical: text.riskCritical,
  };
  const s = styles[level] || styles.low;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      {labels[level] || level}
    </span>
  );
}

// ============================================================
// ステータスバッジ
// ============================================================

function StatusBadge({ plan, lang }: { plan: StudyPlan; lang: Lang }) {
  const text = t[lang];
  if (plan.isCompleted) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}
      >
        {text.completed}
      </span>
    );
  }
  if (plan.isPaused) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
      >
        {text.paused}
      </span>
    );
  }
  if (plan.isActive) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
      >
        {text.active}
      </span>
    );
  }
  return null;
}

// ============================================================
// 今日のタスクカード（新しいTodayTasksCardを使用）
// ============================================================
// 旧TodayTaskCardコンポーネントは削除し、新しいTodayTasksCardを使用

// ============================================================
// プランカード
// ============================================================

// ============================================================
// プラン編集モーダル
// ============================================================

function PlanEditModal({ plan, onSave, onClose, lang }: {
  plan: StudyPlan;
  onSave: (updates: Partial<StudyPlan>) => void;
  onClose: () => void;
  lang: Lang;
}) {
  const text = t[lang];
  const [name, setName] = useState(plan.name);
  const [examDate, setExamDate] = useState(
    new Date(plan.examDate).toISOString().split('T')[0]
  );
  const [targetScore, setTargetScore] = useState(plan.targetScore ?? 80);
  const [availableTime, setAvailableTime] = useState(plan.availableTimePerDay);
  const [studyDays, setStudyDays] = useState<number[]>(plan.studyDaysOfWeek || [1, 2, 3, 4, 5]);
  const [categories, setCategories] = useState<string[]>(plan.targetCategories || []);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // DBから利用可能なカテゴリ一覧を取得
  useEffect(() => {
    (async () => {
      try {
        const allProblems = await problemService.getAll();
        const cats = new Set<string>();
        allProblems.forEach(p => {
          if (p.category) cats.add(p.category);
        });
        setAvailableCategories(Array.from(cats).sort());
      } catch (e) {
        console.error('[PlanEditModal] カテゴリ取得エラー:', e);
      }
    })();
  }, []);

  const toggleDay = (day: number) => {
    setStudyDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = () => {
    onSave({
      name,
      examDate: new Date(examDate),
      targetScore,
      availableTimePerDay: availableTime,
      studyDaysOfWeek: studyDays,
      targetCategories: categories,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6"
        style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[#F8FAFC] mb-4">{text.editPlan}</h2>
        <div className="space-y-4">
          {/* プラン名 */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{text.planName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-[#F8FAFC]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* 試験日 */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{text.editExamDate}</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-[#F8FAFC]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </div>

          {/* 目標点数 / 学習時間 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{text.editTargetScore}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm text-[#F8FAFC]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{text.dailyTime}</label>
              <input
                type="number"
                min={5}
                max={480}
                value={availableTime}
                onChange={(e) => setAvailableTime(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm text-[#F8FAFC]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* 学習曜日 */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{text.editStudyDays}</label>
            <div className="flex gap-1.5">
              {text.dayShort.map((dayLabel, idx) => {
                const isActive = studyDays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#6366F1] text-white shadow-sm'
                        : 'text-[#94A3B8] hover:bg-white/5'
                    }`}
                    style={!isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}
                  >
                    {dayLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 対象カテゴリー */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1">{text.editCategories}</label>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {categories.map(cat => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="text-[#818CF8] hover:text-[#EF4444] ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] mb-2">
                {text.noCategoriesAvailable}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="text-xs text-[#818CF8] hover:text-[#A5B4FC] font-medium"
            >
              {showCategoryPicker ? text.cancel : `+ ${text.addCategory}`}
            </button>
            {showCategoryPicker && (
              <div
                className="mt-2 max-h-36 overflow-y-auto rounded-lg p-2 space-y-1"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
              >
                {availableCategories.filter(c => !categories.includes(c)).length === 0 ? (
                  <p className="text-xs text-[#64748B] text-center py-2">
                    {lang === 'ja' ? '追加可能なカテゴリーはありません' : 'No more categories to add'}
                  </p>
                ) : (
                  availableCategories.filter(c => !categories.includes(c)).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { toggleCategory(cat); }}
                      className="w-full text-left px-3 py-1.5 rounded-md text-sm text-[#CBD5E1] hover:bg-white/5 transition-colors"
                    >
                      + {cat}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 mt-6 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-[#CBD5E1]"
          >
            {text.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-xl transition-colors"
          >
            {text.save}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// プランカード
// ============================================================

function PlanCard({ plan, milestones, onComplete, onPause, onDelete, onViewDetail, onEdit, onRebalance, lang }: {
  plan: StudyPlan;
  milestones: Milestone[];
  onComplete: () => void;
  onPause: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  onEdit: () => void;
  onRebalance: () => void;
  lang: Lang;
}) {
  const text = t[lang];
  const progress = plan.progress;
  const progressPercent = Math.round(progress.progressPercentage);

  // 試験日までの残り日数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  const remainingDays = Math.max(0, Math.ceil((new Date(plan.examDate).getTime() - today.getTime()) / msPerDay));

  // ProgressBar色
  const barColor =
    progressPercent >= 80 ? '#10B981' :
    progressPercent >= 50 ? '#6366F1' :
    progressPercent >= 30 ? '#F59E0B' : '#EF4444';

  return (
    <div
      className="rounded-2xl p-4 transition-colors"
      style={{
        background: 'rgba(30,41,59,0.7)',
        border: plan.isCompleted
          ? '1px solid rgba(16,185,129,0.3)'
          : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#F8FAFC] truncate">{plan.name}</h3>
            <StatusBadge plan={plan} lang={lang} />
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            {text.examDate}: {new Date(plan.examDate).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' })}
            {' · '}
            {text.targetScore} {plan.targetScore}{text.points}
          </p>
        </div>
        {!plan.isCompleted && (
          <RiskBadge level={progress.riskLevel} lang={lang} />
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#94A3B8]">{text.progress}</span>
          <span className="text-xs font-semibold text-[#F8FAFC]">{progressPercent}%</span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, background: barColor }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-xs mb-3">
        <div>
          <span className="text-[#94A3B8]">{text.studyDays}: </span>
          <span className="font-medium text-[#F8FAFC]">{progress.completedDays}/{progress.totalDays}</span>
        </div>
        <div>
          <span className="text-[#94A3B8]">{text.problems}: </span>
          <span className="font-medium text-[#F8FAFC]">{progress.completedProblems}/{progress.totalProblemsTarget}</span>
        </div>
        <div>
          <span className="text-[#94A3B8]">残り: </span>
          <span className={`font-medium ${remainingDays <= 3 ? 'text-[#EF4444]' : 'text-[#F8FAFC]'}`}>
            {remainingDays}{text.days}
          </span>
        </div>
      </div>

      {/* Goal Achievement */}
      {plan.targetScore != null && plan.targetScore > 0 && (
        <div
          className="mb-3 p-2 rounded-lg"
          style={{ background: 'rgba(99,102,241,0.1)' }}
        >
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#818CF8]">
              {lang === 'ja' ? '目標到達度' : 'Goal Progress'}: {Math.round(progress.averageAccuracy)}% → {plan.targetScore}{text.points}
            </span>
            <span className="font-semibold text-[#A5B4FC]">
              {Math.min(100, Math.round((progress.averageAccuracy / plan.targetScore) * 100))}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (progress.averageAccuracy / plan.targetScore) * 100)}%`, background: '#818CF8' }}
            />
          </div>
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-[#94A3B8] mb-1.5">
            {lang === 'ja' ? 'マイルストーン' : 'Milestones'}
          </p>
          <div className="flex gap-1">
            {milestones.map((ms, i) => {
              const phaseLabel = ms.phase === 'early' ? (lang === 'ja' ? '序盤' : 'Early')
                : ms.phase === 'mid' ? (lang === 'ja' ? '中盤' : 'Mid')
                : (lang === 'ja' ? '試験日' : 'Exam');
              const isPast = new Date(ms.targetDate) < new Date();
              const bgStyle = ms.isAchieved
                ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }
                : isPast
                ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' };
              return (
                <div key={i} className="flex-1 p-1.5 rounded-lg text-center" style={bgStyle}>
                  <div className="text-[10px] font-medium text-[#94A3B8]">{phaseLabel}</div>
                  <div className="text-xs font-bold text-[#F8FAFC]">
                    {ms.isAchieved ? '✓' : `${ms.targetScore}${lang === 'ja' ? '点' : 'pt'}`}
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    {new Date(ms.targetDate).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Warning */}
      {plan.timeWarning && (
        <div
          className="mb-3 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <p className="text-xs text-[#FBBF24]">⚠️ {plan.timeWarning}</p>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-2 pt-2 flex-wrap"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={onViewDetail}
          className="text-xs text-[#818CF8] hover:text-[#A5B4FC] font-semibold"
        >
          {text.viewDetail} →
        </button>
        {!plan.isCompleted && (
          <>
            <span className="text-[#64748B]">|</span>
            <button
              onClick={onEdit}
              className="text-xs text-[#818CF8] hover:text-[#A5B4FC] font-medium"
            >
              {text.edit}
            </button>
            <button
              onClick={onRebalance}
              className="text-xs text-[#A78BFA] hover:text-[#C4B5FD] font-medium"
            >
              {lang === 'ja' ? 'プランを見直す' : 'Rebalance'}
            </button>
            <button
              onClick={onComplete}
              className="text-xs text-[#34D399] hover:text-[#6EE7B7] font-medium"
            >
              {text.markCompleted}
            </button>
            <button
              onClick={onPause}
              className="text-xs text-[#94A3B8] hover:text-[#CBD5E1] font-medium"
            >
              {plan.isPaused ? text.resume : text.pause}
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-[#EF4444] hover:text-[#F87171] font-medium ml-auto"
            >
              {text.delete}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// プラン詳細モーダル
// ============================================================

function PlanDetailModal({ plan, onClose, lang }: {
  plan: StudyPlan;
  onClose: () => void;
  lang: Lang;
}) {
  const text = t[lang];
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [growthStatuses, setGrowthStatuses] = useState<GrowthStatus[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        if (plan.id) {
          const result = await dailyGoalService.getByPlanId(plan.id);
          setGoals(result);
        }
        // サブトピック成長データの読み込み
        if (plan.importancePresetId) {
          const statuses = await getExamGrowthSummary(plan.importancePresetId);
          setGrowthStatuses(statuses);
        }
      } catch (e) {
        console.error('[PlanDetailModal] 日次目標の取得に失敗:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [plan.id, plan.importancePresetId]);

  // ESCキーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const studyDayGoals = goals.filter((g) => g.isStudyDay);
  const completedDays = studyDayGoals.filter((g) => g.isCompleted).length;
  const progressPercent = Math.round(plan.progress.progressPercentage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[999998] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full max-w-2xl my-8 shadow-2xl overflow-hidden"
        style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-80">{text.planDetail}</p>
            <h2 className="text-lg font-bold truncate">{plan.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-xl leading-none"
            aria-label={text.close}
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
          {/* 基本情報 */}
          <section>
            <h3 className="text-sm font-semibold text-[#CBD5E1] mb-2">
              {lang === 'ja' ? '基本情報' : 'Basic Info'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs text-[#94A3B8]">{text.examDate}</p>
                <p className="font-semibold text-[#F8FAFC]">
                  {new Date(plan.examDate).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs text-[#94A3B8]">{text.targetScore}</p>
                <p className="font-semibold text-[#F8FAFC]">
                  {plan.targetScore ?? '-'}{text.points}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs text-[#94A3B8]">{text.progress}</p>
                <p className="font-semibold text-[#F8FAFC]">{progressPercent}%</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs text-[#94A3B8]">{text.studyDays}</p>
                <p className="font-semibold text-[#F8FAFC]">
                  {completedDays}/{studyDayGoals.length}
                </p>
              </div>
            </div>
          </section>

          {/* 対象カテゴリー */}
          <section>
            <h3 className="text-sm font-semibold text-[#CBD5E1] mb-2">
              {text.targetCategories}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {plan.targetCategories.length === 0 ? (
                <span className="text-xs text-[#94A3B8]">-</span>
              ) : (
                plan.targetCategories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2.5 py-1 text-xs rounded-full font-medium"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                  >
                    {cat}
                  </span>
                ))
              )}
            </div>
          </section>

          {/* サブトピック成長サマリー */}
          {growthStatuses.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[#CBD5E1] mb-2">
                {text.subtopicGrowth}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {growthStatuses.map((status) => (
                  <span
                    key={status.category}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(139,92,246,0.1)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.2)' }}
                    title={`${status.sessionCount} sessions, ${status.totalProblems} problems`}
                  >
                    <span>{status.growthEmoji}</span>
                    <span className="truncate max-w-[80px]">{status.category}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 学習設定 */}
          <section>
            <h3 className="text-sm font-semibold text-[#CBD5E1] mb-2">
              {text.studyConfig}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">{text.timePerDay}</span>
                <span className="font-medium text-[#F8FAFC]">
                  {plan.availableTimePerDay} {text.minutes}
                </span>
              </div>
              <div className="flex justify-between items-start gap-3">
                <span className="text-[#94A3B8]">{text.studyDaysLabel}</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const active = plan.studyDaysOfWeek.includes(d);
                    return (
                      <span
                        key={d}
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium ${
                          active
                            ? 'bg-[#6366F1] text-white'
                            : 'text-[#64748B]'
                        }`}
                        style={!active ? { background: 'rgba(255,255,255,0.06)' } : undefined}
                      >
                        {text.dayShort[d]}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">{text.includeReview}</span>
                <span className="font-medium text-[#F8FAFC]">
                  {plan.includeSpacedRepetition ? text.yes : text.no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">{text.weaknessFocus}</span>
                <span className="font-medium text-[#F8FAFC]">
                  {plan.prioritizeWeakness ? text.yes : text.no}
                </span>
              </div>
            </div>
          </section>

          {/* 日次スケジュール */}
          <section>
            <h3 className="text-sm font-semibold text-[#CBD5E1] mb-2">
              {text.dailySchedule}
              {studyDayGoals.length > 0 && (
                <span className="ml-2 text-xs text-[#64748B] font-normal">
                  ({studyDayGoals.length}{lang === 'ja' ? '日' : ' days'})
                </span>
              )}
            </h3>
            {isLoading ? (
              <div className="py-4 text-center text-xs text-[#94A3B8]">
                {lang === 'ja' ? '読み込み中...' : 'Loading...'}
              </div>
            ) : studyDayGoals.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#94A3B8]">
                {text.noDailyGoals}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {studyDayGoals.map((g) => {
                  const dateStr = new Date(g.date).toLocaleDateString(
                    lang === 'ja' ? 'ja-JP' : 'en-US',
                    { month: 'short', day: 'numeric', weekday: 'short' }
                  );
                  return (
                    <div
                      key={g.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                      style={{
                        background: g.isCompleted ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                        border: g.isCompleted
                          ? '1px solid rgba(16,185,129,0.2)'
                          : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="w-16 font-medium text-[#CBD5E1]">
                        Day {g.dayNumber}
                      </div>
                      <div className="w-24 text-[#94A3B8]">{dateStr}</div>
                      <div className="flex-1 text-[#CBD5E1]">
                        {text.newProblems} {g.newProblemsTarget}
                        <span className="mx-1 text-[#64748B]">·</span>
                        {text.reviewProblems} {g.reviewProblemsTarget}
                        <span className="mx-1 text-[#64748B]">·</span>
                        {g.estimatedTime}
                        {text.minutes}
                      </div>
                      <div
                        className="px-2 py-0.5 rounded-full font-medium text-[10px]"
                        style={
                          g.isCompleted
                            ? { background: '#10B981', color: 'white' }
                            : { background: 'rgba(255,255,255,0.08)', color: '#CBD5E1' }
                        }
                      >
                        {g.isCompleted ? text.done : text.scheduled}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 説明・メモ */}
          {(plan.description || plan.notes) && (
            <section>
              <h3 className="text-sm font-semibold text-[#CBD5E1] mb-2">
                {lang === 'ja' ? 'メモ' : 'Notes'}
              </h3>
              {plan.description && (
                <p className="text-sm text-[#CBD5E1] whitespace-pre-wrap mb-2">
                  {plan.description}
                </p>
              )}
              {plan.notes && (
                <p className="text-xs text-[#94A3B8] whitespace-pre-wrap">
                  {plan.notes}
                </p>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 px-5 py-3 flex justify-end"
          style={{ background: 'rgba(15,23,42,0.8)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="bg-[#6366F1] hover:bg-[#5558E6] text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
          >
            {text.close}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================

export function StudyPlanDashboard({ onBack, onCreatePlan, onNavigateToQuiz, language }: StudyPlanDashboardProps) {
  const lang: Lang = language || 'ja';
  const text = t[lang];

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailPlan, setDetailPlan] = useState<StudyPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);
  const [pendingAdjustments, setPendingAdjustments] = useState<PlanAdjustmentRecord[]>([]);
  const [milestonesMap, setMilestonesMap] = useState<Record<number, Milestone[]>>({});

  // --- Load data ---
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 全プラン取得
      const allPlans = await studyPlanService.getAll();
      setPlans(allPlans);

      // 今日のタスク取得

      // アクティブなプランの進捗を再計算
      for (const plan of allPlans) {
        if (plan.isActive && !plan.isCompleted && plan.id) {
          await recalculatePlanProgress(plan.id);
        }
      }

      // 再取得（進捗更新後）
      const updatedPlans = await studyPlanService.getAll();
      setPlans(updatedPlans);

      // マイルストーン取得
      const msMap: Record<number, Milestone[]> = {};
      for (const plan of updatedPlans) {
        if (plan.id) {
          try {
            msMap[plan.id] = await milestoneService.getByPlanId(plan.id);
          } catch { msMap[plan.id] = []; }
        }
      }
      setMilestonesMap(msMap);

      // pending調整を取得
      const pending = await planAdjustmentService.getAllPending();
      setPendingAdjustments(pending);

      // TodayTasksCard に強制再読み込みを通知（キャッシュバイパス）
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error('ダッシュボード読み込みエラー:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Actions ---
  const handleComplete = async (planId: number) => {
    await studyPlanService.markCompleted(planId);
    await loadData();
  };

  const handlePause = async (plan: StudyPlan) => {
    await studyPlanService.setPaused(plan.id!, !plan.isPaused);
    await loadData();
  };

  const handleDelete = async (planId: number) => {
    await studyPlanService.delete(planId);
    setConfirmDeleteId(null);
    await loadData();
  };

  const handleApproveAdjustment = async (recordId: number) => {
    await applyAdjustment(recordId);
    await loadData();
  };

  const handleRejectAdjustment = async (recordId: number) => {
    await rejectAdjustment(recordId);
    setPendingAdjustments(prev => prev.filter(a => a.id !== recordId));
  };

  const handleEditSave = async (updates: Partial<StudyPlan>) => {
    if (editingPlan?.id) {
      await studyPlanService.update(editingPlan.id, updates);
      setEditingPlan(null);
      await loadData();
    }
  };

  const handleRebalance = async (planId: number) => {
    const confirmMsg = lang === 'ja'
      ? '学習実績に基づいてプランを再構築します。未来の学習計画が更新されます。よろしいですか？'
      : 'Rebalance the plan based on your learning progress? Future daily goals will be regenerated.';
    if (!confirm(confirmMsg)) return;

    try {
      const result = await performWeeklyRebalance(planId);
      const successMsg = lang === 'ja'
        ? `プランを見直しました！\n${result.summary}`
        : `Plan rebalanced!\n${result.summary}`;
      alert(successMsg);
      await loadData();
    } catch (error) {
      console.error('Rebalance error:', error);
      alert(lang === 'ja' ? 'リバランスに失敗しました' : 'Rebalance failed');
    }
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="min-h-screen p-4" style={{ background: '#0F172A' }}>
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <div className="h-8 rounded animate-pulse w-1/3" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-32 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-48 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen p-4" style={{ background: '#0F172A' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <button
              onClick={onBack}
              className="text-[#94A3B8] hover:text-[#CBD5E1] mb-1 text-sm"
            >
              {text.back}
            </button>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">{text.title}</h1>
          </div>
          <button
            onClick={onCreatePlan}
            className="bg-[#6366F1] hover:bg-[#5558E6] text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            {text.createPlan}
          </button>
        </motion.div>

        {/* Today's Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <TodayTasksCard
            onStartStudy={onNavigateToQuiz}
            onRecreatePlan={onCreatePlan}
            refreshKey={refreshKey}
          />
        </motion.div>

        {/* Adjustment Banner */}
        {pendingAdjustments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4 rounded-2xl p-4"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">&#x26A0;&#xFE0F;</span>
              <h3 className="text-sm font-semibold text-[#FBBF24]">
                {text.adjustmentTitle} ({pendingAdjustments.length}{text.adjustmentCount})
              </h3>
            </div>
            <div className="space-y-3">
              {pendingAdjustments.map((adj) => {
                const planName = plans.find(p => p.id === adj.planId)?.name || '';
                return (
                  <div
                    key={adj.id}
                    className="rounded-lg p-3"
                    style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(245,158,11,0.15)' }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">{getTriggerIcon(adj.trigger)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#F8FAFC]">
                          {adj.title}
                        </p>
                        {planName && (
                          <p className="text-xs text-[#94A3B8] mt-0.5">{planName}</p>
                        )}
                        <p className="text-xs text-[#CBD5E1] mt-1">{adj.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleApproveAdjustment(adj.id!)}
                            className="text-xs font-medium px-3 py-1 rounded-md bg-[#10B981] hover:bg-[#059669] text-white transition-colors"
                          >
                            {text.approve}
                          </button>
                          <button
                            onClick={() => handleRejectAdjustment(adj.id!)}
                            className="text-xs font-medium px-3 py-1 rounded-md text-[#CBD5E1] transition-colors hover:bg-white/5"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                          >
                            {text.reject}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Plan List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-semibold text-[#CBD5E1]">{text.allPlans}</h2>
            <span className="text-xs text-[#64748B]">{plans.length}</span>
          </div>

          {plans.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(99,102,241,0.1)' }}
              >
                <span className="text-2xl">📚</span>
              </div>
              <p className="text-sm font-medium text-[#CBD5E1]">{text.noPlanYet}</p>
              <p className="text-xs text-[#94A3B8] mt-1 mb-4">{text.noPlanDesc}</p>
              <button
                onClick={onCreatePlan}
                className="bg-[#6366F1] hover:bg-[#5558E6] text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
              >
                {text.createPlan}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  <PlanCard
                    plan={plan}
                    milestones={milestonesMap[plan.id!] || []}
                    onComplete={() => handleComplete(plan.id!)}
                    onPause={() => handlePause(plan)}
                    onDelete={() => setConfirmDeleteId(plan.id!)}
                    onViewDetail={() => setDetailPlan(plan)}
                    onEdit={() => setEditingPlan(plan)}
                    onRebalance={() => handleRebalance(plan.id!)}
                    lang={lang}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Plan Detail Modal */}
      <AnimatePresence>
        {detailPlan && (
          <PlanDetailModal
            plan={detailPlan}
            onClose={() => setDetailPlan(null)}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* Plan Edit Modal */}
      <AnimatePresence>
        {editingPlan && (
          <PlanEditModal
            plan={editingPlan}
            onSave={handleEditSave}
            onClose={() => setEditingPlan(null)}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl p-5 max-w-sm w-full shadow-xl"
            style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 className="text-sm font-bold text-[#F8FAFC] mb-2">
              {lang === 'ja' ? '削除確認' : 'Delete Confirmation'}
            </h3>
            <p className="text-sm text-[#CBD5E1] mb-4">{text.confirmDelete}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="text-sm text-[#94A3B8] hover:text-[#CBD5E1] font-medium px-3 py-1.5"
              >
                {text.back.replace('← ', '')}
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="text-sm bg-[#EF4444] hover:bg-[#DC2626] text-white font-medium px-4 py-1.5 rounded-xl transition-colors"
              >
                {text.delete}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default StudyPlanDashboard;
