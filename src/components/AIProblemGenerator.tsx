/**
 * AIProblemGenerator - AI問題生成画面
 *
 * Gemini APIを使用して問題を自動生成するUI。
 * カテゴリー・難易度・問題数・参考資料の入力と、
 * 生成結果のプレビューと保存機能を提供します。
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiProblemGenerator, type ProblemDifficulty, getHistory, type GenerationHistory } from '../services/aiProblemGenerator';
import { geminiService } from '../services/geminiService';
import { categoryService, db } from '../lib/database';
import type { Problem } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { PaywallModal } from './PaywallModal';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use local worker from public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
console.log('[PDF.js] Worker URL設定:', pdfjsLib.GlobalWorkerOptions.workerSrc);

// ============================================================
// 定数
// ============================================================

const DIFFICULTIES: { value: ProblemDifficulty; label: string; description: string; color: string }[] = [
  { value: 'easy', label: '初級', description: '基本知識の確認', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300' },
  { value: 'normal', label: '標準', description: '理解確認レベル', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' },
  { value: 'hard', label: '上級', description: '推論・応用が必要', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300' },
  { value: 'expert', label: '超上級', description: '高度な分析力が必要', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' },
];

const COUNT_OPTIONS = [1, 3, 5];

// ============================================================
// Props
// ============================================================

interface AIProblemGeneratorProps {
  onBack: () => void;
  onSaved?: (problemIds: number[]) => void;
  onNavigate?: (view: string) => void;
}

// ============================================================
// 問題カード（プレビュー）
// ============================================================

function ProblemPreviewCard({ problem, index, onToggleSave, isSaved }: {
  problem: Problem;
  index: number;
  onToggleSave: () => void;
  isSaved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border transition-colors ${
      isSaved ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
              Q{index + 1}
            </span>
            {isSaved && (
              <span className="text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                保存済み
              </span>
            )}
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
            {problem.question}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 ml-2 flex-shrink-0"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded: Options + Explanation */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* 選択肢 */}
          <div className="space-y-1.5">
            {(problem.options || []).map((option, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                  idx === problem.correctAnswer
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                    : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === problem.correctAnswer
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                  {idx === problem.correctAnswer ? '✓' : String.fromCharCode(65 + idx)}
                </span>
                <span className={idx === problem.correctAnswer ? 'text-green-700 dark:text-green-300 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                  {option}
                </span>
              </div>
            ))}
          </div>

          {/* 解説 */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">解説</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{problem.explanation}</p>
          </div>

          {/* Save Toggle */}
          <button
            onClick={onToggleSave}
            className={`w-full text-sm font-medium py-1.5 rounded-lg transition-colors ${
              isSaved
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                : 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800'
            }`}
          >
            {isSaved ? '保存解除' : 'DBに保存'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================

export function AIProblemGenerator({ onBack, onSaved, onNavigate }: AIProblemGeneratorProps) {
  const { plan, canUseFeature } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // --- State ---
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<ProblemDifficulty>('normal');
  const [count, setCount] = useState(3);
  const [referenceText, setReferenceText] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<'prompt' | 'api' | 'parse' | 'validate' | null>(null);
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [savedProblemIds, setSavedProblemIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth' | 'quota' | 'network' | 'parse' | 'general' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSavedCount, setTotalSavedCount] = useState(0);

  const [showQuizSetModal, setShowQuizSetModal] = useState(false);
  const [quizSets, setQuizSets] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedQuizSetId, setSelectedQuizSetId] = useState<number | null>(null);

  const [usageInfo, setUsageInfo] = useState({ used: 0, limit: 20, remaining: 20 });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<GenerationHistory | null>(null);

  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedTexts, setExtractedTexts] = useState<Record<string, string>>({});
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileProcessingProgress, setFileProcessingProgress] = useState<string>('');

  // --- Load categories ---
  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoryService.getAll();
      setCategories(cats);
    } catch (e) {
      console.error('カテゴリー読み込みエラー:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // サブスクプランに基づいてAI生成上限を同期
  useEffect(() => {
    const limits: Record<string, number> = { free: 20, basic: 50, premium: -1 };
    aiProblemGenerator.setMonthlyLimit(limits[plan] ?? 20);
    setUsageInfo(aiProblemGenerator.getUsageInfo());
  }, [plan]);

  useEffect(() => {
    loadCategories();
    setUsageInfo(aiProblemGenerator.getUsageInfo());
  }, [loadCategories]);

  // --- Load quiz sets ---
  const loadQuizSets = useCallback(async () => {
    try {
      const sets = await db.quizSets.toArray();
      setQuizSets(sets.map(s => ({ id: s.id!, name: s.name })));
    } catch (e) {
      console.error('問題集読み込みエラー:', e);
    }
  }, []);

  // --- Add to quiz set ---
  const handleAddToQuizSet = async () => {
    if (!selectedQuizSetId || savedProblemIds.length === 0) return;

    try {
      const quizSet = await db.quizSets.get(selectedQuizSetId);
      if (!quizSet) {
        setError('問題集が見つかりません');
        return;
      }

      // 既存のIDと結合（重複除去）
      const updatedIds = Array.from(new Set([...quizSet.problemIds, ...savedProblemIds]));
      await db.quizSets.update(selectedQuizSetId, { problemIds: updatedIds });

      setShowQuizSetModal(false);
      setError(null);
      alert(`${savedProblemIds.length}問を「${quizSet.name}」に追加しました`);
    } catch (e) {
      setError('問題集への追加に失敗しました');
    }
  };

  const loadHistory = useCallback(() => {
    const h = getHistory();
    setHistory(h);
  }, []);

  // 履歴から問題を保存
  const handleSaveFromHistory = async (item: GenerationHistory) => {
    try {
      const ids: number[] = [];
      for (const problem of item.problems) {
        const id = await db.problems.add(problem);
        ids.push(id as number);
      }
      alert(`${item.problems.length}問をデータベースに保存しました`);
      console.log('[履歴] 保存完了:', ids);
    } catch (e) {
      console.error('[履歴] 保存エラー:', e);
      setError('問題の保存に失敗しました');
    }
  };

  // 履歴から問題集に追加
  const handleAddToQuizSetFromHistory = async () => {
    console.log('[履歴] 問題集追加開始');
    console.log('[履歴] selectedQuizSetId:', selectedQuizSetId);
    console.log('[履歴] selectedHistoryItem:', selectedHistoryItem);

    if (!selectedQuizSetId || !selectedHistoryItem) {
      console.warn('[履歴] 選択されていません');
      return;
    }

    try {
      // まず問題をDBに保存
      const problemIds: number[] = [];
      for (const problem of selectedHistoryItem.problems) {
        const id = await db.problems.add(problem);
        problemIds.push(id as number);
      }
      console.log('[履歴] 問題保存完了:', problemIds);

      // 問題集に追加
      const quizSet = await db.quizSets.get(selectedQuizSetId);
      if (!quizSet) {
        setError('問題集が見つかりません');
        return;
      }

      const updatedIds = Array.from(new Set([...quizSet.problemIds, ...problemIds]));
      await db.quizSets.update(selectedQuizSetId, { problemIds: updatedIds });
      console.log('[履歴] 問題集更新完了');

      setShowQuizSetModal(false);
      setSelectedHistoryItem(null);
      setError(null);
      alert(`${problemIds.length}問を「${quizSet.name}」に追加しました`);
    } catch (e) {
      console.error('[履歴] 問題集追加エラー:', e);
      setError('問題集への追加に失敗しました');
    }
  };

  // --- File Upload Handlers ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // PDF/画像からの問題生成はプレミアム機能
    const hasPdf = Array.from(files).some(f => f.type === 'application/pdf');
    if (hasPdf && !canUseFeature('pdf_import')) {
      setShowPaywall(true);
      event.target.value = ''; // ファイル選択をリセット
      return;
    }

    const newFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (const file of newFiles) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessingFile(true);
    setFileProcessingProgress(`${file.name} を処理中...`);

    try {
      let extractedText = '';

      // Check file type
      const fileType = file.type;

      if (fileType.startsWith('image/')) {
        // Image file - use OCR
        extractedText = await extractTextFromImage(file);
      } else if (fileType === 'application/pdf') {
        // PDF file
        extractedText = await extractTextFromPDF(file);
      } else if (fileType.startsWith('text/') || fileType === 'application/json') {
        // Text file
        extractedText = await extractTextFromTextFile(file);
      } else {
        throw new Error(`サポートされていないファイル形式: ${fileType}`);
      }

      // Save extracted text
      setExtractedTexts(prev => ({
        ...prev,
        [file.name]: extractedText
      }));

      console.log(`[ファイル処理] ${file.name} から ${extractedText.length} 文字を抽出しました`);
      console.log(`[ファイル処理] 抽出テキストの最初の500文字:`, extractedText.substring(0, 500));

      if (extractedText.length === 0) {
        console.warn(`[ファイル処理] 警告: ${file.name} からテキストが抽出されませんでした`);
      }
    } catch (error) {
      console.error(`[ファイル処理エラー] ${file.name}:`, error);
      setError(`${file.name} の処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsProcessingFile(false);
      setFileProcessingProgress('');
    }
  };

  const extractTextFromImage = async (file: File): Promise<string> => {
    setFileProcessingProgress(`画像から文字を認識中...`);
    const { data: { text } } = await Tesseract.recognize(file, 'jpn+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setFileProcessingProgress(`画像認識中... ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    return text.trim();
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    console.log(`[PDF処理] 開始: ${file.name}`);
    setFileProcessingProgress('PDFを読み込み中...');

    const arrayBuffer = await file.arrayBuffer();
    console.log(`[PDF処理] ArrayBuffer作成完了: ${arrayBuffer.byteLength} バイト`);

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`[PDF処理] PDFドキュメント読み込み完了: ${pdf.numPages} ページ`);

    let fullText = '';
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      setFileProcessingProgress(`PDFを処理中... ${pageNum}/${numPages}ページ`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      console.log(`[PDF処理] ページ ${pageNum}: ${pageText.length} 文字抽出`);
      fullText += pageText + '\n\n';
    }

    console.log(`[PDF処理] 完了: 合計 ${fullText.length} 文字抽出`);
    return fullText.trim();
  };

  const extractTextFromTextFile = async (file: File): Promise<string> => {
    setFileProcessingProgress('テキストファイルを読み込み中...');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsText(file);
    });
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    setExtractedTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[fileName];
      return newTexts;
    });
  };

  // Get combined reference text (manual input + extracted from files)
  const getCombinedReferenceText = (): string => {
    console.log('[参考資料] 結合開始');
    console.log('[参考資料] 手動入力テキスト:', referenceText.length, '文字');
    console.log('[参考資料] 抽出済みファイル数:', Object.keys(extractedTexts).length);

    const extractedTextArray = Object.values(extractedTexts);
    extractedTextArray.forEach((text, index) => {
      console.log(`[参考資料] ファイル${index + 1}:`, text.length, '文字');
    });

    const allTexts = [referenceText, ...extractedTextArray].filter(t => t.trim().length > 0);
    const combined = allTexts.join('\n\n---\n\n');

    console.log('[参考資料] 結合後の合計:', combined.length, '文字');
    console.log('[参考資料] 結合テキストの最初の500文字:', combined.substring(0, 500));

    return combined;
  };

  // --- Generate ---
  const handleGenerate = async () => {
    if (!selectedCategory) {
      setError('カテゴリーを選択してください');
      setErrorType('general');
      return;
    }
    if (!geminiService.isConfigured()) {
      setError('ログインが必要です。AI問題生成を使うにはログインしてください');
      setErrorType('auth');
      return;
    }

    setIsGenerating(true);
    setGeneratingStep('prompt');
    setError(null);
    setErrorType(null);
    setGeneratedProblems([]);
    setSavedIndices(new Set());

    try {
      // Get combined reference text from manual input and uploaded files
      const combinedText = getCombinedReferenceText();

      setGeneratingStep('api');

      const problems = await aiProblemGenerator.generateProblems({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        count,
        format: 'multiple-choice',
        basedOn: combinedText || undefined,
      });

      setGeneratingStep('validate');
      setGeneratedProblems(problems);
      setUsageInfo(aiProblemGenerator.getUsageInfo());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI生成に失敗しました';
      setError(msg);

      // エラー種別の分類
      if (msg.includes('ログイン') || msg.includes('認証')) {
        setErrorType('auth');
      } else if (msg.includes('上限') || msg.includes('クォータ')) {
        setErrorType('quota');
      } else if (msg.includes('JSON') || msg.includes('解析') || msg.includes('パース')) {
        setErrorType('parse');
      } else if (msg.includes('ネットワーク') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        setErrorType('network');
      } else {
        setErrorType('general');
      }
    } finally {
      setIsGenerating(false);
      setGeneratingStep(null);
    }
  };

  // --- Save ---
  const handleToggleSave = async (index: number) => {
    if (savedIndices.has(index)) {
      // 保存解除（現在はDBから削除しない）
      setSavedIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }

    try {
      const ids = await aiProblemGenerator.saveProblems([generatedProblems[index]]);
      setSavedIndices((prev) => new Set([...prev, index]));
      setSavedProblemIds((prev) => [...prev, ...ids]);
      setTotalSavedCount((prev) => prev + 1);
      setError(null);
    } catch (e) {
      setError('保存に失敗しました');
    }
  };

  const handleSaveAll = async () => {
    const unsaved = generatedProblems.filter((_, i) => !savedIndices.has(i));
    if (unsaved.length === 0) return;

    try {
      const ids = await aiProblemGenerator.saveProblems(unsaved);
      const allIndices = new Set(generatedProblems.map((_, i) => i));
      setSavedIndices(allIndices);
      setSavedProblemIds((prev) => [...prev, ...ids]);
      setTotalSavedCount((prev) => prev + unsaved.length);
      setError(null);
    } catch (e) {
      setError('一括保存に失敗しました');
    }
  };

  // --- Render ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <button
            onClick={onBack}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-1 text-sm"
          >
            ← 戻る
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI問題生成</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gemini AIで問題を自動生成する</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* History Button */}
              <button
                onClick={() => {
                  loadHistory();
                  setShowHistoryModal(true);
                }}
                className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-all shadow-sm flex items-center gap-1"
              >
                📜 生成履歴 ({getHistory().length})
              </button>
              {/* Usage Badge */}
              <div className={`text-xs px-2.5 py-1 rounded-full border ${
                usageInfo.limit === -1
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                  : usageInfo.remaining <= 3
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
              }`}>
                {usageInfo.limit === -1
                  ? `${usageInfo.used}問 使用済み（無制限）`
                  : `${usageInfo.used}/${usageInfo.limit}問 使用済み`}
              </div>
              {/* Saved Problems Badge & Buttons */}
              {totalSavedCount > 0 && (
                <div className="flex flex-col items-end gap-1.5">
                  <div className="text-xs px-2.5 py-1 rounded-full border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300">
                    ✅ 保存済み: {totalSavedCount}問
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        loadQuizSets();
                        setShowQuizSetModal(true);
                      }}
                      className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all shadow-sm"
                    >
                      📚 問題集に追加
                    </button>
                    <button
                      onClick={() => onSaved?.([])}
                      className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-all shadow-sm"
                    >
                      📝 問題編集で確認
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* API Key Warning */}
        {!geminiService.isConfigured() && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">ログインが必要</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
              AI問題生成を使うにはFirebase認証でログインしてください
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            {errorType === 'auth' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                設定画面からFirebaseアカウントでログインしてください
              </p>
            )}
            {errorType === 'quota' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                月間の生成上限に達しました。プランのアップグレードで上限を増やせます
              </p>
            )}
            {errorType === 'parse' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                AIの応答形式にエラーがありました。「再生成」ボタンで再度お試しください
              </p>
            )}
            {errorType === 'network' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                インターネット接続を確認して再度お試しください
              </p>
            )}
          </div>
        )}

        {/* Generation Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-4"
        >
          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                カテゴリー
              </label>
              <input
                type="text"
                list="category-list"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                placeholder="カテゴリーを入力または選択..."
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <datalist id="category-list">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                既存カテゴリーから選択、または新しいカテゴリー名を入力できます
              </p>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                難易度
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDifficulty(d.value)}
                    className={`px-3 py-2 rounded-lg text-left border transition-all ${
                      selectedDifficulty === d.value
                        ? d.color + ' border-opacity-100'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="text-xs opacity-70">{d.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                生成問題数
              </label>
              <div className="flex gap-2">
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      count === n
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {n}問
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Text (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                参考資料（オプション）
              </label>
              <textarea
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder="テキストを貼り付けると、それに基づいて問題を生成します..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
              />

              {/* File Upload */}
              <div className="mt-3">
                <label className="block">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.md,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="flex gap-2">
                    <label
                      htmlFor="file-upload"
                      className="flex-1 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all cursor-pointer text-center"
                    >
                      <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                        📎 ファイル・画像をアップロード
                      </span>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                        画像、PDF、テキストファイル対応
                      </p>
                    </label>
                  </div>
                </label>

                {/* Processing Progress */}
                {isProcessingFile && (
                  <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-blue-700 dark:text-blue-300">{fileProcessingProgress}</span>
                    </div>
                  </div>
                )}

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file) => {
                      const hasText = extractedTexts[file.name];
                      const textLength = hasText ? extractedTexts[file.name].length : 0;

                      return (
                        <div
                          key={file.name}
                          className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-base">
                              {file.type.startsWith('image/') ? '🖼️' : file.type === 'application/pdf' ? '📄' : '📝'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 dark:text-gray-100 truncate">
                                {file.name}
                              </p>
                              {hasText && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  ✅ {textLength}文字を抽出
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(file.name)}
                            className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="削除"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedCategory || (usageInfo.limit !== -1 && usageInfo.remaining <= 0)}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {generatingStep === 'prompt' && 'プロンプト構築中...'}
                  {generatingStep === 'api' && 'AIが問題を作成中...'}
                  {generatingStep === 'parse' && '応答を解析中...'}
                  {generatingStep === 'validate' && '問題を検証中...'}
                  {!generatingStep && '生成中...'}
                </>
              ) : (
                <>
                  AI問題を生成する
                  {usageInfo.limit !== -1 && (
                    <span className="text-xs opacity-75">（残り{usageInfo.remaining}問）</span>
                  )}
                </>
              )}
            </button>

            {/* 生成中のステップ表示 */}
            {isGenerating && (
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 justify-center">
                <span className={generatingStep === 'prompt' ? 'text-purple-600 dark:text-purple-400 font-medium' : generatingStep === 'api' || generatingStep === 'parse' || generatingStep === 'validate' ? 'text-green-600 dark:text-green-400' : ''}>
                  {generatingStep === 'prompt' ? '●' : (generatingStep === 'api' || generatingStep === 'parse' || generatingStep === 'validate') ? '✓' : '○'} 準備
                </span>
                <span className={generatingStep === 'api' ? 'text-purple-600 dark:text-purple-400 font-medium' : generatingStep === 'parse' || generatingStep === 'validate' ? 'text-green-600 dark:text-green-400' : ''}>
                  {generatingStep === 'api' ? '●' : (generatingStep === 'parse' || generatingStep === 'validate') ? '✓' : '○'} AI生成
                </span>
                <span className={generatingStep === 'parse' || generatingStep === 'validate' ? 'text-purple-600 dark:text-purple-400 font-medium' : ''}>
                  {(generatingStep === 'parse' || generatingStep === 'validate') ? '●' : '○'} 検証
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Generated Problems */}
        <AnimatePresence>
          {generatedProblems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Save All Button */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  生成結果 ({generatedProblems.length}問)
                </h2>
                {savedIndices.size < generatedProblems.length && (
                  <button
                    onClick={handleSaveAll}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    全て保存
                  </button>
                )}
              </div>

              {/* Problem Cards */}
              <div className="space-y-3">
                {generatedProblems.map((problem, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * idx }}
                  >
                    <ProblemPreviewCard
                      problem={problem}
                      index={idx}
                      isSaved={savedIndices.has(idx)}
                      onToggleSave={() => handleToggleSave(idx)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz Set Selection Modal */}
        {showQuizSetModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                📚 問題集に追加
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {selectedHistoryItem
                  ? `履歴から${selectedHistoryItem.problems.length}問を追加する問題集を選択してください`
                  : `保存した${savedProblemIds.length}問を追加する問題集を選択してください`
                }
              </p>

              {quizSets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    問題集がまだありません
                  </p>
                  <button
                    onClick={() => {
                      setShowQuizSetModal(false);
                      onSaved?.([]); // 問題集管理画面へ遷移
                    }}
                    className="text-sm px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-all"
                  >
                    問題集を作成する
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {quizSets.map((set) => (
                      <button
                        key={set.id}
                        onClick={() => setSelectedQuizSetId(set.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg border transition-all ${
                          selectedQuizSetId === set.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className="text-sm font-medium">{set.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowQuizSetModal(false);
                        setSelectedHistoryItem(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={selectedHistoryItem ? handleAddToQuizSetFromHistory : handleAddToQuizSet}
                      disabled={!selectedQuizSetId}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-md transition-all text-sm disabled:cursor-not-allowed"
                    >
                      追加
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  📜 AI問題生成履歴
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  過去に生成した問題を閲覧できます（最大50件）
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      まだ履歴がありません
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {item.category}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {new Date(item.generatedAt).toLocaleString('ja-JP')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              item.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              item.difficulty === 'normal' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                              item.difficulty === 'hard' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>
                              {DIFFICULTIES.find(d => d.value === item.difficulty)?.label || item.difficulty}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                              {item.count}問
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 mb-3">
                          {item.problems.map((problem, idx) => (
                            <details key={idx} className="group">
                              <summary className="cursor-pointer text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 py-1">
                                Q{idx + 1}: {problem.question.substring(0, 60)}{problem.question.length > 60 ? '...' : ''}
                              </summary>
                              <div className="pl-4 mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {problem.options?.map((opt, optIdx) => (
                                  <div key={optIdx} className={optIdx === problem.correctAnswer ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                                    {String.fromCharCode(65 + optIdx)}. {opt}
                                  </div>
                                ))}
                                <div className="mt-2 text-gray-500 dark:text-gray-500">
                                  💡 {problem.explanation}
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => handleSaveFromHistory(item)}
                            className="text-xs px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all shadow-sm flex items-center justify-center gap-1"
                            title="データベースに保存"
                          >
                            <span className="text-base">💾</span>
                            <span className="hidden sm:inline">保存</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedHistoryItem(item);
                              loadQuizSets();
                              setShowQuizSetModal(true);
                            }}
                            className="text-xs px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all shadow-sm flex items-center justify-center gap-1"
                            title="問題集に追加"
                          >
                            <span className="text-base">📚</span>
                            <span className="hidden sm:inline">追加</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
                >
                  閉じる
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* PaywallModal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="PDF/画像から問題生成"
        requiredPlan="premium"
        onUpgrade={() => {
          setShowPaywall(false);
          onNavigate?.('pricing');
        }}
      />
    </div>
  );
}

export default AIProblemGenerator;
