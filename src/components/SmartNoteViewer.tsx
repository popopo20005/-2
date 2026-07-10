/**
 * SmartNoteViewer - 4タイプのスマートノートを閲覧するUI
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Filter, Download } from 'lucide-react';
import { generateSmartNote } from '../services/smartNoteService';
import { SMART_NOTE_TYPE_META, MISTAKE_REASON_META } from '../types/smartNote';
import type {
  SmartNote,
  SmartNoteType,
  ProblemCollectionContent,
  ConfirmationNoteContent,
  FillInBlankContent,
  MistakeReasonContent,
} from '../types/smartNote';
import { db } from '../lib/database';

interface SmartNoteViewerProps {
  onBack: () => void;
  language?: 'ja' | 'en';
}

const ALL_NOTE_TYPES: SmartNoteType[] = [
  'problem_collection',
  'confirmation',
  'fill_in_blank',
  'mistake_reason',
];

const t = {
  ja: {
    title: 'スマートノート',
    generating: '生成中...',
    regenerate: '再生成',
    noData: 'データが不足しています。問題を解いてからお試しください。',
    filter: 'カテゴリー',
    all: 'すべて',
    accuracy: '正答率',
    lastAttempted: '最終解答',
    relatedProblems: '関連問題',
    confusionRate: '混同回数',
    showAnswer: '答えを表示',
    hideAnswer: '答えを隠す',
    count: '件',
  },
  en: {
    title: 'Smart Notes',
    generating: 'Generating...',
    regenerate: 'Regenerate',
    noData: 'Not enough data. Try solving some problems first.',
    filter: 'Category',
    all: 'All',
    accuracy: 'Accuracy',
    lastAttempted: 'Last attempted',
    relatedProblems: 'Related',
    confusionRate: 'Confusion count',
    showAnswer: 'Show answer',
    hideAnswer: 'Hide answer',
    count: ' items',
  },
};

export const SmartNoteViewer: React.FC<SmartNoteViewerProps> = ({
  onBack,
  language = 'ja',
}) => {
  const [activeType, setActiveType] = useState<SmartNoteType>('problem_collection');
  const [currentNote, setCurrentNote] = useState<SmartNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [revealedBlanks, setRevealedBlanks] = useState<Set<number>>(new Set());

  const currentT = t[language];

  // カテゴリー一覧を取得
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await db.categories.toArray();
      setCategories(cats.map(c => c.name));
    };
    loadCategories();
  }, []);

  // タイプ変更時にノートを生成
  useEffect(() => {
    loadNote();
  }, [activeType, selectedCategory]);

  const loadNote = async () => {
    setIsLoading(true);
    setRevealedBlanks(new Set());
    try {
      const note = await generateSmartNote(activeType, selectedCategory);
      setCurrentNote(note);
    } catch (error) {
      console.error('[SmartNoteViewer] ノート生成エラー:', error);
      setCurrentNote(null);
    }
    setIsLoading(false);
  };

  const handleRegenerate = () => {
    loadNote();
  };

  const toggleBlankReveal = (index: number) => {
    const newSet = new Set(revealedBlanks);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setRevealedBlanks(newSet);
  };

  // ============================================================
  // エクスポート機能
  // ============================================================
  const handleExport = () => {
    if (!currentNote) return;
    const content = currentNote.content;
    let text = `# ${currentNote.title}\n`;
    text += `生成日: ${new Date(currentNote.generatedAt).toLocaleDateString('ja-JP')}\n\n`;

    switch (content.type) {
      case 'problem_collection':
        text += '## 問題集\n\n';
        content.problems.forEach((p, i) => {
          text += `${i + 1}. ${p.question}\n`;
          text += `   正答率: ${Math.round(p.accuracy * 100)}%\n\n`;
        });
        break;
      case 'confirmation':
        text += '## 混同しやすい概念ペア\n\n';
        content.confusionPairs.forEach((pair, i) => {
          text += `${i + 1}. ${pair.conceptA} ⇄ ${pair.conceptB} (混同回数: ${pair.confusionRate})\n`;
        });
        break;
      case 'fill_in_blank':
        text += '## 穴埋めノート\n\n';
        content.items.forEach((item, i) => {
          text += `### 問題 ${i + 1}\n`;
          text += `${item.blankedText}\n`;
          text += `答え: ${item.keywords.join(', ')}\n\n`;
        });
        break;
      case 'mistake_reason':
        text += '## 間違い理由別\n\n';
        content.reasonGroups.forEach(group => {
          text += `### ${group.reason} (${group.count}件)\n`;
          group.problems.forEach(p => {
            text += `- ${p.question}\n`;
            if (p.note) text += `  メモ: ${p.note}\n`;
          });
          text += '\n';
        });
        break;
    }

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-note-${currentNote.type}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // レンダリング: 問題集型
  // ============================================================
  const renderProblemCollection = (content: ProblemCollectionContent) => (
    <div className="space-y-3">
      {content.problems.length === 0 && (
        <p className="text-center text-gray-400 py-8">{currentT.noData}</p>
      )}
      {content.problems.map((p, i) => (
        <motion.div
          key={p.problemId}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 line-clamp-2">
              {p.question}
            </p>
            <div className={`
              px-2 py-0.5 rounded-full text-xs font-bold shrink-0
              ${p.accuracy < 0.5
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : p.accuracy < 0.7
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }
            `}>
              {Math.round(p.accuracy * 100)}%
            </div>
          </div>
          {p.relatedProblemIds.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {currentT.relatedProblems}: {p.relatedProblemIds.length}{currentT.count}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );

  // ============================================================
  // レンダリング: 確認ノート型
  // ============================================================
  const renderConfirmation = (content: ConfirmationNoteContent) => (
    <div className="space-y-3">
      {content.confusionPairs.length === 0 && (
        <p className="text-center text-gray-400 py-8">{currentT.noData}</p>
      )}
      {content.confusionPairs.map((pair, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800/50"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 text-center px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              {pair.conceptA}
            </span>
            <span className="text-lg text-amber-500 font-bold shrink-0">⇄</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 text-center px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {pair.conceptB}
            </span>
          </div>
          <p className="mt-2 text-xs text-center text-gray-400">
            {currentT.confusionRate}: {pair.confusionRate}
          </p>
        </motion.div>
      ))}
    </div>
  );

  // ============================================================
  // レンダリング: 穴埋め型
  // ============================================================
  const renderFillInBlank = (content: FillInBlankContent) => (
    <div className="space-y-4">
      {content.items.length === 0 && (
        <p className="text-center text-gray-400 py-8">{currentT.noData}</p>
      )}
      {content.items.map((item, i) => {
        const isRevealed = revealedBlanks.has(i);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800/50"
          >
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {isRevealed ? item.originalText : item.blankedText}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {isRevealed && item.keywords.map((kw, ki) => (
                  <span
                    key={ki}
                    className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <button
                onClick={() => toggleBlankReveal(i)}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium"
              >
                {isRevealed ? currentT.hideAnswer : currentT.showAnswer}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  // ============================================================
  // レンダリング: 間違い理由別型
  // ============================================================
  const renderMistakeReason = (content: MistakeReasonContent) => (
    <div className="space-y-4">
      {content.reasonGroups.length === 0 && (
        <p className="text-center text-gray-400 py-8">{currentT.noData}</p>
      )}
      {content.reasonGroups.map((group, i) => {
        const meta = MISTAKE_REASON_META[group.reason];
        return (
          <motion.div
            key={group.reason}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.emoji}</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {language === 'ja' ? meta.label : meta.labelEn}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {group.count}{currentT.count}
              </span>
            </div>
            {/* Problems */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {group.problems.slice(0, 5).map((p) => (
                <div key={p.problemId} className="px-4 py-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {p.question}
                  </p>
                  {p.note && (
                    <p className="mt-1 text-xs text-gray-400 italic">
                      {p.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  // ============================================================
  // メインレンダリング
  // ============================================================
  const renderContent = () => {
    if (!currentNote) return null;
    const content = currentNote.content;
    switch (content.type) {
      case 'problem_collection':
        return renderProblemCollection(content);
      case 'confirmation':
        return renderConfirmation(content);
      case 'fill_in_blank':
        return renderFillInBlank(content);
      case 'mistake_reason':
        return renderMistakeReason(content);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 text-white">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-white">{currentT.title}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              disabled={isLoading || !currentNote}
              className="p-2 rounded-lg hover:bg-white/10 text-white disabled:opacity-50"
              title={language === 'ja' ? 'エクスポート' : 'Export'}
            >
              <Download size={18} />
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-white/10 text-white disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Type Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {ALL_NOTE_TYPES.map((type) => {
            const meta = SMART_NOTE_TYPE_META[type];
            const isActive = activeType === type;
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }
                `}
              >
                <span>{meta.emoji}</span>
                <span>{language === 'ja' ? meta.label : meta.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || undefined)}
              className="text-sm bg-white/10 text-gray-200 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{currentT.all}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-16"
            >
              <div className="flex items-center gap-3 text-gray-400">
                <RefreshCw size={20} className="animate-spin" />
                <span className="text-sm">{currentT.generating}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
