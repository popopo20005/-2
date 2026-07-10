import { useState, useEffect } from 'react';
import { X, FileText, Image, Download, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';
import { NeumorphicButton } from './ui/NeumorphicButton';
import {
  generateReportData,
  generatePDFReport,
  generatePNGReport,
  createReportHTML,
  translations as reportTranslations,
  PERIOD_PRESETS,
  type ReportOptions,
  type ReportPeriod,
  type ReportScope,
  type ReportFilter,
} from '../services/reportGenerator';
import { db } from '../lib/database';
import type { QuizSet } from '../types';

interface ReportGeneratorModalProps {
  onClose: () => void;
  language?: 'ja' | 'en';
}

const t = {
  ja: {
    title: 'レポート生成',
    close: '閉じる',
    scope: '対象範囲',
    scopeAll: '全体',
    scopeQuizSet: '問題集',
    scopeCategory: 'カテゴリー',
    selectQuizSet: '問題集を選択',
    selectCategory: 'カテゴリーを選択',
    period: '期間選択',
    format: 'レポート形式',
    formatPDF: 'PDF形式',
    formatPNG: 'PNG画像',
    includeOptions: '含める項目',
    includeSummary: '概要統計',
    includeCategories: 'カテゴリー別分析',
    includeTrends: 'トレンド分析',
    includeWeakAreas: '弱点分野トップ3',
    generating: '生成中...',
    download: 'ダウンロード',
    preview: 'プレビュー',
    error: 'エラーが発生しました',
  },
  en: {
    title: 'Generate Report',
    close: 'Close',
    scope: 'Scope',
    scopeAll: 'All',
    scopeQuizSet: 'Quiz Set',
    scopeCategory: 'Category',
    selectQuizSet: 'Select Quiz Set',
    selectCategory: 'Select Category',
    period: 'Period Selection',
    format: 'Report Format',
    formatPDF: 'PDF Format',
    formatPNG: 'PNG Image',
    includeOptions: 'Include Options',
    includeSummary: 'Summary Statistics',
    includeCategories: 'Category Analysis',
    includeTrends: 'Trend Analysis',
    includeWeakAreas: 'Top 3 Weak Areas',
    generating: 'Generating...',
    download: 'Download',
    preview: 'Preview',
    error: 'An error occurred',
  },
};

export const ReportGeneratorModal = ({
  onClose,
  language = 'ja',
}: ReportGeneratorModalProps) => {
  const currentLang = language;
  const [selectedPeriod, setSelectedPeriod] = useState<keyof typeof PERIOD_PRESETS>('last30Days');
  const [format, setFormat] = useState<'pdf' | 'png'>('pdf');
  const [scope, setScope] = useState<ReportScope>('all');
  const [selectedQuizSetId, setSelectedQuizSetId] = useState<number | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeCategories, setIncludeCategories] = useState(true);
  const [includeTrends, setIncludeTrends] = useState(true);
  const [includeWeakAreas, setIncludeWeakAreas] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState<string>('');

  // 問題集とカテゴリーのリストを取得
  useEffect(() => {
    const loadData = async () => {
      const allQuizSets = await db.quizSets.toArray();
      setQuizSets(allQuizSets);

      const allProblems = await db.problems.toArray();
      const uniqueCategories = [...new Set(allProblems.map(p => p.category))];
      setCategories(uniqueCategories.sort());
    };

    loadData();
  }, []);

  const handlePreview = async () => {
    console.log('[ReportGeneratorModal] プレビュー開始');
    setIsGenerating(true);
    setError(null);

    try {
      const preset = PERIOD_PRESETS[selectedPeriod];
      const dates = preset.getDates();
      console.log('[ReportGeneratorModal] 期間:', dates);

      const period: ReportPeriod = {
        startDate: dates.startDate,
        endDate: dates.endDate,
        label: currentLang === 'ja' ? preset.label : preset.labelEn,
      };

      // フィルタを構築
      const filter: ReportFilter = {
        scope,
      };

      if (scope === 'quizSet' && selectedQuizSetId) {
        const quizSet = quizSets.find(qs => qs.id === selectedQuizSetId);
        filter.quizSetId = selectedQuizSetId;
        filter.quizSetName = quizSet?.name;
        console.log('[ReportGeneratorModal] 問題集フィルタ:', filter);
      } else if (scope === 'category' && selectedCategory) {
        filter.category = selectedCategory;
        console.log('[ReportGeneratorModal] カテゴリーフィルタ:', filter);
      }

      console.log('[ReportGeneratorModal] レポートデータ生成中...');
      const reportData = await generateReportData(period, filter);
      console.log('[ReportGeneratorModal] レポートデータ生成完了:', reportData);

      const options: ReportOptions = {
        period,
        format,
        filter,
        includeSummary,
        includeCategories,
        includeTrends,
        includeWeakAreas,
        language: currentLang,
      };

      // HTMLを生成してプレビュー表示
      console.log('[ReportGeneratorModal] HTML生成中...');
      const html = createReportHTML(reportData, options, reportTranslations[currentLang]);
      console.log('[ReportGeneratorModal] HTML生成完了、文字数:', html.length);

      setPreviewHTML(html);
      setShowPreview(true);
      console.log('[ReportGeneratorModal] プレビュー表示設定完了');
    } catch (err) {
      console.error('[ReportGeneratorModal] プレビュー生成エラー:', err);
      setError(t[currentLang].error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const preset = PERIOD_PRESETS[selectedPeriod];
      const dates = preset.getDates();

      const period: ReportPeriod = {
        startDate: dates.startDate,
        endDate: dates.endDate,
        label: currentLang === 'ja' ? preset.label : preset.labelEn,
      };

      // フィルタを構築
      const filter: ReportFilter = {
        scope,
      };

      if (scope === 'quizSet' && selectedQuizSetId) {
        const quizSet = quizSets.find(qs => qs.id === selectedQuizSetId);
        filter.quizSetId = selectedQuizSetId;
        filter.quizSetName = quizSet?.name;
      } else if (scope === 'category' && selectedCategory) {
        filter.category = selectedCategory;
      }

      const options: ReportOptions = {
        period,
        format,
        filter,
        includeSummary,
        includeCategories,
        includeTrends,
        includeWeakAreas,
        language: currentLang,
      };

      // レポートデータを生成
      const reportData = await generateReportData(period, filter);

      if (format === 'pdf') {
        await generatePDFReport(reportData, options);
      } else {
        // PNG形式の場合も同じレポートデータを使用
        await generatePNGReport(reportData, options);
      }

      // 成功したら閉じる
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('[ReportGeneratorModal] レポート生成エラー:', err);
      setError(t[currentLang].error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <GlassCard className="p-6">
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6" />
                {t[currentLang].title}
              </h2>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 期間選択 */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t[currentLang].period}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(PERIOD_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPeriod(key as keyof typeof PERIOD_PRESETS)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      selectedPeriod === key
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    {currentLang === 'ja' ? preset.label : preset.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* 対象範囲選択 */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                {t[currentLang].scope}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setScope('all');
                    setSelectedQuizSetId(undefined);
                    setSelectedCategory(undefined);
                  }}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    scope === 'all'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {t[currentLang].scopeAll}
                </button>
                <button
                  onClick={() => {
                    setScope('quizSet');
                    setSelectedCategory(undefined);
                  }}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    scope === 'quizSet'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {t[currentLang].scopeQuizSet}
                </button>
                <button
                  onClick={() => {
                    setScope('category');
                    setSelectedQuizSetId(undefined);
                  }}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    scope === 'category'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {t[currentLang].scopeCategory}
                </button>
              </div>

              {/* 問題集選択 */}
              {scope === 'quizSet' && (
                <div className="mt-4">
                  <select
                    value={selectedQuizSetId || ''}
                    onChange={(e) => setSelectedQuizSetId(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">{t[currentLang].selectQuizSet}</option>
                    {quizSets.map((qs) => (
                      <option key={qs.id} value={qs.id} className="bg-gray-800">
                        {qs.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* カテゴリー選択 */}
              {scope === 'category' && (
                <div className="mt-4">
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">{t[currentLang].selectCategory}</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-gray-800">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* レポート形式選択 */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                {t[currentLang].format}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('pdf')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    format === 'pdf'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  {t[currentLang].formatPDF}
                </button>
                <button
                  onClick={() => setFormat('png')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    format === 'png'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <Image className="w-5 h-5" />
                  {t[currentLang].formatPNG}
                </button>
              </div>
            </div>

            {/* 含める項目 */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                {t[currentLang].includeOptions}
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-white/80 group-hover:text-white transition-colors">
                    {t[currentLang].includeSummary}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeCategories}
                    onChange={(e) => setIncludeCategories(e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-white/80 group-hover:text-white transition-colors">
                    {t[currentLang].includeCategories}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeTrends}
                    onChange={(e) => setIncludeTrends(e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-white/80 group-hover:text-white transition-colors">
                    {t[currentLang].includeTrends}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeWeakAreas}
                    onChange={(e) => setIncludeWeakAreas(e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-white/80 group-hover:text-white transition-colors">
                    {t[currentLang].includeWeakAreas}
                  </span>
                </label>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex gap-3">
              <NeumorphicButton
                onClick={handlePreview}
                disabled={isGenerating}
                variant="secondary"
                className="flex-1 py-3"
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t[currentLang].preview}
                </div>
              </NeumorphicButton>

              <NeumorphicButton
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="primary"
                className="flex-1 py-3"
              >
                <div className="flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  {isGenerating ? t[currentLang].generating : t[currentLang].download}
                </div>
              </NeumorphicButton>
            </div>

            {/* プレビュー表示 */}
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {t[currentLang].preview}
                  </h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div
                  className="bg-white rounded-lg p-6 max-h-[400px] overflow-y-auto shadow-lg"
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
                />
              </motion.div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
