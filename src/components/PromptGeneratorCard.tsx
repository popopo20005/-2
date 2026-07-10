/**
 * PromptGeneratorCard - プロンプト自動生成UI
 *
 * マスタープラン Phase 1-1 の UI 統合。
 * 方針①「AI API は初期フェーズ導入なし」に従い、外部AI（ChatGPT/Claude/Gemini）
 * にコピペして使えるプロンプトをユーザー学習データから自動生成する。
 *
 * 機能:
 * - スマート生成: 弱点検出・学習プラン・履歴から自動でパラメータ決定
 * - 手動生成: カテゴリー/難易度/問題数/形式を個別指定
 * - 生成されたプロンプトをテキストエリアで表示 + クリップボードコピー
 * - 外部AIサービスへのリンク
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Copy,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Wand2,
  Settings2,
} from 'lucide-react';
import { buildPrompt, buildSmartPrompt } from '../services/promptTemplateEngine';
import type {
  GeneratedPrompt,
  PromptDifficulty,
  PromptFormat,
  PromptOutputFormat,
} from '../services/promptTemplateEngine';
import { problemService } from '../lib/database';

interface PromptGeneratorCardProps {
  onBack?: () => void;
  language?: 'ja' | 'en';
}

type Mode = 'smart' | 'manual';

interface UILabels {
  title: string;
  subtitle: string;
  back: string;
  smartMode: string;
  smartModeDesc: string;
  manualMode: string;
  manualModeDesc: string;
  categories: string;
  categoriesPlaceholder: string;
  count: string;
  difficulty: string;
  format: string;
  referenceText: string;
  referenceTextPlaceholder: string;
  generate: string;
  regenerate: string;
  generating: string;
  copy: string;
  copied: string;
  promptLabel: string;
  recommendedAI: string;
  openInChatGPT: string;
  openInClaude: string;
  openInGemini: string;
  emptyState: string;
  difficultyOptions: Record<PromptDifficulty, string>;
  formatOptions: Record<PromptFormat, string>;
  metaInfo: string;
  resolvedDifficulty: string;
  daysUntilExam: string;
  days: string;
}

const LABELS: Record<'ja' | 'en', UILabels> = {
  ja: {
    title: 'プロンプト自動生成',
    subtitle: '学習データから外部AI用のプロンプトを自動生成します',
    back: '戻る',
    smartMode: 'スマート生成',
    smartModeDesc: '弱点・学習プラン・履歴から自動で最適なプロンプトを作成',
    manualMode: '手動設定',
    manualModeDesc: 'カテゴリー・難易度・問題数を個別に指定',
    categories: '対象カテゴリー（カンマ区切り）',
    categoriesPlaceholder: '例: 臨床栄養学, 基礎栄養学',
    count: '問題数',
    difficulty: '難易度',
    format: '形式',
    referenceText: '参考資料（任意）',
    referenceTextPlaceholder: '教科書の該当箇所やノートを貼り付けてください',
    generate: 'プロンプトを生成',
    regenerate: '再生成',
    generating: '生成中...',
    copy: 'コピー',
    copied: 'コピーしました！',
    promptLabel: '生成されたプロンプト',
    recommendedAI: 'おすすめAI',
    openInChatGPT: 'ChatGPT を開く',
    openInClaude: 'Claude を開く',
    openInGemini: 'Gemini を開く',
    emptyState: '右上の「プロンプトを生成」を押してください',
    difficultyOptions: {
      auto: '自動（あなたの実力に合わせる）',
      easy: '初級',
      normal: '標準',
      hard: '上級',
      expert: '超上級',
    },
    formatOptions: {
      'multiple-choice': '4肢選択',
      'multiple-choice-5': '5肢選択',
      'true-false': '○×判定',
      'fill-in-blank': '穴埋め選択',
      mixed: 'ミックス',
    },
    metaInfo: 'メタ情報',
    resolvedDifficulty: '適用難易度',
    daysUntilExam: '試験まで',
    days: '日',
  },
  en: {
    title: 'Prompt Generator',
    subtitle: 'Auto-generate AI prompts from your learning data',
    back: 'Back',
    smartMode: 'Smart Generate',
    smartModeDesc: 'Auto-build optimal prompt from weaknesses, plans and history',
    manualMode: 'Manual',
    manualModeDesc: 'Specify categories, difficulty and count individually',
    categories: 'Categories (comma separated)',
    categoriesPlaceholder: 'e.g. Nutrition, Anatomy',
    count: 'Number of Questions',
    difficulty: 'Difficulty',
    format: 'Format',
    referenceText: 'Reference Text (optional)',
    referenceTextPlaceholder: 'Paste textbook passages or notes here',
    generate: 'Generate Prompt',
    regenerate: 'Regenerate',
    generating: 'Generating...',
    copy: 'Copy',
    copied: 'Copied!',
    promptLabel: 'Generated Prompt',
    recommendedAI: 'Recommended AI',
    openInChatGPT: 'Open ChatGPT',
    openInClaude: 'Open Claude',
    openInGemini: 'Open Gemini',
    emptyState: 'Press "Generate Prompt" above',
    difficultyOptions: {
      auto: 'Auto (based on your skill)',
      easy: 'Easy',
      normal: 'Normal',
      hard: 'Hard',
      expert: 'Expert',
    },
    formatOptions: {
      'multiple-choice': 'Multiple Choice (4)',
      'multiple-choice-5': 'Multiple Choice (5)',
      'true-false': 'True / False',
      'fill-in-blank': 'Fill in the Blank',
      mixed: 'Mixed',
    },
    metaInfo: 'Metadata',
    resolvedDifficulty: 'Applied Difficulty',
    daysUntilExam: 'Days until exam',
    days: 'days',
  },
};

export function PromptGeneratorCard({ onBack, language = 'ja' }: PromptGeneratorCardProps) {
  const L = LABELS[language];

  const [mode, setMode] = useState<Mode>('smart');
  const [categoriesText, setCategoriesText] = useState('');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<PromptDifficulty>('auto');
  const [format, setFormat] = useState<PromptFormat>('multiple-choice');
  const [outputFormat, setOutputFormat] = useState<PromptOutputFormat>('text');
  const [referenceText, setReferenceText] = useState('');

  const [result, setResult] = useState<GeneratedPrompt | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // カテゴリー候補（DBから取得）
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const problems = await problemService.getAll();
        const set = new Set<string>();
        for (const p of problems) {
          if (p.category) set.add(p.category);
        }
        setAvailableCategories(Array.from(set).sort());
      } catch (e) {
        console.warn('[PromptGeneratorCard] カテゴリー取得に失敗:', e);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setIsCopied(false);

    try {
      const categoriesArr = categoriesText
        .split(/[,、]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const overrides = {
        categories: categoriesArr.length > 0 ? categoriesArr : undefined,
        count,
        difficulty,
        format,
        outputFormat,
        referenceText: referenceText.trim() || undefined,
        lang: language,
      };

      const generated =
        mode === 'smart'
          ? await buildSmartPrompt(overrides)
          : buildPrompt(overrides);

      setResult(generated);
    } catch (e) {
      console.error('[PromptGeneratorCard] 生成エラー:', e);
      setError(language === 'ja' ? 'プロンプトの生成に失敗しました' : 'Failed to generate prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.prompt);
      localStorage.setItem('promptGenerated', 'true');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.error('[PromptGeneratorCard] コピーエラー:', e);
    }
  };

  const toggleCategory = (cat: string) => {
    const current = categoriesText
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const idx = current.indexOf(cat);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(cat);
    }
    setCategoriesText(current.join(', '));
  };

  const selectedCategories = new Set(
    categoriesText
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#0F172A' }}>
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors"
                style={{ background: 'transparent', color: '#94A3B8' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowLeft className="w-4 h-4" />
                {L.back}
              </button>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ color: '#F8FAFC' }}>
                <Sparkles className="w-7 h-7" style={{ color: '#818CF8' }} />
                {L.title}
              </h1>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>{L.subtitle}</p>
            </div>
          </div>
        </div>

        {/* モード選択 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <ModeToggle
            active={mode === 'smart'}
            onClick={() => setMode('smart')}
            icon={<Wand2 className="w-5 h-5" />}
            title={L.smartMode}
            description={L.smartModeDesc}
          />
          <ModeToggle
            active={mode === 'manual'}
            onClick={() => setMode('manual')}
            icon={<Settings2 className="w-5 h-5" />}
            title={L.manualMode}
            description={L.manualModeDesc}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 左: パラメータ設定 */}
          <div
            className="lg:col-span-2 rounded-2xl p-5 space-y-4"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* カテゴリー */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>
                {L.categories}
              </label>
              <input
                type="text"
                value={categoriesText}
                onChange={(e) => setCategoriesText(e.target.value)}
                placeholder={L.categoriesPlaceholder}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent outline-none"
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F8FAFC',
                }}
              />
              {availableCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto">
                  {availableCategories.slice(0, 20).map((cat) => {
                    const selected = selectedCategories.has(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="px-2.5 py-1 text-xs rounded-full transition-colors"
                        style={{
                          background: selected ? '#6366F1' : 'rgba(255,255,255,0.05)',
                          color: selected ? '#FFFFFF' : '#CBD5E1',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 問題数 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>
                {L.count}: <span className="font-bold" style={{ color: '#818CF8' }}>{count}</span>
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-[#6366F1]"
              />
              <div className="flex justify-between text-xs" style={{ color: '#64748B' }}>
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            {/* 難易度 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>
                {L.difficulty}
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as PromptDifficulty)}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#6366F1] outline-none"
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F8FAFC',
                }}
              >
                {(['auto', 'easy', 'normal', 'hard', 'expert'] as PromptDifficulty[]).map((d) => (
                  <option key={d} value={d}>
                    {L.difficultyOptions[d]}
                  </option>
                ))}
              </select>
            </div>

            {/* 形式 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>
                {L.format}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as PromptFormat)}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#6366F1] outline-none"
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F8FAFC',
                }}
              >
                {(['multiple-choice', 'multiple-choice-5', 'true-false', 'fill-in-blank', 'mixed'] as PromptFormat[]).map((f) => (
                  <option key={f} value={f}>
                    {L.formatOptions[f]}
                  </option>
                ))}
              </select>
            </div>

            {/* 出力フォーマット (テキスト / JSON) */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>
                {language === 'ja' ? '出力フォーマット' : 'Output Format'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat('text')}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: outputFormat === 'text' ? '#6366F1' : 'rgba(255,255,255,0.05)',
                    border: outputFormat === 'text' ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.1)',
                    color: outputFormat === 'text' ? '#FFFFFF' : '#94A3B8',
                    boxShadow: outputFormat === 'text' ? '0 4px 6px -1px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  {language === 'ja' ? 'テキスト' : 'Text'}
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat('json')}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: outputFormat === 'json' ? '#6366F1' : 'rgba(255,255,255,0.05)',
                    border: outputFormat === 'json' ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.1)',
                    color: outputFormat === 'json' ? '#FFFFFF' : '#94A3B8',
                    boxShadow: outputFormat === 'json' ? '0 4px 6px -1px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  {language === 'ja' ? 'JSON (推奨)' : 'JSON (recommended)'}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#64748B' }}>
                {language === 'ja'
                  ? 'JSON形式はインポート時のカテゴリー自動振り分けが正確です'
                  : 'JSON format ensures accurate category routing on import'}
              </p>
            </div>

            {/* 参考資料 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#CBD5E1' }}>
                {L.referenceText}
              </label>
              <textarea
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder={L.referenceTextPlaceholder}
                rows={4}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-[#6366F1] resize-y outline-none"
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F8FAFC',
                }}
              />
            </div>

            {/* 生成ボタン */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition-colors disabled:opacity-50"
              style={{ background: '#6366F1', color: '#FFFFFF' }}
              onMouseEnter={(e) => { if (!isGenerating) e.currentTarget.style.background = '#5558E6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#6366F1'; }}
            >
              {result ? <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? L.generating : result ? L.regenerate : L.generate}
            </button>

            {error && (
              <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
            )}
          </div>

          {/* 右: 生成結果 */}
          <div
            className="lg:col-span-3 rounded-2xl p-5"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {!result ? (
              <div className="flex flex-col items-center justify-center min-h-[400px]" style={{ color: '#64748B' }}>
                <Sparkles className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-center">{L.emptyState}</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* ヘッダー（コピーボタン） */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: '#F8FAFC' }}>
                    {L.promptLabel}
                  </h2>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: isCopied ? '#10B981' : '#6366F1',
                      color: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCopied) e.currentTarget.style.background = '#5558E6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isCopied ? '#10B981' : '#6366F1';
                    }}
                  >
                    {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? L.copied : L.copy}
                  </button>
                </div>

                {/* プロンプト本文 */}
                <textarea
                  readOnly
                  value={result.prompt}
                  className="w-full h-96 p-4 rounded-lg text-xs md:text-sm font-mono leading-relaxed resize-y outline-none"
                  style={{
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#CBD5E1',
                  }}
                />

                {/* メタ情報 */}
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: '#818CF8' }}>
                    {L.metaInfo}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#CBD5E1' }}>
                    <div>
                      <span style={{ color: '#94A3B8' }}>{L.resolvedDifficulty}:</span>{' '}
                      <span className="font-medium">{L.difficultyOptions[result.resolvedDifficulty]}</span>
                    </div>
                    <div>
                      <span style={{ color: '#94A3B8' }}>{L.count}:</span>{' '}
                      <span className="font-medium">{result.metadata.count}</span>
                    </div>
                    {result.metadata.daysUntilExam !== undefined && (
                      <div>
                        <span style={{ color: '#94A3B8' }}>{L.daysUntilExam}:</span>{' '}
                        <span className="font-medium">
                          {result.metadata.daysUntilExam} {L.days}
                        </span>
                      </div>
                    )}
                    {result.metadata.currentAccuracy !== undefined && (
                      <div>
                        <span style={{ color: '#94A3B8' }}>Accuracy:</span>{' '}
                        <span className="font-medium">
                          {Math.round(result.metadata.currentAccuracy)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 外部AIリンク */}
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: '#CBD5E1' }}>
                    {L.recommendedAI}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://chatgpt.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{
                        background: 'rgba(16,185,129,0.15)',
                        color: '#34D399',
                        border: '1px solid rgba(16,185,129,0.2)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.25)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.15)')}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {L.openInChatGPT}
                    </a>
                    <a
                      href="https://claude.ai/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{
                        background: 'rgba(251,146,60,0.15)',
                        color: '#FB923C',
                        border: '1px solid rgba(251,146,60,0.2)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(251,146,60,0.25)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(251,146,60,0.15)')}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {L.openInClaude}
                    </a>
                    <a
                      href="https://gemini.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{
                        background: 'rgba(99,102,241,0.15)',
                        color: '#818CF8',
                        border: '1px solid rgba(99,102,241,0.2)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.25)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {L.openInGemini}
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** モード切替トグル */
function ModeToggle({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-4 rounded-xl transition-all"
      style={{
        background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
        border: active ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)',
        color: active ? '#818CF8' : '#94A3B8',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="font-semibold" style={{ color: active ? '#818CF8' : '#CBD5E1' }}>{title}</span>
      </div>
      <p className="text-xs" style={{ color: active ? '#818CF8' : '#64748B' }}>
        {description}
      </p>
    </button>
  );
}
