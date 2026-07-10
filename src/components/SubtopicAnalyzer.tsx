/**
 * SubtopicAnalyzer - サブトピック頻出度分析UI
 *
 * 科目別のサブトピック重要度を表示・管理する画面。
 * 静的プリセット + 個人データのブレンド結果を可視化し、
 * 新しい分析セッションの追加やAI分析プロンプト生成を行う。
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateSubtopicImportances,
  getExamGrowthSummary,
  addAnalysisSession,
  generateFrequencyAnalysis,
} from '../services/subtopicAnalysisService';
import type { GrowthStatus } from '../services/subtopicAnalysisService';
import {
  generateAnalysisPrompt,
  parseAIResponse,
  createSessionFromParsed,
  createSessionFromProblems,
} from '../services/subtopicPromptGenerator';
import { problemService } from '../lib/database';
import type { SubtopicImportanceResult, FrequencyAnalysisResult, AnalysisSession } from '../types/subtopicAnalysis';

type Lang = 'ja' | 'en';

// ============================================================
// 国際化テキスト
// ============================================================

const t = {
  ja: {
    title: 'サブトピック分析',
    subtitle: '科目内の頻出分野を分析し、学習の優先度を最適化します',
    back: '← 戻る',
    growthOverview: '成長状態一覧',
    noPreset: 'このプリセットにはサブトピックデータがありません',
    selectSubject: '分析する科目を選択',
    importanceChart: '重要度分布',
    importance: '重要度',
    source: 'ソース',
    confidence: '信頼度',
    count: '出現数',
    sessions: 'セッション',
    addSession: '分析データを追加',
    addSessionDesc: '問題データからサブトピック分析を行い、統計精度を向上させます',
    methodAI: 'AIで分析',
    methodDirect: 'DBから直接',
    aiPromptTitle: 'AI分析プロンプト',
    aiPromptDesc: '以下のプロンプトをAI(Claude/ChatGPT等)にコピーして分析してもらい、結果のJSONを貼り付けてください',
    copyPrompt: 'プロンプトをコピー',
    copied: 'コピーしました！',
    pasteResult: 'AI応答のJSONを貼り付け',
    parseAndAdd: '解析して追加',
    sessionName: 'セッション名',
    sessionNamePlaceholder: '例: 2024年度過去問',
    sourceType: 'データソース',
    sourceTypes: {
      'past-exam': '過去問',
      'mock-exam': '模試',
      'textbook': '教科書',
      'question-bank': '問題集',
      'other': 'その他',
    } as Record<string, string>,
    sourceYear: '出題年度',
    cancel: 'キャンセル',
    deleteSession: '削除',
    confirmDelete: 'このセッションを削除しますか？',
    frequentProblems: '頻出問題',
    noFrequentProblems: '頻出問題データがまだありません',
    times: '回',
    years: '出題年度',
    growthProgress: '成長進捗',
    nextLevel: '次のレベルまで',
    sessionsNeeded: 'あと{n}セッション',
    problemsNeeded: 'あと{n}問',
    noProblemData: 'この科目の問題がDBにありません',
    directAnalysis: 'DB内の問題を直接分析',
    directAnalysisDesc: 'subtopicフィールドがある問題から自動分析します',
    noSubtopicData: 'subtopicフィールドが設定された問題がありません',
    analyzeSuccess: '分析データを追加しました！',
    error: 'エラーが発生しました',
    guideTitle: '使い方ガイド',
    guideSteps: [
      { icon: '1️⃣', text: '上の成長グリッドから分析したい科目を選択' },
      { icon: '2️⃣', text: '重要度分布チャートで各サブトピックの出題頻度を確認' },
      { icon: '3️⃣', text: '「+ 分析データを追加」で新しいデータを追加' },
      { icon: '💡', text: 'AIで分析: プロンプトをコピー → ChatGPT/Claudeに貼り付け → 結果のJSONを貼り付け' },
      { icon: '📊', text: 'DBから直接: subtopicフィールドがある問題を自動で分析' },
    ],
  },
  en: {
    title: 'Subtopic Analysis',
    subtitle: 'Analyze frequent topics within subjects to optimize study priority',
    back: '← Back',
    growthOverview: 'Growth Overview',
    noPreset: 'No subtopic data available for this preset',
    selectSubject: 'Select a subject to analyze',
    importanceChart: 'Importance Distribution',
    importance: 'Importance',
    source: 'Source',
    confidence: 'Confidence',
    count: 'Count',
    sessions: 'Sessions',
    addSession: 'Add Analysis Data',
    addSessionDesc: 'Analyze problem data to improve statistical accuracy',
    methodAI: 'AI Analysis',
    methodDirect: 'From DB',
    aiPromptTitle: 'AI Analysis Prompt',
    aiPromptDesc: 'Copy this prompt to AI (Claude/ChatGPT etc.) and paste the JSON result',
    copyPrompt: 'Copy Prompt',
    copied: 'Copied!',
    pasteResult: 'Paste AI response JSON',
    parseAndAdd: 'Parse & Add',
    sessionName: 'Session Name',
    sessionNamePlaceholder: 'e.g. 2024 Past Exam',
    sourceType: 'Data Source',
    sourceTypes: {
      'past-exam': 'Past Exam',
      'mock-exam': 'Mock Exam',
      'textbook': 'Textbook',
      'question-bank': 'Question Bank',
      'other': 'Other',
    } as Record<string, string>,
    sourceYear: 'Exam Year',
    cancel: 'Cancel',
    deleteSession: 'Delete',
    confirmDelete: 'Delete this session?',
    frequentProblems: 'Frequent Problems',
    noFrequentProblems: 'No frequent problem data yet',
    times: 'times',
    years: 'Years',
    growthProgress: 'Growth Progress',
    nextLevel: 'Next level requires',
    sessionsNeeded: '{n} more sessions',
    problemsNeeded: '{n} more problems',
    noProblemData: 'No problems found for this subject in DB',
    directAnalysis: 'Analyze from DB',
    directAnalysisDesc: 'Auto-analyze problems with subtopic field',
    noSubtopicData: 'No problems with subtopic field found',
    analyzeSuccess: 'Analysis data added!',
    error: 'An error occurred',
    guideTitle: 'How to Use',
    guideSteps: [
      { icon: '1️⃣', text: 'Select a subject from the growth grid above' },
      { icon: '2️⃣', text: 'View the importance chart for that subject' },
      { icon: '3️⃣', text: 'Click "+ Add Analysis Data" to add new data' },
      { icon: '💡', text: 'AI Analysis: Copy the prompt → paste into ChatGPT/Claude → paste the JSON response back' },
      { icon: '📊', text: 'From DB: Auto-analyze problems that already have subtopic fields' },
    ],
  },
};

// ============================================================
// Props
// ============================================================

interface SubtopicAnalyzerProps {
  examId: string;
  examName: string;
  subjects: string[];
  onBack: () => void;
  lang?: Lang;
}

// ============================================================
// メインコンポーネント
// ============================================================

export function SubtopicAnalyzer({ examId, examName, subjects, onBack, lang = 'ja' }: SubtopicAnalyzerProps) {
  const text = t[lang];

  const [showGuide, setShowGuide] = useState(false);
  const [growthStatuses, setGrowthStatuses] = useState<GrowthStatus[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [importances, setImportances] = useState<SubtopicImportanceResult[]>([]);
  const [analysisResult, setAnalysisResult] = useState<FrequencyAnalysisResult | null>(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // DBからカテゴリを自動取得（subjectsが空の場合）
  useEffect(() => {
    if (subjects.length === 0) {
      (async () => {
        try {
          const allProblems = await problemService.getAll();
          const cats = new Set<string>();
          allProblems.forEach(p => {
            if (p.category) cats.add(p.category);
          });
          setDbCategories(Array.from(cats).sort());
        } catch (e) {
          console.error('[SubtopicAnalyzer] カテゴリ取得エラー:', e);
        }
      })();
    }
  }, [subjects]);

  // 実際に使用するカテゴリ一覧
  const effectiveSubjects = subjects.length > 0 ? subjects : dbCategories;

  // 成長状態の読み込み
  const loadGrowth = useCallback(async () => {
    const statuses = await getExamGrowthSummary(examId);
    setGrowthStatuses(statuses);
  }, [examId]);

  useEffect(() => {
    loadGrowth();
  }, [loadGrowth]);

  // 科目選択時のデータ読み込み
  const loadSubjectData = useCallback(async (subject: string) => {
    const [imps, analysis] = await Promise.all([
      calculateSubtopicImportances(examId, subject),
      generateFrequencyAnalysis(examId, subject),
    ]);
    setImportances(imps);
    setAnalysisResult(analysis);
  }, [examId]);

  useEffect(() => {
    if (selectedSubject) {
      loadSubjectData(selectedSubject);
    }
  }, [selectedSubject, loadSubjectData]);

  const handleSessionAdded = useCallback(async () => {
    setShowAddSession(false);
    setMessage({ type: 'success', text: text.analyzeSuccess });
    setTimeout(() => setMessage(null), 3000);
    await loadGrowth();
    if (selectedSubject) {
      await loadSubjectData(selectedSubject);
    }
  }, [loadGrowth, loadSubjectData, selectedSubject, text.analyzeSuccess]);


  return (
    <div className="min-h-screen p-4" style={{ background: '#0F172A' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button onClick={onBack} className="text-[#94A3B8] hover:text-[#F8FAFC] mb-2 text-sm transition-colors">
            {text.back}
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#F8FAFC]">{text.title}</h1>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: showGuide ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
                color: showGuide ? '#818CF8' : '#94A3B8',
                border: `1px solid ${showGuide ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              ? {text.guideTitle}
            </button>
          </div>
          <p className="text-sm text-[#94A3B8] mt-1">{examName} - {text.subtitle}</p>
        </motion.div>

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
                  {text.guideSteps.map((step, i) => (
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

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                background: message.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: message.type === 'success' ? '#34D399' : '#EF4444',
                border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Growth Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <h2 className="text-sm font-semibold text-[#CBD5E1] mb-3">{text.growthOverview}</h2>
          {effectiveSubjects.length === 0 && growthStatuses.length === 0 && (
            <div className="text-center py-6">
              <span className="text-3xl mb-2 block">📊</span>
              <p className="text-sm text-[#94A3B8]">
                {lang === 'ja'
                  ? '問題データにカテゴリが設定されていません。問題をインポートして、カテゴリを設定してください。'
                  : 'No categories found in problem data. Import problems with categories to get started.'}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(effectiveSubjects.length > 0 ? effectiveSubjects : growthStatuses.map(g => g.category)).map((subject) => {
              const status = growthStatuses.find((g) => g.category === subject);
              const isSelected = selectedSubject === subject;
              return (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(isSelected ? null : subject)}
                  className="p-3 rounded-lg text-left transition-all"
                  style={{
                    background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isSelected ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-lg">{status?.growthEmoji ?? '🌰'}</span>
                    <span className="text-xs font-medium text-[#CBD5E1] truncate">{subject}</span>
                  </div>
                  <div className="text-xs text-[#64748B]">
                    {status ? `${status.sessionCount} ${text.sessions} / ${status.totalProblems}問` : text.growthProgress}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Selected Subject Detail */}
        <AnimatePresence mode="wait">
          {selectedSubject && (
            <motion.div
              key={selectedSubject}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Importance Chart */}
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#CBD5E1]">{text.importanceChart}</h3>
                  <button
                    onClick={() => setShowAddSession(true)}
                    className="text-xs px-3 py-1.5 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg transition-colors"
                  >
                    + {text.addSession}
                  </button>
                </div>

                {importances.length > 0 ? (
                  <div className="space-y-2">
                    {importances.map((imp) => {
                      const percentage = ((imp.importance - 1.0) / 1.0) * 100;
                      return (
                        <div key={imp.name} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#CBD5E1] truncate max-w-[50%]" title={imp.name}>
                              {imp.name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-[#64748B]">
                              <span>{imp.importance.toFixed(2)}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{
                                  background: imp.confidence === 'high' ? 'rgba(16,185,129,0.15)' :
                                    imp.confidence === 'medium' ? 'rgba(245,158,11,0.15)' :
                                    imp.confidence === 'low' ? 'rgba(245,158,11,0.15)' :
                                    'rgba(255,255,255,0.08)',
                                  color: imp.confidence === 'high' ? '#34D399' :
                                    imp.confidence === 'medium' ? '#F59E0B' :
                                    imp.confidence === 'low' ? '#F59E0B' :
                                    '#64748B',
                                }}
                              >
                                {imp.source}
                              </span>
                            </div>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-2 rounded-full"
                              style={{ background: 'linear-gradient(to right, #6366F1, #818CF8)' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B] text-center py-4">{text.noPreset}</p>
                )}
              </div>

              {/* Growth Progress */}
              {(() => {
                const status = growthStatuses.find((g) => g.category === selectedSubject);
                if (!status || !status.nextLevelRequirement) return null;
                return (
                  <div
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <h3 className="text-sm font-semibold text-[#CBD5E1] mb-2">{text.growthProgress}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{status.growthEmoji}</span>
                      <div>
                        <p className="text-sm font-medium text-[#CBD5E1]">
                          {status.growthLabel[lang]}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {text.nextLevel}: {' '}
                          {status.nextLevelRequirement.sessionsNeeded > 0 &&
                            text.sessionsNeeded.replace('{n}', String(status.nextLevelRequirement.sessionsNeeded))}
                          {status.nextLevelRequirement.sessionsNeeded > 0 && status.nextLevelRequirement.problemsNeeded > 0 && ' / '}
                          {status.nextLevelRequirement.problemsNeeded > 0 &&
                            text.problemsNeeded.replace('{n}', String(status.nextLevelRequirement.problemsNeeded))}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Frequent Problems */}
              {analysisResult && analysisResult.frequentGroups.length > 0 && (
                <div
                  className="rounded-2xl p-5"
                  style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <h3 className="text-sm font-semibold text-[#CBD5E1] mb-3">{text.frequentProblems}</h3>
                  <div className="space-y-3">
                    {analysisResult.frequentGroups.slice(0, 5).map((group) => (
                      <div
                        key={group.id}
                        className="rounded-lg p-3"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[#818CF8]">{group.subtopic}</span>
                          <span className="text-xs text-[#64748B]">
                            {group.frequencyCount}{text.times}
                          </span>
                        </div>
                        <p className="text-xs text-[#CBD5E1] line-clamp-2">
                          {group.representativeText}
                        </p>
                        {group.years.length > 0 && (
                          <p className="text-[10px] text-[#64748B] mt-1">
                            {text.years}: {group.years.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Session Modal */}
        <AnimatePresence>
          {showAddSession && selectedSubject && (
            <AddSessionModal
              examId={examId}
              examName={examName}
              category={selectedSubject}
              lang={lang}
              onClose={() => setShowAddSession(false)}
              onAdded={handleSessionAdded}
              onError={(err) => {
                setMessage({ type: 'error', text: err });
                setTimeout(() => setMessage(null), 5000);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// セッション追加モーダル
// ============================================================

interface AddSessionModalProps {
  examId: string;
  examName: string;
  category: string;
  lang: Lang;
  onClose: () => void;
  onAdded: () => void;
  onError: (msg: string) => void;
}

function AddSessionModal({ examId, examName, category, lang, onClose, onAdded, onError }: AddSessionModalProps) {
  const text = t[lang];

  const [method, setMethod] = useState<'ai' | 'direct'>('ai');
  const [sessionName, setSessionName] = useState('');
  const [sourceType, setSourceType] = useState<AnalysisSession['sourceType']>('past-exam');
  const [sourceYear, setSourceYear] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // AI分析用プロンプトを生成
  const generatePrompt = useCallback(async () => {
    const problems = await problemService.getByCategory(category);
    if (problems.length === 0) {
      onError(text.noProblemData);
      return;
    }
    const promptText = generateAnalysisPrompt(problems, examName, category, lang);
    setPrompt(promptText);
  }, [category, examName, lang, onError, text.noProblemData]);

  useEffect(() => {
    if (method === 'ai') {
      generatePrompt();
    }
  }, [method, generatePrompt]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  const handleParseAndAdd = useCallback(async () => {
    if (!sessionName.trim()) return;
    setIsProcessing(true);
    try {
      const parsed = parseAIResponse(aiResponse);
      const session = createSessionFromParsed(
        parsed,
        sessionName.trim(),
        sourceType,
        sourceYear ? parseInt(sourceYear) : undefined
      );
      await addAnalysisSession(examId, category, session);
      onAdded();
    } catch (e) {
      onError(e instanceof Error ? e.message : text.error);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionName, aiResponse, sourceType, sourceYear, examId, category, onAdded, onError, text.error]);

  const handleDirectAnalysis = useCallback(async () => {
    if (!sessionName.trim()) return;
    setIsProcessing(true);
    try {
      const problems = await problemService.getByCategory(category);
      const session = createSessionFromProblems(problems, sessionName.trim(), 'question-bank');
      if (!session) {
        onError(text.noSubtopicData);
        return;
      }
      await addAnalysisSession(examId, category, session);
      onAdded();
    } catch (e) {
      onError(e instanceof Error ? e.message : text.error);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionName, category, examId, onAdded, onError, text.noSubtopicData, text.error]);

  const inputStyle = {
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
        style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="p-5">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-1">{text.addSession}</h3>
          <p className="text-xs text-[#64748B] mb-4">{text.addSessionDesc}</p>

          {/* Method Tabs */}
          <div className="flex gap-2 mb-4">
            {(['ai', 'direct'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  method === m
                    ? 'bg-[#6366F1] text-white'
                    : 'text-[#94A3B8] hover:bg-white/5'
                }`}
                style={method !== m ? { background: 'rgba(255,255,255,0.05)' } : undefined}
              >
                {m === 'ai' ? text.methodAI : text.methodDirect}
              </button>
            ))}
          </div>

          {/* Common Fields */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">{text.sessionName}</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder={text.sessionNamePlaceholder}
                className="w-full px-3 py-2 rounded-lg text-[#F8FAFC] text-sm focus:ring-2 focus:ring-[#6366F1] focus:outline-none placeholder-[#64748B]"
                style={inputStyle}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">{text.sourceType}</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as AnalysisSession['sourceType'])}
                  className="w-full px-3 py-2 rounded-lg text-[#F8FAFC] text-sm focus:ring-2 focus:ring-[#6366F1] focus:outline-none"
                  style={inputStyle}
                >
                  {Object.entries(text.sourceTypes).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">{text.sourceYear}</label>
                <input
                  type="number"
                  value={sourceYear}
                  onChange={(e) => setSourceYear(e.target.value)}
                  placeholder="2024"
                  className="w-full px-3 py-2 rounded-lg text-[#F8FAFC] text-sm focus:ring-2 focus:ring-[#6366F1] focus:outline-none placeholder-[#64748B]"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* AI Method */}
          {method === 'ai' && (
            <div className="space-y-3">
              {prompt && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#94A3B8]">{text.aiPromptTitle}</label>
                    <button
                      onClick={handleCopy}
                      className="text-xs text-[#818CF8] hover:underline"
                    >
                      {copied ? text.copied : text.copyPrompt}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#64748B] mb-1">{text.aiPromptDesc}</p>
                  <textarea
                    readOnly
                    value={prompt}
                    className="w-full h-32 px-3 py-2 rounded-lg text-[#94A3B8] text-xs font-mono resize-none"
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">{text.pasteResult}</label>
                <textarea
                  value={aiResponse}
                  onChange={(e) => setAiResponse(e.target.value)}
                  placeholder='{"distribution": {...}, "problems": [...]}'
                  className="w-full h-32 px-3 py-2 rounded-lg text-[#F8FAFC] text-xs font-mono resize-none focus:ring-2 focus:ring-[#6366F1] focus:outline-none placeholder-[#64748B]"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleParseAndAdd}
                disabled={!sessionName.trim() || !aiResponse.trim() || isProcessing}
                className="w-full py-2.5 bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {isProcessing ? '...' : text.parseAndAdd}
              </button>
            </div>
          )}

          {/* Direct Method */}
          {method === 'direct' && (
            <div className="space-y-3">
              <p className="text-xs text-[#94A3B8]">{text.directAnalysisDesc}</p>
              <button
                onClick={handleDirectAnalysis}
                disabled={!sessionName.trim() || isProcessing}
                className="w-full py-2.5 bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {isProcessing ? '...' : text.directAnalysis}
              </button>
            </div>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-sm text-[#64748B] hover:text-[#F8FAFC] transition-colors"
          >
            {text.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SubtopicAnalyzer;
