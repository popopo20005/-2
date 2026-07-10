/**
 * CustomPresetCreator - カスタムプリセット作成/編集モーダル
 *
 * ゼロから作成、組み込みから複製、JSONインポート、AI配点提案の
 * 4つの作成方法を提供する。
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userPresetService } from '../services/userPresetService';
import { EXAM_PRESETS } from '../lib/examPresets';
import { convertPresetWeightsToCoefficients } from '../lib/examPresets';
import type { UserPreset } from '../types/userPreset';

// ============================================================
// 国際化テキスト
// ============================================================

const t = {
  ja: {
    createTitle: 'カスタムプリセット作成',
    editTitle: 'カスタムプリセット編集',
    // 作成方法選択
    methodTitle: '作成方法を選択',
    methodScratch: 'ゼロから作成',
    methodScratchDesc: 'カテゴリーと配点を手動入力',
    methodClone: '組み込みから複製',
    methodCloneDesc: '既存プリセットをベースに編集',
    methodImport: 'JSONからインポート',
    methodImportDesc: '他ユーザーが作ったプリセットを取り込み',
    methodAI: 'AIに配点を提案してもらう',
    methodAIDesc: '試験名からAIプロンプトを生成',
    // フォーム
    presetName: 'プリセット名',
    presetNamePlaceholder: '例: 社内昇格試験',
    description: '説明（任意）',
    descriptionPlaceholder: '例: 年1回実施、50問...',
    categoryLabel: 'カテゴリー',
    categories: {
      medical: '医療・福祉',
      business: 'ビジネス',
      language: '語学',
      other: 'その他',
      custom: 'カスタム',
    } as Record<string, string>,
    iconEmoji: 'アイコン',
    // 配点
    weightsTitle: 'カテゴリーと配点',
    addCategory: '+ カテゴリー追加',
    categoryName: 'カテゴリー名',
    weight: '配点',
    remove: '削除',
    // プレビュー
    coefficientPreview: '係数プレビュー',
    // 複製
    selectSource: '複製元のプリセットを選択',
    // インポート
    importPaste: 'JSONを貼り付け',
    importParsing: 'パース中...',
    importError: 'JSONの解析に失敗しました',
    importSuccess: 'パース成功!',
    // AI
    aiExamName: '試験名を入力',
    aiExamNamePlaceholder: '例: 応用情報技術者試験',
    aiGeneratePrompt: 'プロンプト生成',
    aiCopyPrompt: 'コピー',
    aiCopied: 'コピーしました',
    aiPasteResult: 'AIの応答を貼り付け',
    aiPasteButton: 'パースして適用',
    // ボタン
    cancel: 'キャンセル',
    create: '作成',
    save: '保存',
    back: '← 戻る',
    // バリデーション
    nameRequired: 'プリセット名を入力してください',
    needCategories: 'カテゴリーを1つ以上追加してください',
  },
  en: {
    createTitle: 'Create Custom Preset',
    editTitle: 'Edit Custom Preset',
    methodTitle: 'Select creation method',
    methodScratch: 'Create from scratch',
    methodScratchDesc: 'Manually enter categories and weights',
    methodClone: 'Clone built-in',
    methodCloneDesc: 'Start from an existing preset',
    methodImport: 'Import from JSON',
    methodImportDesc: "Import another user's preset",
    methodAI: 'AI-suggested weights',
    methodAIDesc: 'Generate a prompt to get weights from AI',
    presetName: 'Preset Name',
    presetNamePlaceholder: 'e.g. Company Promotion Test',
    description: 'Description (optional)',
    descriptionPlaceholder: 'e.g. Annual exam, 50 questions...',
    categoryLabel: 'Category',
    categories: {
      medical: 'Medical',
      business: 'Business',
      language: 'Language',
      other: 'Other',
      custom: 'Custom',
    } as Record<string, string>,
    iconEmoji: 'Icon',
    weightsTitle: 'Categories & Weights',
    addCategory: '+ Add Category',
    categoryName: 'Category name',
    weight: 'Weight',
    remove: 'Remove',
    coefficientPreview: 'Coefficient Preview',
    selectSource: 'Select source preset',
    importPaste: 'Paste JSON',
    importParsing: 'Parsing...',
    importError: 'Failed to parse JSON',
    importSuccess: 'Parsed successfully!',
    aiExamName: 'Enter exam name',
    aiExamNamePlaceholder: 'e.g. AWS Solutions Architect',
    aiGeneratePrompt: 'Generate Prompt',
    aiCopyPrompt: 'Copy',
    aiCopied: 'Copied',
    aiPasteResult: 'Paste AI response',
    aiPasteButton: 'Parse & Apply',
    cancel: 'Cancel',
    create: 'Create',
    save: 'Save',
    back: '< Back',
    nameRequired: 'Please enter a preset name',
    needCategories: 'Add at least one category',
  },
};

type Lang = 'ja' | 'en';
type CreationMethod = 'select' | 'scratch' | 'clone' | 'import' | 'ai';

// ============================================================
// Props
// ============================================================

interface CustomPresetCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (presetId: string) => void;
  editPreset?: UserPreset | null;
  lang?: Lang;
}

// ============================================================
// 絵文字セレクション
// ============================================================

const EMOJI_OPTIONS = ['📚', '🎓', '🏥', '💼', '🌐', '📝', '🔬', '💻', '🏢', '📊', '🎯', '✏️'];

// ============================================================
// Component
// ============================================================

export function CustomPresetCreator({
  isOpen,
  onClose,
  onCreated,
  editPreset = null,
  lang = 'ja',
}: CustomPresetCreatorProps) {
  const text = t[lang];
  const isEdit = !!editPreset;

  // State
  const [method, setMethod] = useState<CreationMethod>(isEdit ? 'scratch' : 'select');
  const [name, setName] = useState(editPreset?.name ?? '');
  const [description, setDescription] = useState(editPreset?.description ?? '');
  const [category, setCategory] = useState<string>(editPreset?.category ?? 'custom');
  const [iconEmoji, setIconEmoji] = useState(editPreset?.iconEmoji ?? '📚');
  const [weightEntries, setWeightEntries] = useState<Array<{ name: string; weight: number }>>(
    editPreset
      ? Object.entries(editPreset.weights).map(([n, w]) => ({ name: n, weight: w }))
      : [{ name: '', weight: 10 }]
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI state
  const [aiExamName, setAiExamName] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiCopied, setAiCopied] = useState(false);

  // Import state
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Reset on open
  useEffect(() => {
    if (isOpen && !isEdit) {
      setMethod('select');
      setName('');
      setDescription('');
      setCategory('custom');
      setIconEmoji('📚');
      setWeightEntries([{ name: '', weight: 10 }]);
      setError(null);
      setAiExamName('');
      setAiPrompt('');
      setAiResponse('');
      setImportJson('');
      setImportStatus('idle');
    }
  }, [isOpen, isEdit]);

  // Add weight entry
  const addEntry = useCallback(() => {
    setWeightEntries((prev) => [...prev, { name: '', weight: 10 }]);
  }, []);

  // Remove weight entry
  const removeEntry = useCallback((idx: number) => {
    setWeightEntries((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Update weight entry
  const updateEntry = useCallback((idx: number, field: 'name' | 'weight', value: string | number) => {
    setWeightEntries((prev) => {
      const next = [...prev];
      if (field === 'name') {
        next[idx] = { ...next[idx], name: value as string };
      } else {
        next[idx] = { ...next[idx], weight: Math.max(0, Number(value)) };
      }
      return next;
    });
  }, []);

  // Clone from built-in
  const handleClone = useCallback((sourceId: string) => {
    const preset = EXAM_PRESETS.find((p) => p.id === sourceId);
    if (!preset) return;
    setName(`${preset.name} (${lang === 'ja' ? 'カスタム' : 'Custom'})`);
    setDescription(preset.description ?? '');
    setCategory(preset.category);
    setWeightEntries(Object.entries(preset.weights).map(([n, w]) => ({ name: n, weight: w })));
    setMethod('scratch');
  }, [lang]);

  // Generate AI prompt
  const handleGenerateAiPrompt = useCallback(() => {
    const prompt = lang === 'ja'
      ? `以下の試験について、主要な科目カテゴリーとそれぞれの出題数（配点）を JSON 形式で教えてください。

試験名: ${aiExamName}

出力形式（この形式を厳守してください）:
{
  "name": "試験名",
  "description": "簡単な説明",
  "weights": {
    "科目名1": 出題数,
    "科目名2": 出題数,
    ...
  }
}

注意:
- weights の値は整数（出題数 or 配点）で入力してください
- 主要な科目のみを列挙してください（5-15科目程度）
- 正式な科目名を使用してください`
      : `Please provide the major subject categories and their question counts (weights) for the following exam in JSON format.

Exam: ${aiExamName}

Output format (strictly follow this format):
{
  "name": "Exam Name",
  "description": "Brief description",
  "weights": {
    "Subject 1": question_count,
    "Subject 2": question_count,
    ...
  }
}

Notes:
- weights values should be integers (question count or score allocation)
- List only major subjects (5-15 subjects)
- Use official subject names`;

    setAiPrompt(prompt);
  }, [aiExamName, lang]);

  // Copy AI prompt
  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [aiPrompt]);

  // Parse AI response
  const handleParseAiResponse = useCallback(() => {
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.weights && typeof parsed.weights === 'object') {
        setWeightEntries(
          Object.entries(parsed.weights).map(([n, w]) => ({ name: n, weight: Number(w) || 10 }))
        );
      }
      setMethod('scratch');
    } catch {
      setError(lang === 'ja' ? 'AIの応答をパースできませんでした' : 'Failed to parse AI response');
    }
  }, [aiResponse, lang]);

  // Parse import JSON
  const handleParseImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importJson);
      // Support both direct { weights: ... } and exported format { preset: { weights: ... } }
      const preset = parsed.preset ?? parsed;
      if (preset.name) setName(preset.name);
      if (preset.description) setDescription(preset.description);
      if (preset.category) setCategory(preset.category);
      if (preset.iconEmoji) setIconEmoji(preset.iconEmoji);
      if (preset.weights && typeof preset.weights === 'object') {
        setWeightEntries(
          Object.entries(preset.weights).map(([n, w]) => ({ name: n, weight: Number(w) || 10 }))
        );
      }
      setImportStatus('success');
      setMethod('scratch');
    } catch {
      setImportStatus('error');
    }
  }, [importJson]);

  // Submit
  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError(text.nameRequired);
      return;
    }

    const validEntries = weightEntries.filter((e) => e.name.trim() && e.weight > 0);
    if (validEntries.length === 0) {
      setError(text.needCategories);
      return;
    }

    const weights: Record<string, number> = {};
    for (const entry of validEntries) {
      weights[entry.name.trim()] = entry.weight;
    }

    setIsSubmitting(true);

    try {
      if (isEdit && editPreset?.id) {
        await userPresetService.update(editPreset.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          category: category as UserPreset['category'],
          iconEmoji,
          weights,
        });
        onCreated(editPreset.presetId);
      } else {
        const created = await userPresetService.create({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category as UserPreset['category'],
          iconEmoji,
          weights,
        });
        onCreated(created.presetId);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Coefficient preview
  const validEntries = weightEntries.filter((e) => e.name.trim() && e.weight > 0);
  const coefficients =
    validEntries.length > 0
      ? convertPresetWeightsToCoefficients(
          Object.fromEntries(validEntries.map((e) => [e.name.trim(), e.weight]))
        )
      : {};

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? text.editTitle : text.createTitle}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* Method Selection */}
            {method === 'select' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {text.methodTitle}
                </p>
                {([
                  ['scratch', text.methodScratch, text.methodScratchDesc, '📝'],
                  ['clone', text.methodClone, text.methodCloneDesc, '📋'],
                  ['import', text.methodImport, text.methodImportDesc, '📥'],
                  ['ai', text.methodAI, text.methodAIDesc, '🤖'],
                ] as const).map(([m, label, desc, icon]) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m as CreationMethod)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Clone: Source Selection */}
            {method === 'clone' && (
              <div className="space-y-3">
                <button onClick={() => setMethod('select')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                  {text.back}
                </button>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{text.selectSource}</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {EXAM_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleClone(preset.id)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{preset.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Import: JSON Paste */}
            {method === 'import' && (
              <div className="space-y-3">
                <button onClick={() => setMethod('select')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                  {text.back}
                </button>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{text.importPaste}</p>
                <textarea
                  value={importJson}
                  onChange={(e) => { setImportJson(e.target.value); setImportStatus('idle'); }}
                  className="w-full h-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder='{ "name": "...", "weights": { ... } }'
                />
                {importStatus === 'error' && (
                  <p className="text-xs text-red-600 dark:text-red-400">{text.importError}</p>
                )}
                {importStatus === 'success' && (
                  <p className="text-xs text-green-600 dark:text-green-400">{text.importSuccess}</p>
                )}
                <button
                  onClick={handleParseImport}
                  disabled={!importJson.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {text.aiPasteButton}
                </button>
              </div>
            )}

            {/* AI: Prompt Generation */}
            {method === 'ai' && (
              <div className="space-y-3">
                <button onClick={() => setMethod('select')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                  {text.back}
                </button>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {text.aiExamName}
                  </label>
                  <input
                    type="text"
                    value={aiExamName}
                    onChange={(e) => setAiExamName(e.target.value)}
                    placeholder={text.aiExamNamePlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleGenerateAiPrompt}
                    disabled={!aiExamName.trim()}
                    className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {text.aiGeneratePrompt}
                  </button>
                </div>

                {aiPrompt && (
                  <>
                    <div className="relative">
                      <pre className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40 whitespace-pre-wrap">
                        {aiPrompt}
                      </pre>
                      <button
                        onClick={handleCopyPrompt}
                        className="absolute top-2 right-2 px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        {aiCopied ? text.aiCopied : text.aiCopyPrompt}
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {text.aiPasteResult}
                      </label>
                      <textarea
                        value={aiResponse}
                        onChange={(e) => setAiResponse(e.target.value)}
                        className="w-full h-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 resize-none"
                        placeholder='{ "name": "...", "weights": { ... } }'
                      />
                      <button
                        onClick={handleParseAiResponse}
                        disabled={!aiResponse.trim()}
                        className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {text.aiPasteButton}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Main Form (scratch mode or after clone/import/ai) */}
            {method === 'scratch' && (
              <div className="space-y-4">
                {!isEdit && (
                  <button onClick={() => setMethod('select')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                    {text.back}
                  </button>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {text.presetName}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={text.presetNamePlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {text.description}
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={text.descriptionPlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Category + Icon */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {text.categoryLabel}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      {Object.entries(text.categories).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {text.iconEmoji}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setIconEmoji(emoji)}
                          className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-all ${
                            iconEmoji === emoji
                              ? 'bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-500'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Weight Entries */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {text.weightsTitle}
                  </label>
                  <div className="space-y-2">
                    {weightEntries.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={entry.name}
                          onChange={(e) => updateEntry(idx, 'name', e.target.value)}
                          placeholder={text.categoryName}
                          className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-purple-500"
                        />
                        <input
                          type="number"
                          value={entry.weight}
                          onChange={(e) => updateEntry(idx, 'weight', e.target.value)}
                          min={0}
                          className="w-16 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs text-center focus:ring-1 focus:ring-purple-500"
                        />
                        {weightEntries.length > 1 && (
                          <button
                            onClick={() => removeEntry(idx)}
                            className="text-red-500 hover:text-red-700 text-xs px-1"
                            title={text.remove}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addEntry}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {text.addCategory}
                    </button>
                  </div>
                </div>

                {/* Coefficient Preview */}
                {Object.keys(coefficients).length > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {text.coefficientPreview}
                    </p>
                    <div className="space-y-1">
                      {Object.entries(coefficients)
                        .sort(([, a], [, b]) => b - a)
                        .map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2">
                            <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{k}</span>
                            <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                              <div
                                className="bg-purple-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${((v - 1) / 1) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-10 text-right">
                              {v.toFixed(2)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {text.cancel}
            </button>
            {method === 'scratch' && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '...' : isEdit ? text.save : text.create}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
