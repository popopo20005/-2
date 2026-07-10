/**
 * PastExamAnalysis - 過去問一括分析コンポーネント
 *
 * 過去問データを年度別にグループ化し、AIによる一括サブトピック分析を行う。
 * 結果を年度×サブトピックのマトリクスで表示し、DBに保存する。
 *
 * フロー:
 *   1. プリセット＆カテゴリー選択 → 年度バッジ表示
 *   2. AI分析プロンプト生成＆コピー → AI応答貼り付け＆パース
 *   3. マトリクス表示 → DB保存
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EXAM_PRESETS } from '../lib/examPresets';
import { userPresetService } from '../services/userPresetService';
import type { ExamPreset } from '../types/multiSubject';
import type { MatrixData, FrequencyAnalysisResult } from '../types/subtopicAnalysis';
import type { View } from '../types';
import { generateFrequencyAnalysis } from '../services/subtopicAnalysisService';
import {
  groupProblemsByYear,
  getYearStats,
  buildMatrixFromYearDistribution,
  saveBatchSessions,
} from '../services/batchAnalysisService';
import type { YearStats } from '../services/batchAnalysisService';
import {
  generateBatchAnalysisPrompt,
  parseBatchAIResponse,
  createBatchSessions,
} from '../services/subtopicPromptGenerator';
type Lang = 'ja' | 'en';

// ============================================================
// 国際化テキスト
// ============================================================

const t = {
  ja: {
    title: '過去問一括分析',
    subtitle: '複数年度の過去問をまとめてAI分析し、サブトピックの出題傾向を把握します',
    back: '← 戻る',
    step1: 'ステップ1: 試験＆科目を選択',
    step2: 'ステップ2: AI分析',
    step3: 'ステップ3: 分析結果',
    selectPreset: 'プリセットを選択',
    selectCategory: '科目を選択',
    noPreset: 'プリセットを選んでください',
    noCategory: '科目を選んでください',
    detectedYears: '検出された年度',
    totalProblems: '合計問題数',
    noYearData: 'この科目には年度情報(sourceExamYear)のある問題がありません',
    generatePrompt: 'プロンプトを生成',
    copyPrompt: 'プロンプトをコピー',
    copied: 'コピーしました！',
    pasteResult: 'AI応答のJSONを貼り付けてください',
    parseResult: '解析する',
    parsing: '解析中...',
    parseError: 'パースエラー',
    matrixTitle: '年度×サブトピック マトリクス',
    subtopic: 'サブトピック',
    total: '合計',
    saveToDb: 'DBに保存',
    saving: '保存中...',
    saved: '保存完了！',
    saveDesc: '年度別セッションとしてサブトピック分析データに保存します',
    yearLabel: '第{year}回',
    problems: '問',
    promptGenerated: 'プロンプトが生成されました。コピーしてAIに送信してください。',
    alreadySaved: '既に保存済みです',
    frequentTitle: '頻出問題パターン',
    frequentDesc: '複数年度にわたって繰り返し出題されているパターン',
    frequentCount: '回出題',
    frequentYears: '出題年度',
    importanceTitle: 'サブトピック重要度',
    importanceDesc: 'プリセット＋分析データのブレンドによる重要度スコア',
    noFrequentData: '保存後に頻出問題分析が表示されます',
    loadingFrequency: '頻出分析を読み込み中...',
    guideTitle: '使い方ガイド',
    guideSteps: [
      { icon: '1️⃣', text: 'プリセット(試験の種類)と科目を選択すると、DBにある過去問の年度が自動検出されます' },
      { icon: '2️⃣', text: '「プロンプトを生成」をクリックし、生成されたプロンプトをChatGPT/Claudeにコピー' },
      { icon: '3️⃣', text: 'AIの回答(JSON)をテキストエリアに貼り付け、「解析する」をクリック' },
      { icon: '4️⃣', text: '年度×サブトピックのマトリクスが表示されます。「DBに保存」で分析データを保存' },
      { icon: '💡', text: '問題データにsourceExamYear(出題年度)を設定しておくと、年度別分析が可能になります' },
    ],
  },
  en: {
    title: 'Batch Past-Exam Analysis',
    subtitle: 'Analyze multiple years of past exams with AI to understand subtopic trends',
    back: '← Back',
    step1: 'Step 1: Select Exam & Subject',
    step2: 'Step 2: AI Analysis',
    step3: 'Step 3: Results',
    selectPreset: 'Select preset',
    selectCategory: 'Select subject',
    noPreset: 'Please select a preset',
    noCategory: 'Please select a subject',
    detectedYears: 'Detected years',
    totalProblems: 'Total problems',
    noYearData: 'No problems with year data (sourceExamYear) in this subject',
    generatePrompt: 'Generate prompt',
    copyPrompt: 'Copy prompt',
    copied: 'Copied!',
    pasteResult: 'Paste the AI response JSON below',
    parseResult: 'Parse',
    parsing: 'Parsing...',
    parseError: 'Parse error',
    matrixTitle: 'Year x Subtopic Matrix',
    subtopic: 'Subtopic',
    total: 'Total',
    saveToDb: 'Save to DB',
    saving: 'Saving...',
    saved: 'Saved!',
    saveDesc: 'Save as per-year sessions to subtopic analysis data',
    yearLabel: '#{year}',
    problems: ' problems',
    promptGenerated: 'Prompt generated. Copy it and send to AI.',
    alreadySaved: 'Already saved',
    frequentTitle: 'Frequent Problem Patterns',
    frequentDesc: 'Patterns that appear repeatedly across multiple years',
    frequentCount: ' appearances',
    frequentYears: 'Years',
    importanceTitle: 'Subtopic Importance',
    importanceDesc: 'Importance scores blended from preset + analysis data',
    noFrequentData: 'Frequency analysis will appear after saving',
    loadingFrequency: 'Loading frequency analysis...',
    guideTitle: 'How to Use',
    guideSteps: [
      { icon: '1️⃣', text: 'Select a preset (exam type) and subject — past exam years are auto-detected from DB' },
      { icon: '2️⃣', text: 'Click "Generate prompt" and copy the generated prompt to ChatGPT/Claude' },
      { icon: '3️⃣', text: 'Paste the AI response (JSON) into the text area and click "Parse"' },
      { icon: '4️⃣', text: 'A year x subtopic matrix is displayed. Click "Save to DB" to save the analysis' },
      { icon: '💡', text: 'Set sourceExamYear on your problems to enable year-by-year analysis' },
    ],
  },
};

// ============================================================
// Props
// ============================================================

interface PastExamAnalysisProps {
  onBack: () => void;
  onNavigate?: (view: View) => void;
  language?: Lang;
}

// ============================================================
// コンポーネント
// ============================================================

export function PastExamAnalysis({ onBack, language = 'ja' }: PastExamAnalysisProps) {
  const txt = t[language];

  // --- Step 1 state ---
  const [allPresets, setAllPresets] = useState<ExamPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [yearStats, setYearStats] = useState<YearStats[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);

  // --- Step 2 state ---
  const [prompt, setPrompt] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // --- Step 3 state ---
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [frequencyResult, setFrequencyResult] = useState<FrequencyAnalysisResult | null>(null);
  const [loadingFrequency, setLoadingFrequency] = useState(false);

  // --- 現在のステップ ---
  const [currentStep, setCurrentStep] = useState(1);
  const [showGuide, setShowGuide] = useState(false);

  // プリセット読み込み
  useEffect(() => {
    const loadPresets = async () => {
      const userPresets = await userPresetService.getAll();
      const userAsExam = userPresets
        .filter(up => up.id !== undefined)
        .map(up => ({
          id: String(up.id),
          name: up.name,
          category: 'other' as const,
          description: up.description || '',
          weights: up.weights,
        }));
      setAllPresets([...EXAM_PRESETS, ...userAsExam]);
    };
    loadPresets();
  }, []);

  // カテゴリー変更時に年度データ読み込み
  const loadYearData = useCallback(async () => {
    if (!selectedCategory) {
      setYearStats([]);
      return;
    }
    setLoadingYears(true);
    try {
      const stats = await getYearStats(selectedCategory, language);
      setYearStats(stats);
    } catch (err) {
      console.error('Failed to load year stats:', err);
      setYearStats([]);
    } finally {
      setLoadingYears(false);
    }
  }, [selectedCategory, language]);

  useEffect(() => {
    loadYearData();
  }, [loadYearData]);

  // 選択中のプリセット
  const selectedPreset = allPresets.find(p => p.id === selectedPresetId);
  const categories = selectedPreset ? Object.keys(selectedPreset.weights) : [];
  const totalProblems = yearStats.reduce((sum, ys) => sum + ys.count, 0);

  // プロンプト生成
  const handleGeneratePrompt = useCallback(async () => {
    if (!selectedPreset || !selectedCategory) return;
    const grouped = await groupProblemsByYear(selectedCategory);
    if (grouped.size === 0) return;
    const generatedPrompt = generateBatchAnalysisPrompt(
      grouped,
      selectedPreset.name,
      selectedCategory,
      language
    );
    setPrompt(generatedPrompt);
    setCurrentStep(2);
  }, [selectedPreset, selectedCategory, language]);

  // プロンプトコピー
  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }
  }, [prompt]);

  // AI応答パース
  const handleParse = useCallback(() => {
    if (!aiResponse.trim()) return;
    setIsParsing(true);
    setParseError('');
    try {
      const parsed = parseBatchAIResponse(aiResponse);
      if (parsed.yearDistribution) {
        const matrix = buildMatrixFromYearDistribution(parsed.yearDistribution);
        setMatrixData(matrix);
      } else {
        // yearDistributionがない場合はdistributionのみで簡易表示
        setMatrixData({
          subtopics: Object.keys(parsed.distribution),
          years: [],
          matrix: Object.values(parsed.distribution).map(v => [v]),
          totals: {
            bySubtopic: Object.values(parsed.distribution),
            byYear: [Object.values(parsed.distribution).reduce((a, b) => a + b, 0)],
          },
        });
      }
      setCurrentStep(3);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsing(false);
    }
  }, [aiResponse]);

  // DB保存
  const handleSave = useCallback(async () => {
    if (!matrixData || !selectedPresetId || !selectedCategory || isSaved) return;
    setIsSaving(true);
    try {
      const parsed = parseBatchAIResponse(aiResponse);
      const sessions = createBatchSessions(
        parsed,
        `${selectedPreset?.name || selectedPresetId} - ${selectedCategory}`,
        'past-exam'
      );
      await saveBatchSessions(selectedPresetId, selectedCategory, sessions);
      setIsSaved(true);

      // 保存後に頻出問題分析を読み込み
      setLoadingFrequency(true);
      try {
        const freqResult = await generateFrequencyAnalysis(selectedPresetId, selectedCategory);
        setFrequencyResult(freqResult);
      } catch (freqErr) {
        console.error('Frequency analysis failed:', freqErr);
      } finally {
        setLoadingFrequency(false);
      }
    } catch (err) {
      console.error('Save failed:', err);
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }, [matrixData, selectedPresetId, selectedCategory, aiResponse, selectedPreset, isSaved]);

  // ステップインジケーター
  const StepIndicator = ({ step, label, active, completed }: {
    step: number; label: string; active: boolean; completed: boolean;
  }) => (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        active
          ? 'text-[#818CF8] font-semibold'
          : completed
            ? 'text-[#34D399]'
            : 'text-[#64748B]'
      }`}
      style={{
        background: active
          ? 'rgba(99,102,241,0.2)'
          : completed
            ? 'rgba(16,185,129,0.15)'
            : 'rgba(30,41,59,0.5)',
      }}
    >
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
          completed
            ? 'bg-[#10B981] text-white'
            : active
              ? 'bg-[#6366F1] text-white'
              : 'text-[#64748B]'
        }`}
        style={!completed && !active ? { background: 'rgba(51,65,85,0.8)' } : undefined}
      >
        {completed ? '✓' : step}
      </span>
      <span className="text-sm">{label}</span>
    </div>
  );

  // 最大ヒート値計算（マトリクスの色分け用）
  const maxCellValue = matrixData
    ? Math.max(...matrixData.matrix.flat(), 1)
    : 1;

  const getCellColor = (value: number): { className: string; style: React.CSSProperties } => {
    if (value === 0) return { className: 'text-[#64748B]', style: { background: 'rgba(30,41,59,0.3)' } };
    const intensity = value / maxCellValue;
    if (intensity >= 0.8) return { className: 'text-[#FCA5A5] font-bold', style: { background: 'rgba(239,68,68,0.3)' } };
    if (intensity >= 0.5) return { className: 'text-[#FBBF24] font-semibold', style: { background: 'rgba(251,191,36,0.2)' } };
    if (intensity >= 0.3) return { className: 'text-[#FDE68A]', style: { background: 'rgba(251,191,36,0.1)' } };
    return { className: 'text-[#818CF8]', style: { background: 'rgba(99,102,241,0.15)' } };
  };

  return (
    <div className="min-h-screen p-4" style={{ background: '#0F172A' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 text-[#CBD5E1] rounded-lg hover:bg-white/5 transition-colors text-sm border border-white/10"
            style={{ background: 'rgba(30,41,59,0.7)' }}
          >
            {txt.back}
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#F8FAFC]">{txt.title}</h1>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: showGuide ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
                color: showGuide ? '#818CF8' : '#94A3B8',
                border: `1px solid ${showGuide ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              ? {txt.guideTitle}
            </button>
          </div>
          <p className="text-sm text-[#94A3B8] mt-1">{txt.subtitle}</p>
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
                <div className="space-y-2">
                  {txt.guideSteps.map((step: { icon: string; text: string }, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base flex-shrink-0">{step.icon}</span>
                      <span className="text-sm text-[#CBD5E1]">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Indicator */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <StepIndicator step={1} label={txt.step1} active={currentStep === 1} completed={currentStep > 1} />
          <StepIndicator step={2} label={txt.step2} active={currentStep === 2} completed={currentStep > 2} />
          <StepIndicator step={3} label={txt.step3} active={currentStep === 3} completed={isSaved} />
        </div>

        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* Step 1: プリセット＆カテゴリー選択 */}
          {/* ============================================================ */}
          {currentStep >= 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 p-5 mb-4"
              style={{ background: 'rgba(30,41,59,0.7)' }}
            >
              <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">
                {txt.step1}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* プリセット選択 */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    {txt.selectPreset}
                  </label>
                  <select
                    value={selectedPresetId}
                    onChange={e => {
                      setSelectedPresetId(e.target.value);
                      setSelectedCategory('');
                      setYearStats([]);
                      setPrompt('');
                      setMatrixData(null);
                      setIsSaved(false);
                      setCurrentStep(1);
                    }}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-[#F8FAFC] text-sm focus:ring-2 focus:ring-[#6366F1] focus:outline-none"
                    style={{ background: 'rgba(15,23,42,0.5)' }}
                  >
                    <option value="">{txt.noPreset}</option>
                    {allPresets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* カテゴリー選択 */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    {txt.selectCategory}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={e => {
                      setSelectedCategory(e.target.value);
                      setPrompt('');
                      setMatrixData(null);
                      setIsSaved(false);
                      setCurrentStep(1);
                    }}
                    disabled={!selectedPresetId}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-[#F8FAFC] text-sm focus:ring-2 focus:ring-[#6366F1] focus:outline-none disabled:opacity-50"
                    style={{ background: 'rgba(15,23,42,0.5)' }}
                  >
                    <option value="">{txt.noCategory}</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 年度バッジ */}
              {selectedCategory && (
                <div className="mt-4">
                  {loadingYears ? (
                    <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
                      <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  ) : yearStats.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-[#CBD5E1]">
                          {txt.detectedYears}:
                        </span>
                        <span className="text-sm text-[#94A3B8]">
                          {txt.totalProblems}: {totalProblems}{language === 'ja' ? '問' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {yearStats.map(ys => (
                          <span
                            key={ys.year}
                            className="px-3 py-1 text-[#818CF8] rounded-full text-sm font-medium"
                            style={{ background: 'rgba(99,102,241,0.2)' }}
                          >
                            {ys.displayName}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={handleGeneratePrompt}
                        disabled={currentStep > 1}
                        className="mt-4 px-5 py-2.5 bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-40 text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        {txt.generatePrompt}
                      </button>
                    </>
                  ) : (
                    <p
                      className="text-sm text-[#FBBF24] px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(251,191,36,0.1)' }}
                    >
                      {txt.noYearData}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* Step 2: AI分析プロンプト＆応答 */}
          {/* ============================================================ */}
          {currentStep >= 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 p-5 mb-4"
              style={{ background: 'rgba(30,41,59,0.7)' }}
            >
              <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">
                {txt.step2}
              </h2>

              {/* プロンプト表示＆コピー */}
              {prompt && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#94A3B8]">
                      {txt.promptGenerated}
                    </span>
                    <button
                      onClick={handleCopyPrompt}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        promptCopied
                          ? 'bg-[#10B981] text-white'
                          : 'text-[#818CF8] hover:bg-white/5'
                      }`}
                      style={!promptCopied ? { background: 'rgba(99,102,241,0.2)' } : undefined}
                    >
                      {promptCopied ? txt.copied : txt.copyPrompt}
                    </button>
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-[#64748B] hover:text-[#94A3B8]">
                      {language === 'ja' ? 'プロンプトを表示' : 'Show prompt'}
                    </summary>
                    <pre
                      className="mt-2 p-3 rounded-lg text-xs text-[#CBD5E1] overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap"
                      style={{ background: 'rgba(15,23,42,0.5)' }}
                    >
                      {prompt}
                    </pre>
                  </details>
                </div>
              )}

              {/* AI応答入力 */}
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                  {txt.pasteResult}
                </label>
                <textarea
                  value={aiResponse}
                  onChange={e => {
                    setAiResponse(e.target.value);
                    setParseError('');
                  }}
                  placeholder={language === 'ja' ? '```json\n{\n  "distribution": {...},\n  "yearDistribution": {...},\n  ...\n}\n```' : '```json\n{\n  "distribution": {...},\n  "yearDistribution": {...},\n  ...\n}\n```'}
                  rows={8}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg text-[#F8FAFC] text-sm font-mono focus:ring-2 focus:ring-[#6366F1] focus:outline-none resize-y placeholder-[#64748B]"
                  style={{ background: 'rgba(15,23,42,0.5)' }}
                />
                {parseError && (
                  <p
                    className="mt-2 text-sm text-[#EF4444] px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                  >
                    {txt.parseError}: {parseError}
                  </p>
                )}
                <button
                  onClick={handleParse}
                  disabled={!aiResponse.trim() || isParsing}
                  className="mt-3 px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {isParsing ? txt.parsing : txt.parseResult}
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* Step 3: マトリクス表示＆保存 */}
          {/* ============================================================ */}
          {currentStep >= 3 && matrixData && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 p-5 mb-4"
              style={{ background: 'rgba(30,41,59,0.7)' }}
            >
              <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">
                {txt.matrixTitle}
              </h2>

              {/* マトリクステーブル */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th
                        className="text-left px-3 py-2 text-[#CBD5E1] font-semibold rounded-tl-lg sticky left-0 z-10 min-w-[160px]"
                        style={{ background: 'rgba(15,23,42,0.5)' }}
                      >
                        {txt.subtopic}
                      </th>
                      {matrixData.years.map(year => (
                        <th
                          key={year}
                          className="text-center px-3 py-2 text-[#CBD5E1] font-semibold min-w-[60px]"
                          style={{ background: 'rgba(15,23,42,0.5)' }}
                        >
                          {language === 'ja' ? `第${year}回` : `#${year}`}
                        </th>
                      ))}
                      <th
                        className="text-center px-3 py-2 text-[#F8FAFC] font-bold rounded-tr-lg min-w-[60px]"
                        style={{ background: 'rgba(15,23,42,0.7)' }}
                      >
                        {txt.total}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.subtopics.map((st, stIdx) => (
                      <tr key={st} className="border-t border-white/5">
                        <td
                          className="px-3 py-2 text-[#F8FAFC] font-medium sticky left-0 z-10"
                          style={{ background: 'rgba(30,41,59,0.9)' }}
                        >
                          {st}
                        </td>
                        {matrixData.matrix[stIdx].map((val, yIdx) => {
                          const cellStyle = getCellColor(val);
                          return (
                            <td
                              key={yIdx}
                              className={`text-center px-3 py-2 ${cellStyle.className}`}
                              style={cellStyle.style}
                            >
                              {val > 0 ? val : '-'}
                            </td>
                          );
                        })}
                        <td
                          className="text-center px-3 py-2 text-[#F8FAFC] font-bold"
                          style={{ background: 'rgba(15,23,42,0.5)' }}
                        >
                          {matrixData.totals.bySubtopic[stIdx]}
                        </td>
                      </tr>
                    ))}
                    {/* 年度ごとの合計行 */}
                    <tr className="border-t-2 border-white/10">
                      <td
                        className="px-3 py-2 font-bold text-[#F8FAFC] sticky left-0 z-10 rounded-bl-lg"
                        style={{ background: 'rgba(15,23,42,0.5)' }}
                      >
                        {txt.total}
                      </td>
                      {matrixData.totals.byYear.map((val, yIdx) => (
                        <td
                          key={yIdx}
                          className="text-center px-3 py-2 text-[#F8FAFC] font-bold"
                          style={{ background: 'rgba(15,23,42,0.5)' }}
                        >
                          {val}
                        </td>
                      ))}
                      <td
                        className="text-center px-3 py-2 text-[#F8FAFC] font-bold rounded-br-lg"
                        style={{ background: 'rgba(15,23,42,0.7)' }}
                      >
                        {matrixData.totals.bySubtopic.reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 保存ボタン */}
              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving || isSaved}
                  className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    isSaved
                      ? 'bg-[#10B981] text-white cursor-default'
                      : 'bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-40 text-white'
                  }`}
                >
                  {isSaved ? `✓ ${txt.saved}` : isSaving ? txt.saving : txt.saveToDb}
                </button>
                <span className="text-xs text-[#94A3B8]">
                  {isSaved ? txt.alreadySaved : txt.saveDesc}
                </span>
              </div>

              {/* 頻出問題分析 (保存後に表示) */}
              {loadingFrequency && (
                <div className="mt-6 flex items-center gap-2 text-[#94A3B8] text-sm">
                  <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                  {txt.loadingFrequency}
                </div>
              )}

              {frequencyResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-6"
                >
                  {/* サブトピック重要度 */}
                  {frequencyResult.subtopicImportances.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold text-[#F8FAFC] mb-1">
                        {txt.importanceTitle}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mb-3">
                        {txt.importanceDesc}
                      </p>
                      <div className="space-y-2">
                        {frequencyResult.subtopicImportances
                          .sort((a, b) => b.importance - a.importance)
                          .map(si => (
                            <div key={si.name} className="flex items-center gap-3">
                              <span className="text-sm text-[#CBD5E1] w-32 sm:w-40 truncate" title={si.name}>
                                {si.name}
                              </span>
                              <div
                                className="flex-1 h-5 rounded-full overflow-hidden"
                                style={{ background: 'rgba(15,23,42,0.5)' }}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${((si.importance - 1.0) / 1.0) * 100}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className="h-full rounded-full"
                                  style={{
                                    background: si.importance >= 1.7
                                      ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                                      : si.importance >= 1.4
                                        ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                                        : 'linear-gradient(90deg, #6366F1, #4F46E5)',
                                  }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-[#F8FAFC] w-10 text-right">
                                {si.importance.toFixed(2)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 頻出問題パターン */}
                  {frequencyResult.frequentGroups.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold text-[#F8FAFC] mb-1">
                        {txt.frequentTitle}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mb-3">
                        {txt.frequentDesc}
                      </p>
                      <div className="space-y-3">
                        {frequencyResult.frequentGroups.map((group, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border border-white/10"
                            style={{ background: 'rgba(30,41,59,0.5)' }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="px-2 py-0.5 text-[#818CF8] rounded text-xs font-semibold"
                                    style={{ background: 'rgba(99,102,241,0.2)' }}
                                  >
                                    {group.subtopic}
                                  </span>
                                  <span className="text-xs font-bold text-[#EF4444]">
                                    x{group.frequencyCount}{txt.frequentCount}
                                  </span>
                                </div>
                                <p className="text-sm text-[#CBD5E1] line-clamp-2">
                                  {group.representativeText}
                                </p>
                                {group.years && group.years.length > 0 && (
                                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                                    <span className="text-xs text-[#64748B]">{txt.frequentYears}:</span>
                                    {group.years.map(y => (
                                      <span
                                        key={y}
                                        className="text-xs px-1.5 py-0.5 text-[#818CF8] rounded"
                                        style={{ background: 'rgba(99,102,241,0.15)' }}
                                      >
                                        {language === 'ja' ? `${y}回` : `#${y}`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default PastExamAnalysis;
