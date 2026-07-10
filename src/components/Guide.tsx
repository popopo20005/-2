/**
 * Guide - クイックスタートガイド
 * 5ステップのチェックリスト形式
 * ①プロンプト生成 ②問題インポート ③習熟度テスト ④学習プラン作成 ⑤クイズプレイ
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Download,
  ClipboardCheck,
  Map,
  Play,
  Check,
  ChevronRight,
} from 'lucide-react';
import { problemService, quizSetService } from '../lib/database';
import { LevelCheckQuiz } from './LevelCheckQuiz';
import type { View, QuizSet } from '../types';

interface GuideProps {
  onNavigate: (view: View) => void;
  language?: 'ja' | 'en';
}

interface StepStatus {
  promptGenerated: boolean;
  problemsImported: boolean;
  levelChecked: boolean;
  planCreated: boolean;
  quizPlayed: boolean;
}

export function Guide({ onNavigate, language = 'ja' }: GuideProps) {
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    promptGenerated: false,
    problemsImported: false,
    levelChecked: false,
    planCreated: false,
    quizPlayed: false,
  });
  const [showLevelCheck, setShowLevelCheck] = useState(false);
  const [showQuizSetPicker, setShowQuizSetPicker] = useState(false);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [selectedProblemIds, setSelectedProblemIds] = useState<number[] | undefined>(undefined);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    checkStepStatus();
  }, []);

  const checkStepStatus = async () => {
    try {
      const promptGenerated = localStorage.getItem('promptGenerated') === 'true';
      const planCreated = localStorage.getItem('studyPlanCreated') === 'true';
      const quizPlayed = localStorage.getItem('quizPlayed') === 'true';
      const levelChecked = localStorage.getItem('levelChecked') === 'true';

      let problemsImported = false;
      const cats: string[] = [];
      try {
        const problems = await problemService.getAll();
        problemsImported = problems.length > 0;
        // カテゴリー一覧を取得（習熟度テスト用）
        const catSet = new Set<string>();
        for (const p of problems) {
          if (p.category) catSet.add(p.category);
        }
        cats.push(...catSet);
      } catch { /* ignore */ }

      // 問題集一覧を取得
      try {
        const sets = await quizSetService.getAll();
        setQuizSets(sets);
      } catch { /* ignore */ }

      setCategories(cats);
      setStepStatus({
        promptGenerated,
        problemsImported,
        levelChecked,
        planCreated,
        quizPlayed,
      });
    } catch { /* ignore */ }
  };

  const handleLevelCheckComplete = (score: number) => {
    console.log('習熟度テスト完了: スコア', score);
    localStorage.setItem('levelChecked', 'true');
    localStorage.setItem('levelCheckScore', String(score));
    setShowLevelCheck(false);
    setSelectedProblemIds(undefined);
    setStepStatus(prev => ({ ...prev, levelChecked: true }));
  };

  const handleLevelCheckSkip = () => {
    localStorage.setItem('levelChecked', 'true');
    setShowLevelCheck(false);
    setSelectedProblemIds(undefined);
    setStepStatus(prev => ({ ...prev, levelChecked: true }));
  };

  const handleStartLevelCheck = () => {
    if (categories.length === 0) {
      // 問題がない場合はスキップ扱い
      handleLevelCheckSkip();
      return;
    }
    // 問題集が1つもない場合は全問題で直接開始
    if (quizSets.length === 0) {
      setSelectedProblemIds(undefined);
      setShowLevelCheck(true);
      return;
    }
    setShowQuizSetPicker(true);
  };

  const handleSelectQuizSet = (quizSet: QuizSet | null) => {
    if (quizSet) {
      setSelectedProblemIds(quizSet.problemIds);
    } else {
      // 「全ての問題」を選択
      setSelectedProblemIds(undefined);
    }
    setShowQuizSetPicker(false);
    setShowLevelCheck(true);
  };

  // 問題集選択画面
  if (showQuizSetPicker) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-6rem)] max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowQuizSetPicker(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={18} className="text-[#94A3B8]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC]">
              {language === 'ja' ? '問題集を選択' : 'Select Quiz Set'}
            </h1>
            <p className="text-[12px] text-[#64748B]">
              {language === 'ja' ? 'テストに使う問題集を選んでください' : 'Choose a quiz set for the test'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* 全ての問題 */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => handleSelectQuizSet(null)}
            className="w-full text-left"
          >
            <div
              className="rounded-[16px] p-4 px-5 flex items-center gap-4 transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(30,58,138,0.3), rgba(22,78,99,0.3))',
                border: '1px solid rgba(99,102,241,0.4)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(99,102,241,0.2)', border: '2px solid #6366F1' }}
              >
                <ClipboardCheck size={18} className="text-[#C7D2FE]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-bold text-[#F8FAFC]">
                  {language === 'ja' ? 'すべての問題' : 'All Problems'}
                </span>
                <p className="text-[12px] text-[#94A3B8]">
                  {language === 'ja'
                    ? `全カテゴリーからランダムに出題（${categories.length}カテゴリー）`
                    : `Random from all categories (${categories.length} categories)`}
                </p>
              </div>
              <ChevronRight size={16} className="text-[#818CF8]" />
            </div>
          </motion.button>

          {/* 各問題集 */}
          {quizSets.map((qs, index) => (
            <motion.button
              key={qs.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 1) * 0.06, duration: 0.3 }}
              onClick={() => handleSelectQuizSet(qs)}
              className="w-full text-left"
            >
              <div
                className="rounded-[16px] p-4 px-5 flex items-center gap-4 transition-transform active:scale-[0.98]"
                style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[14px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.15)', color: '#94A3B8' }}
                >
                  {qs.problemIds.length}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-bold text-[#F8FAFC]">{qs.name}</span>
                  <p className="text-[12px] text-[#94A3B8]">
                    {language === 'ja'
                      ? `${qs.problemIds.length}問`
                      : `${qs.problemIds.length} problems`}
                    {qs.description && ` · ${qs.description}`}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[#64748B]" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // 習熟度テスト表示中
  if (showLevelCheck) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-6rem)] max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowLevelCheck(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={18} className="text-[#94A3B8]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC]">
              {language === 'ja' ? '習熟度テスト' : 'Level Check'}
            </h1>
            <p className="text-[12px] text-[#64748B]">
              {language === 'ja' ? 'ステップ 3/5' : 'Step 3/5'}
            </p>
          </div>
        </div>
        <LevelCheckQuiz
          categories={categories}
          problemIds={selectedProblemIds}
          onComplete={handleLevelCheckComplete}
          onSkip={handleLevelCheckSkip}
          lang={language}
        />
      </div>
    );
  }

  const steps = language === 'ja' ? [
    {
      number: 1,
      title: 'プロンプトを生成する',
      description: 'AIに渡すプロンプトを作成して、問題を自動生成しましょう。弱点データや履歴を自動反映できます。',
      icon: FileText,
      completed: stepStatus.promptGenerated,
      action: () => onNavigate('promptWizard'),
      actionLabel: 'プロンプトを作成',
    },
    {
      number: 2,
      title: '問題をインポートする',
      description: 'AIが生成した問題をコピー＆ペーストで取り込みます。JSON/CSV/テキストに対応しています。',
      icon: Download,
      completed: stepStatus.problemsImported,
      action: () => onNavigate('editor'),
      actionLabel: 'インポートする',
    },
    {
      number: 3,
      title: '習熟度テストを受ける',
      description: 'インポートした問題から10問出題し、現在の実力を判定します。結果に基づいて最適な学習プランを作成できます。',
      icon: ClipboardCheck,
      completed: stepStatus.levelChecked,
      action: handleStartLevelCheck,
      actionLabel: 'テストを受ける',
    },
    {
      number: 4,
      title: '学習プランを作成する',
      description: '習熟度テストの結果をもとに、試験日や目標を設定してSM-2アルゴリズムに基づく学習計画を立てましょう。',
      icon: Map,
      completed: stepStatus.planCreated,
      action: () => onNavigate('studyPlanDashboard'),
      actionLabel: 'プランを作成',
    },
    {
      number: 5,
      title: 'クイズをプレイする',
      description: '準備完了！学習プランの「今日のタスク」からクイズを開始しましょう。進捗がプランに自動反映されます。',
      icon: Play,
      completed: stepStatus.quizPlayed,
      action: () => onNavigate('studyPlanDashboard'),
      actionLabel: '学習プランへ',
    },
  ] : [
    {
      number: 1,
      title: 'Generate a Prompt',
      description: 'Create a prompt for AI to auto-generate problems. Weakness data and history are reflected automatically.',
      icon: FileText,
      completed: stepStatus.promptGenerated,
      action: () => onNavigate('promptWizard'),
      actionLabel: 'Create Prompt',
    },
    {
      number: 2,
      title: 'Import Problems',
      description: 'Copy & paste AI-generated problems. Supports JSON, CSV, and text formats.',
      icon: Download,
      completed: stepStatus.problemsImported,
      action: () => onNavigate('editor'),
      actionLabel: 'Import',
    },
    {
      number: 3,
      title: 'Take a Level Check',
      description: '10 questions from imported problems to assess your current level. The result helps create an optimal study plan.',
      icon: ClipboardCheck,
      completed: stepStatus.levelChecked,
      action: handleStartLevelCheck,
      actionLabel: 'Take Test',
    },
    {
      number: 4,
      title: 'Create a Study Plan',
      description: 'Based on your level check results, set exam dates and goals to build an optimal plan with the SM-2 algorithm.',
      icon: Map,
      completed: stepStatus.planCreated,
      action: () => onNavigate('studyPlanDashboard'),
      actionLabel: 'Create Plan',
    },
    {
      number: 5,
      title: 'Play Quiz',
      description: "All set! Start quizzes from your study plan's daily tasks. Progress is automatically tracked in your plan.",
      icon: Play,
      completed: stepStatus.quizPlayed,
      action: () => onNavigate('studyPlanDashboard'),
      actionLabel: 'Go to Plan',
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // 次にやるべきステップを特定
  const nextStepIndex = steps.findIndex(s => !s.completed);

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('menu')}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <ArrowLeft size={18} className="text-[#94A3B8]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC]">
            {language === 'ja' ? 'クイックスタートガイド' : 'Quick Start Guide'}
          </h1>
          <p className="text-[12px] text-[#64748B]">
            {language === 'ja' ? '5つのステップでアプリをマスター' : 'Master the app in 5 steps'}
          </p>
        </div>
      </div>

      {/* Progress Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-5 mb-5"
        style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[14px] font-semibold text-[#F8FAFC]">
            {language === 'ja' ? '進捗' : 'Progress'}
          </span>
          <span className="text-[14px] font-bold text-[#818CF8]">
            {completedCount}/{steps.length} {language === 'ja' ? '完了' : 'done'}
          </span>
        </div>
        <div className="w-full h-[8px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #6366F1, #818CF8)',
              boxShadow: '0 0 12px rgba(99,102,241,0.5)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        {completedCount === steps.length && (
          <p className="text-[13px] text-[#34D399] mt-3 font-semibold text-center">
            {language === 'ja' ? '全ステップ完了！おめでとうございます！' : 'All steps complete! Congratulations!'}
          </p>
        )}
      </motion.div>

      {/* Steps */}
      <div className="flex-1 flex flex-col gap-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = index === nextStepIndex;
          const isCompleted = step.completed;

          return (
            <motion.button
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              onClick={step.action}
              className="w-full text-left"
            >
              <div
                className="rounded-[16px] p-4 px-5 flex items-start gap-4 transition-transform active:scale-[0.98]"
                style={
                  isNext
                    ? {
                        background: 'linear-gradient(135deg, rgba(30,58,138,0.3), rgba(22,78,99,0.3))',
                        border: '1px solid rgba(99,102,241,0.4)',
                        boxShadow: '0 0 20px rgba(99,102,241,0.15)',
                      }
                    : {
                        background: 'rgba(30,41,59,0.7)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }
                }
              >
                {/* Step number / Check */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[14px] font-bold"
                  style={
                    isCompleted
                      ? {
                          background: 'rgba(16,185,129,0.2)',
                          border: '2px solid #10B981',
                          color: '#34D399',
                        }
                      : isNext
                        ? {
                            background: 'rgba(99,102,241,0.2)',
                            border: '2px solid #6366F1',
                            color: '#C7D2FE',
                          }
                        : {
                            background: 'rgba(255,255,255,0.05)',
                            border: '2px solid rgba(255,255,255,0.15)',
                            color: '#64748B',
                          }
                  }
                >
                  {isCompleted ? <Check size={18} /> : step.number}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className={isCompleted ? 'text-[#34D399]' : isNext ? 'text-[#818CF8]' : 'text-[#64748B]'} />
                    <span className={`text-[14px] font-bold ${isCompleted ? 'text-[#34D399]' : 'text-[#F8FAFC]'}`}>
                      {step.title}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] font-bold text-[#34D399] bg-[rgba(16,185,129,0.15)] rounded-full px-2 py-0.5">
                        {language === 'ja' ? '完了' : 'Done'}
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[10px] font-bold text-[#818CF8] bg-[rgba(99,102,241,0.15)] rounded-full px-2 py-0.5">
                        {language === 'ja' ? '次のステップ' : 'Next'}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#94A3B8] leading-relaxed">
                    {step.description}
                  </p>
                  {isNext && (
                    <div className="mt-2 flex items-center gap-1 text-[12px] font-bold text-[#818CF8]">
                      {step.actionLabel}
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Cycle explanation */}
      <div className="mt-4 pt-4 pb-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] text-[#64748B] leading-relaxed">
          {language === 'ja'
            ? 'つくる → 取り込む → 診断 → プラン → 学習 → 見直し（a-PDCAサイクル）'
            : 'Create → Import → Diagnose → Plan → Study → Review (a-PDCA Cycle)'}
        </p>
      </div>
    </div>
  );
}
