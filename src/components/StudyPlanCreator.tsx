/**
 * StudyPlanCreator - 試験日ベース学習プラン作成画面
 *
 * 3ステップのウィザード形式で学習プランを作成:
 *   Step 1: 基本情報（名前・試験日・試験タイプ）
 *   Step 2: 設定（カテゴリー・学習時間・曜日・目標点数）
 *   Step 3: プレビューと確認（プラン生成結果の確認）
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { generateStudyPlan } from '../services/studyPlanGenerator';
import { mockExamService } from '../lib/database';
import { categoryService, historyService } from '../lib/database';
import type { ExamType, StudyPlanGenerationParams } from '../types/studyPlan';
import { LevelCheckQuiz } from './LevelCheckQuiz';
import { getPresetsGrouped, getPresetByIdUnified, CATEGORY_LABELS } from '../lib/presetRegistry';
import type { ImportanceMode, ImportanceLevel } from '../types/multiSubject';
import type { UnifiedPreset } from '../types/userPreset';
import { suggestMapping, getUnmappedCount, mappingsToRecord } from '../lib/categoryMatcher';
import type { CategoryMapping } from '../lib/categoryMatcher';
import { CustomPresetCreator } from './CustomPresetCreator';
import { getExamGrowthSummary } from '../services/subtopicAnalysisService';
import type { GrowthStatus } from '../services/subtopicAnalysisService';
import { getSubtopicPreset } from '../lib/subtopicPresets';
import { SubtopicOnboarding, shouldShowOnboarding } from './SubtopicOnboarding';

// ============================================================
// 国際化テキスト
// ============================================================

const t = {
  ja: {
    back: '← 戻る',
    title: '学習プラン作成',
    subtitle: '試験日から逆算して最適な学習スケジュールを自動生成します',
    step: 'ステップ',
    // Step 1
    step1Title: '基本情報',
    planName: 'プラン名',
    planNamePlaceholder: '例: 臨床栄養学 期末試験対策',
    examDate: '試験日',
    examType: '試験タイプ',
    examTypes: {
      midterm: '中間試験',
      final: '期末試験',
      mock: '模拟試験',
      qualification: '資格試験',
      entrance: '入試',
      certification: '認定試験',
      other: 'その他',
    },
    // Step 2
    step2Title: '学習設定',
    targetCategories: '対象カテゴリー',
    noCategoriesWarning: 'カテゴリーが見つかりません。先に問題を追加してください',
    selectAll: '全て選択',
    deselectAll: '全て解除',
    availableTime: '1日の学習時間',
    minutes: '分',
    targetScore: '目標点数',
    points: '点',
    currentLevel: '現在の実績',
    studyDays: '学習曜日',
    dayNames: ['日', '月', '火', '水', '木', '金', '土'],
    studyMode: '学習モード',
    studyModes: {
      balanced: 'バランス（新規+復習）',
      'weakness-focused': '弱点強化優先',
      'review-only': '復習のみ',
      'new-only': '新規のみ',
    },
    // Importance Mode (Phase 1-3)
    importanceMode: '科目の重要度配分',
    importanceModeDesc: '複数科目の優先度を決定する方法',
    importanceModes: {
      uniform: '均等（全て同じ重要度）',
      preset: '試験プリセット（頻出分野を重視）',
      manual: '手動設定（自分で優先度を決める）',
      analyzed: '分析データから（過去問分析を活用）',
    },
    selectPreset: '試験プリセットを選択',
    manualImportance: '科目別の重要度',
    importanceLevels: {
      low: '低',
      mid: '中',
      high: '高',
    },
    // Category Mapping
    categoryMapping: 'カテゴリーマッピング',
    categoryMappingDesc: 'あなたのカテゴリーをプリセットの科目に対応付けます',
    unmappedWarning: (n: number) => `${n}科目が未マッピングです（均等配分になります）`,
    mappingAutoSuggested: '自動推測',
    mappingManual: '手動選択',
    mappingNone: '-- 未設定 --',
    mappingResetAuto: '自動推測をやり直す',
    allMapped: '全カテゴリーが対応付けされました',
    customPresets: 'カスタムプリセット',
    createNewPreset: '＋ 新規プリセット作成',
    noCustomPresets: 'カスタムプリセットはまだありません',
    subtopicGrowth: 'サブトピック分析の成長状態',
    subtopicAnalyze: '詳細分析を開く',
    hasSubtopicData: 'サブトピック分析データあり',
    // Level Check
    levelCheckTitle: 'レベルチェック',
    // Step 3
    step3Title: 'プレビューと確認',
    planSummary: 'プラン概要',
    totalStudyDays: '学習日数',
    days: '日',
    totalProblems: '目標問題数',
    problems: '問題',
    problemsPerDay: '1日あたり',
    estimatedTime: '1日の学習時間',
    categories: 'カテゴリー配分',
    createPlan: 'プラン作成',
    // Buttons
    next: '次へ',
    previous: '戻る',
    cancel: 'キャンセル',
    // Validation
    planNameRequired: 'プラン名を入力してください',
    examDateRequired: '試験日を選択してください',
    examDatePast: '試験日は未来の日付を選択してください',
    categoriesRequired: '対象カテゴリーを1つ以上選択してください',
    timeRequired: '学習時間を設定してください',
    // Success
    planCreated: 'プラン作成完了！',
    planCreatedDesc: '学習プランが正常に作成されました。ダッシュボードで確認できます',
    // Errors
    generationError: 'プラン生成に失敗しました',
    // Labels
    generating: '生成中...',
  },
  en: {
    back: '← Back',
    title: 'Create Study Plan',
    subtitle: 'Automatically generate an optimal study schedule based on your exam date',
    step: 'Step',
    step1Title: 'Basic Info',
    planName: 'Plan Name',
    planNamePlaceholder: 'e.g. Nutrition Science Final Exam Prep',
    examDate: 'Exam Date',
    examType: 'Exam Type',
    examTypes: {
      midterm: 'Midterm',
      final: 'Final',
      mock: 'Mock Exam',
      qualification: 'Qualification',
      entrance: 'Entrance Exam',
      certification: 'Certification',
      other: 'Other',
    },
    step2Title: 'Study Settings',
    targetCategories: 'Target Categories',
    noCategoriesWarning: 'No categories found. Please add problems first',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    availableTime: 'Daily Study Time',
    minutes: 'min',
    targetScore: 'Target Score',
    points: 'pts',
    currentLevel: 'Current Level',
    studyDays: 'Study Days',
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    studyMode: 'Study Mode',
    studyModes: {
      balanced: 'Balanced (New + Review)',
      'weakness-focused': 'Weakness Focus',
      'review-only': 'Review Only',
      'new-only': 'New Only',
    },
    importanceMode: 'Subject Importance',
    importanceModeDesc: 'How to distribute priority across subjects',
    importanceModes: {
      uniform: 'Uniform (equal weight)',
      preset: 'Exam Preset (focus on frequent topics)',
      manual: 'Manual (set priorities yourself)',
      analyzed: 'From Analysis (use past-exam data)',
    },
    selectPreset: 'Select Exam Preset',
    manualImportance: 'Subject Importance',
    importanceLevels: {
      low: 'Low',
      mid: 'Mid',
      high: 'High',
    },
    categoryMapping: 'Category Mapping',
    categoryMappingDesc: 'Map your categories to preset subjects',
    unmappedWarning: (n: number) => `${n} subjects unmapped (will use equal weight)`,
    mappingAutoSuggested: 'Auto-suggested',
    mappingManual: 'Manual',
    mappingNone: '-- Not set --',
    mappingResetAuto: 'Reset auto-mapping',
    allMapped: 'All categories mapped',
    customPresets: 'Custom Presets',
    createNewPreset: '+ Create New Preset',
    noCustomPresets: 'No custom presets yet',
    subtopicGrowth: 'Subtopic Analysis Growth',
    subtopicAnalyze: 'Open Detailed Analysis',
    hasSubtopicData: 'Has subtopic analysis data',
    levelCheckTitle: 'Level Check',
    step3Title: 'Preview & Confirm',
    planSummary: 'Plan Summary',
    totalStudyDays: 'Study Days',
    days: 'days',
    totalProblems: 'Target Problems',
    problems: 'problems',
    problemsPerDay: 'Per Day',
    estimatedTime: 'Daily Time',
    categories: 'Category Distribution',
    createPlan: 'Create Plan',
    next: 'Next',
    previous: 'Previous',
    cancel: 'Cancel',
    planNameRequired: 'Please enter a plan name',
    examDateRequired: 'Please select an exam date',
    examDatePast: 'Exam date must be in the future',
    categoriesRequired: 'Please select at least one category',
    timeRequired: 'Please set study time',
    planCreated: 'Plan Created!',
    planCreatedDesc: 'Your study plan has been created successfully. Check the dashboard.',
    generationError: 'Failed to generate plan',
    generating: 'Generating...',
  },
};

type Lang = 'ja' | 'en';

// ============================================================
// Props
// ============================================================

interface StudyPlanCreatorProps {
  onBack: () => void;
  onPlanCreated?: (planId: number) => void;
  language?: Lang;
}

// ============================================================
// ステップ進捗バー
// ============================================================

function StepIndicator({ currentStep, totalSteps, stepLabels }: { currentStep: number; totalSteps: number; stepLabels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <React.Fragment key={step}>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step === currentStep
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {step < currentStep ? '✓' : step}
            </div>
            <span className={`ml-1.5 text-xs font-medium hidden sm:inline ${
              step === currentStep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {stepLabels[step - 1] || ''}
            </span>
          </div>
          {step < totalSteps && (
            <div className={`w-8 h-0.5 transition-all duration-300 ${
              step < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================

export function StudyPlanCreator({ onBack, onPlanCreated, language }: StudyPlanCreatorProps) {
  const lang: Lang = language || 'ja';
  const text = t[lang];

  // --- State ---
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Step 1 Fields
  const [planName, setPlanName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examType, setExamType] = useState<ExamType>('final');

  // Step 2 Fields
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableTime, setAvailableTime] = useState(45);
  const [targetScore, setTargetScore] = useState(80);
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [studyMode, setStudyMode] = useState<string>('balanced');

  // Importance Mode (Phase 1-3: multiSubjectPlanner integration)
  const [importanceMode, setImportanceMode] = useState<ImportanceMode>('uniform');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [manualImportance, setManualImportance] = useState<Record<string, ImportanceLevel>>({});
  const [presetMappings, setPresetMappings] = useState<CategoryMapping[]>([]);
  const [showPresetCreator, setShowPresetCreator] = useState(false);
  const [allPresets, setAllPresets] = useState<{ builtIn: Map<string, UnifiedPreset[]>; custom: UnifiedPreset[] }>({ builtIn: new Map(), custom: [] });
  const [growthStatuses, setGrowthStatuses] = useState<GrowthStatus[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Level Check State
  const [needsLevelCheck, setNeedsLevelCheck] = useState<boolean | null>(null);
  const [levelCheckScore, setLevelCheckScore] = useState<number | null>(null);

  // Step 3 Preview State
  const [previewStats, setPreviewStats] = useState<{
    totalDays: number;
    studyDaysCount: number;
    totalProblems: number;
    problemsPerDay: number;
  } | null>(null);

  // --- Load categories & check history ---
  useEffect(() => {
    const load = async () => {
      try {
        const [cats, history] = await Promise.all([
          categoryService.getAll(),
          historyService.getAll(),
        ]);
        setCategories(cats);
        setNeedsLevelCheck(history.length === 0);
      } catch (e) {
        console.error('初期データ読み込みエラー:', e);
        setNeedsLevelCheck(false);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // --- Load all presets (built-in + custom) ---
  const loadPresets = useCallback(async () => {
    const grouped = await getPresetsGrouped();
    setAllPresets(grouped);
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // --- Load subtopic growth when preset changes ---
  useEffect(() => {
    if (importanceMode === 'preset' && selectedPresetId) {
      const hasSubtopic = !!getSubtopicPreset(selectedPresetId);
      if (hasSubtopic) {
        getExamGrowthSummary(selectedPresetId).then(setGrowthStatuses);
        // 初回利用時のオンボーディング
        if (shouldShowOnboarding()) {
          setShowOnboarding(true);
        }
      } else {
        setGrowthStatuses([]);
      }
    } else {
      setGrowthStatuses([]);
    }
  }, [importanceMode, selectedPresetId]);

  // --- Auto-mapping when preset or categories change ---
  useEffect(() => {
    if (importanceMode !== 'preset' || !selectedPresetId || selectedCategories.length === 0) {
      setPresetMappings([]);
      return;
    }
    // 統合検索（組み込み + カスタム両対応）
    let cancelled = false;
    getPresetByIdUnified(selectedPresetId).then((preset) => {
      if (cancelled || !preset) {
        if (!cancelled) setPresetMappings([]);
        return;
      }
      const presetKeys = Object.keys(preset.weights);
      const mappings = suggestMapping(selectedCategories, presetKeys);
      setPresetMappings(mappings);
    });
    return () => { cancelled = true; };
  }, [importanceMode, selectedPresetId, selectedCategories]);

  // --- Validation ---
  const validateStep1 = useCallback((): string | null => {
    if (!planName.trim()) return text.planNameRequired;
    if (!examDate) return text.examDateRequired;
    const exam = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (exam <= today) return text.examDatePast;
    return null;
  }, [planName, examDate, text]);

  const validateStep2 = useCallback((): string | null => {
    if (selectedCategories.length === 0) return text.categoriesRequired;
    if (availableTime < 10) return text.timeRequired;
    return null;
  }, [selectedCategories, availableTime, text]);

  // --- Dynamic step management ---
  const totalSteps = needsLevelCheck ? 4 : 3;
  const previewStep = needsLevelCheck ? 4 : 3;
  const levelCheckStep = needsLevelCheck ? 3 : -1; // -1 = no level check

  const stepLabels = needsLevelCheck
    ? [text.step1Title, text.step2Title, text.levelCheckTitle, text.step3Title]
    : [text.step1Title, text.step2Title, text.step3Title];

  // --- Preview計算 ---
  const calculatePreview = useCallback(() => {
    const examDateObj = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.ceil((examDateObj.getTime() - today.getTime()) / msPerDay);

    let studyDaysCount = 0;
    const cur = new Date(today);
    while (cur <= examDateObj) {
      if (studyDays.includes(cur.getDay())) studyDaysCount++;
      cur.setDate(cur.getDate() + 1);
    }

    const currentLevel = levelCheckScore ?? 50;
    const improvement = Math.max(0, targetScore - currentLevel);
    const totalProblems = Math.max(20, Math.round(improvement * 15));
    const problemsPerDay = studyDaysCount > 0 ? Math.ceil(totalProblems / studyDaysCount) : 0;

    setPreviewStats({ totalDays, studyDaysCount, totalProblems, problemsPerDay });
  }, [examDate, studyDays, targetScore, levelCheckScore]);

  // --- Navigation ---
  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }

      if (needsLevelCheck) {
        // レベルチェックステップへ
        setCurrentStep(3);
      } else {
        // プレビューへ直接
        calculatePreview();
        setCurrentStep(3);
      }
    }
  };

  // レベルチェック完了ハンドラ
  const handleLevelCheckComplete = useCallback((score: number) => {
    setLevelCheckScore(score);
    // プレビューステップへ進む（calculatePreviewはsetCurrentStepの後にuseEffectで呼ぶ）
    setCurrentStep(4);
  }, []);

  const handleLevelCheckSkip = useCallback(() => {
    setLevelCheckScore(null);
    setCurrentStep(4);
  }, []);

  // プレビューステップに入ったときにpreviewを計算
  useEffect(() => {
    if (currentStep === previewStep && !previewStats) {
      calculatePreview();
    }
  }, [currentStep, previewStep, previewStats, calculatePreview]);

  const handlePrevious = () => {
    setError(null);
    if (currentStep === previewStep) {
      // プレビューから戻る時、previewStatsをリセット
      setPreviewStats(null);
      if (needsLevelCheck) {
        // レベルチェックステップへ戻る
        setCurrentStep(3);
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === levelCheckStep) {
      // レベルチェックから戻る
      setLevelCheckScore(null);
      setCurrentStep(2);
    } else {
      setCurrentStep((s) => Math.max(1, s - 1));
    }
  };

  // --- Category Toggle ---
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...categories]);
    }
  };

  // --- Study Day Toggle ---
  const toggleStudyDay = (day: number) => {
    setStudyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // --- Create Plan ---
  const handleCreatePlan = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const params: StudyPlanGenerationParams = {
        name: planName.trim(),
        examDate: new Date(examDate),
        targetCategories: selectedCategories,
        availableTimePerDay: availableTime,
        studyDaysOfWeek: studyDays,
        examType,
        targetScore,
        currentLevel: levelCheckScore ?? undefined,
        studyMode: studyMode as any,
        prioritizeWeakness: studyMode !== 'new-only',
        includeSpacedRepetition: studyMode !== 'new-only',
      };

      // Phase 1-3: 多科目の優先度スコアベース配分を有効化
      if (selectedCategories.length >= 2 && importanceMode !== 'uniform') {
        params.importanceMode = importanceMode;
        if (importanceMode === 'preset' && selectedPresetId) {
          params.importancePresetId = selectedPresetId;
          // カテゴリー名マッピングを含める
          if (presetMappings.length > 0) {
            params.importancePresetMapping = mappingsToRecord(presetMappings);
          }
        }
        if (importanceMode === 'manual') {
          params.importanceManualWeights = { ...manualImportance };
        }
        if (importanceMode === 'analyzed' && selectedPresetId) {
          params.importancePresetId = selectedPresetId;
        }
      }

      const result = await generateStudyPlan(params);

      setSuccess(true);

      // Phase 4-3: 初期スコア測定の提案
      // 模試データがまだない場合、初期レベル測定のための簡易模試を提案
      try {
        const existingMocks = await mockExamService.getByPlanId(result.planId);
        if (existingMocks.length === 0) {
          toast(
            lang === 'ja'
              ? '💡 正確な学習計画のために、模試で現在のレベルを測定しましょう！ダッシュボードの「模試を受ける」から開始できます。'
              : '💡 Take a mock exam to accurately measure your level! Start from "Take Mock Exam" on the dashboard.',
            { duration: 8000, icon: '📊' }
          );
        }
      } catch {
        // 提案失敗は無視
      }

      localStorage.setItem('studyPlanCreated', 'true');
      if (onPlanCreated) {
        onPlanCreated(result.planId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : text.generationError);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Success ---
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{text.planCreated}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{text.planCreatedDesc}</p>
          <button
            onClick={onBack}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {text.back.replace('← ', '')}
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={onBack}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2 text-sm"
          >
            {text.back}
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{text.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{text.subtitle}</p>
        </motion.div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} stepLabels={stepLabels} />

        {/* Form Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
                {error}
              </div>
            )}

            {/* ========== Step 1: Basic Info ========== */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{text.step1Title}</h2>

                {/* Plan Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {text.planName}
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder={text.planNamePlaceholder}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Exam Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {text.examDate}
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Exam Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {text.examType}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(text.examTypes) as ExamType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setExamType(type)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          examType === type
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        {text.examTypes[type]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========== Step 2: Settings ========== */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{text.step2Title}</h2>

                {/* Categories */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{text.targetCategories}</label>
                    <button
                      onClick={toggleAllCategories}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selectedCategories.length === categories.length ? text.deselectAll : text.selectAll}
                    </button>
                  </div>
                  {categories.length === 0 ? (
                    <p className="text-sm text-orange-600 dark:text-orange-400">{text.noCategoriesWarning}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            selectedCategories.includes(cat)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Time & Target Score */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {text.availableTime}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={180}
                        step={5}
                        value={availableTime}
                        onChange={(e) => setAvailableTime(Number(e.target.value))}
                        className="flex-1 accent-blue-600"
                      />
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 w-14 text-right">
                        {availableTime}{text.minutes}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {text.targetScore}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={50}
                        max={100}
                        step={5}
                        value={targetScore}
                        onChange={(e) => setTargetScore(Number(e.target.value))}
                        className="flex-1 accent-purple-600"
                      />
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 w-14 text-right">
                        {targetScore}{text.points}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Study Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {text.studyDays}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {text.dayNames.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => toggleStudyDay(i)}
                        className={`w-10 h-10 rounded-full text-sm font-medium border transition-all ${
                          studyDays.includes(i)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Study Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {text.studyMode}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(text.studyModes) as string[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setStudyMode(mode)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border text-left transition-all ${
                          studyMode === mode
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        {text.studyModes[mode as keyof typeof text.studyModes]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Importance Mode (Phase 1-3: 多科目同時プランニング) */}
                {selectedCategories.length >= 2 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {text.importanceMode}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {text.importanceModeDesc}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {(['uniform', 'preset', 'manual', 'analyzed'] as ImportanceMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setImportanceMode(mode)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border text-left transition-all ${
                            importanceMode === mode
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          {text.importanceModes[mode]}
                        </button>
                      ))}
                    </div>

                    {/* Preset Dropdown (Grouped: built-in by category + custom) */}
                    {importanceMode === 'preset' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {text.selectPreset}
                        </label>
                        <select
                          value={selectedPresetId}
                          onChange={(e) => setSelectedPresetId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">-- {text.selectPreset} --</option>
                          {/* Built-in presets grouped by category */}
                          {Array.from(allPresets.builtIn.entries()).map(([category, presets]) => {
                            const label = CATEGORY_LABELS[category];
                            const groupLabel = label ? `${label.emoji} ${label.ja}` : category;
                            return (
                              <optgroup key={category} label={groupLabel}>
                                {presets.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </optgroup>
                            );
                          })}
                          {/* Custom presets */}
                          {allPresets.custom.length > 0 && (
                            <optgroup label={`🔧 ${text.customPresets}`}>
                              {allPresets.custom.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.iconEmoji ? `${p.iconEmoji} ` : ''}{p.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>

                        {/* Create new preset button */}
                        <button
                          type="button"
                          onClick={() => setShowPresetCreator(true)}
                          className="mt-2 w-full px-3 py-2 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        >
                          {text.createNewPreset}
                        </button>

                        {/* Subtopic Growth Summary */}
                        {selectedPresetId && growthStatuses.length > 0 && (
                          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                              {text.subtopicGrowth}
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {growthStatuses.slice(0, 8).map((status) => (
                                <span
                                  key={status.category}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-[10px] text-gray-700 dark:text-gray-300 border border-purple-100 dark:border-purple-800"
                                  title={`${status.sessionCount} sessions, ${status.totalProblems} problems`}
                                >
                                  <span>{status.growthEmoji}</span>
                                  <span className="truncate max-w-[80px]">{status.category}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Category Mapping UI */}
                        {selectedPresetId && presetMappings.length > 0 && (
                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {text.categoryMapping}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  getPresetByIdUnified(selectedPresetId).then((preset) => {
                                    if (preset) {
                                      const presetKeys = Object.keys(preset.weights);
                                      setPresetMappings(suggestMapping(selectedCategories, presetKeys));
                                    }
                                  });
                                }}
                                className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                {text.mappingResetAuto}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                              {text.categoryMappingDesc}
                            </p>

                            {/* Warning or success */}
                            {(() => {
                              const unmapped = getUnmappedCount(presetMappings);
                              if (unmapped > 0) {
                                return (
                                  <div className="mb-3 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-700 dark:text-amber-300">
                                    ⚠ {text.unmappedWarning(unmapped)}
                                  </div>
                                );
                              }
                              return (
                                <div className="mb-3 px-2 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-xs text-green-700 dark:text-green-300">
                                  ✓ {text.allMapped}
                                </div>
                              );
                            })()}

                            {/* Mapping rows */}
                            <div className="space-y-2">
                              {presetMappings.map((mapping, idx) => {
                                // presetKeysはpresetMappings自体から抽出（すでにマッピング候補がある）
                                const allPresetKeys = [...new Set(presetMappings.map(m => m.presetCategory).filter(Boolean) as string[])];
                                // fallback: allPresetsから検索
                                const currentPreset = [...(allPresets.builtIn.values() || [])].flat().find(p => p.id === selectedPresetId)
                                  || allPresets.custom.find(p => p.id === selectedPresetId);
                                const presetKeys = currentPreset ? Object.keys(currentPreset.weights) : allPresetKeys;
                                return (
                                  <div key={mapping.userCategory} className="flex items-center gap-2">
                                    <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate min-w-0" title={mapping.userCategory}>
                                      {mapping.userCategory}
                                    </span>
                                    <span className="text-gray-400 text-xs shrink-0">→</span>
                                    <select
                                      value={mapping.presetCategory ?? ''}
                                      onChange={(e) => {
                                        const newMappings = [...presetMappings];
                                        const val = e.target.value;
                                        newMappings[idx] = {
                                          ...mapping,
                                          presetCategory: val || null,
                                          matchType: val ? 'normalized' : 'none',
                                          confidence: val ? 0.9 : 0,
                                        };
                                        setPresetMappings(newMappings);
                                      }}
                                      className="flex-1 min-w-0 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-purple-500"
                                    >
                                      <option value="">{text.mappingNone}</option>
                                      {presetKeys.map((pk) => (
                                        <option key={pk} value={pk}>{pk}</option>
                                      ))}
                                    </select>
                                    {mapping.matchType !== 'none' && mapping.matchType !== 'normalized' && (
                                      <span className="text-xs text-green-600 dark:text-green-400 shrink-0" title={text.mappingAutoSuggested}>
                                        ✓
                                      </span>
                                    )}
                                    {mapping.matchType === 'none' && (
                                      <span className="text-xs text-amber-500 shrink-0">❗</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manual Level Sliders */}
                    {importanceMode === 'manual' && (
                      <div className="mt-3 space-y-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                          {text.manualImportance}
                        </label>
                        {selectedCategories.map((cat) => {
                          const level = manualImportance[cat] ?? 'mid';
                          return (
                            <div key={cat} className="flex items-center gap-2">
                              <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                                {cat}
                              </span>
                              <div className="flex gap-1">
                                {(['low', 'mid', 'high'] as ImportanceLevel[]).map((lvl) => (
                                  <button
                                    key={lvl}
                                    onClick={() =>
                                      setManualImportance((prev) => ({ ...prev, [cat]: lvl }))
                                    }
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                      level === lvl
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {text.importanceLevels[lvl]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Analyzed Mode Info */}
                    {importanceMode === 'analyzed' && (
                      <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          {lang === 'ja'
                            ? '過去問一括分析で蓄積されたデータを基に、各科目の出題頻度に応じた重要度を自動算出します。分析データがない科目は均等配分（1.0）になります。'
                            : 'Importance weights are automatically calculated from batch past-exam analysis data based on problem frequency per subject. Subjects without analysis data default to uniform weight (1.0).'}
                        </p>
                        {selectedPresetId && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            {lang === 'ja'
                              ? `プリセット: ${selectedPresetId} の分析データを使用`
                              : `Using analysis data for preset: ${selectedPresetId}`}
                          </p>
                        )}
                        {!selectedPresetId && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {lang === 'ja'
                              ? '※ プリセットを選択するか、先に「過去問一括分析」を実行してください'
                              : '* Please select a preset or run "Batch Past-Exam Analysis" first'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========== Level Check Step ========== */}
            {currentStep === levelCheckStep && (
              <LevelCheckQuiz
                categories={selectedCategories}
                onComplete={handleLevelCheckComplete}
                onSkip={handleLevelCheckSkip}
                lang={lang}
              />
            )}

            {/* ========== Preview Step ========== */}
            {currentStep === previewStep && previewStats && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{text.step3Title}</h2>

                {/* Level Check Result Badge */}
                {levelCheckScore !== null && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {lang === 'ja'
                        ? `レベルチェック結果: ${levelCheckScore}% → この値を基にプランを作成します`
                        : `Level Check Result: ${levelCheckScore}% → Plan will be based on this score`}
                    </p>
                  </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{text.totalStudyDays}</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {previewStats.studyDaysCount}<span className="text-sm font-normal ml-1">{text.days}</span>
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">{text.totalProblems}</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {previewStats.totalProblems}<span className="text-sm font-normal ml-1">{text.problems}</span>
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">{text.problemsPerDay}</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {previewStats.problemsPerDay}<span className="text-sm font-normal ml-1">{text.problems}</span>
                    </p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">{text.estimatedTime}</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {availableTime}<span className="text-sm font-normal ml-1">{text.minutes}</span>
                    </p>
                  </div>
                </div>

                {/* Plan Details */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{text.planName}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{planName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{text.examDate}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {new Date(examDate).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{text.examType}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{text.examTypes[examType]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{text.targetScore}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{targetScore}{text.points}</span>
                  </div>
                  {levelCheckScore !== null && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{text.currentLevel}</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{levelCheckScore}{text.points}</span>
                    </div>
                  )}
                </div>

                {/* Category List */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{text.categories}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========== Navigation Buttons ========== */}
            {/* レベルチェックステップでは独自のナビゲーションを使用するため非表示 */}
            {currentStep !== levelCheckStep && (
              <div className={`flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700`}>
                <button
                  onClick={currentStep === 1 ? onBack : handlePrevious}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium px-3 py-1.5"
                >
                  {currentStep === 1 ? text.cancel : text.previous}
                </button>

                {currentStep < previewStep ? (
                  <button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    {text.next}
                  </button>
                ) : (
                  <button
                    onClick={handleCreatePlan}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {text.generating}
                      </>
                    ) : (
                      text.createPlan
                    )}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Custom Preset Creator Modal */}
      <CustomPresetCreator
        isOpen={showPresetCreator}
        lang={lang}
        onClose={() => setShowPresetCreator(false)}
        onCreated={(newPresetId) => {
          setShowPresetCreator(false);
          loadPresets().then(() => {
            setSelectedPresetId(newPresetId);
          });
        }}
      />

      {/* Subtopic Onboarding Modal */}
      <SubtopicOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        lang={lang}
      />
    </div>
  );
}

export default StudyPlanCreator;
