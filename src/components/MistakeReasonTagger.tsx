/**
 * MistakeReasonTagger - 不正解時の間違い理由タグ付けUI
 *
 * QuizViewの解説表示エリアに組み込み、ユーザーが任意で理由を選択できる
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MISTAKE_REASON_META } from '../types/smartNote';
import type { MistakeReasonTag } from '../types/smartNote';

interface MistakeReasonTaggerProps {
  problemId: number;
  category: string;
  language: 'ja' | 'en';
  onSave: (reasonTag: MistakeReasonTag, note?: string) => void;
  onSkip: () => void;
}

const ALL_REASONS: MistakeReasonTag[] = [
  'knowledge_gap',
  'misunderstanding',
  'ambiguous',
  'calculation_error',
  'careless',
  'time_pressure',
];

export const MistakeReasonTagger: React.FC<MistakeReasonTaggerProps> = ({
  language,
  onSave,
  onSkip,
}) => {
  const [selectedReason, setSelectedReason] = useState<MistakeReasonTag | null>(null);
  const [note, setNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReasonClick = (reason: MistakeReasonTag) => {
    if (selectedReason === reason) {
      setSelectedReason(null);
    } else {
      setSelectedReason(reason);
    }
  };

  const handleSave = () => {
    if (!selectedReason) return;
    onSave(selectedReason, note.trim() || undefined);
  };

  const t = {
    ja: {
      title: 'なぜ間違えましたか？',
      optional: '（任意）',
      notePlaceholder: 'メモを追加...',
      skip: 'スキップ',
      save: '保存',
    },
    en: {
      title: 'Why did you get it wrong?',
      optional: '(optional)',
      notePlaceholder: 'Add a note...',
      skip: 'Skip',
      save: 'Save',
    },
  };

  const currentT = t[language];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {currentT.title}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1 font-normal">
            {currentT.optional}
          </span>
        </h4>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Reason Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_REASONS.map((reason) => {
          const meta = MISTAKE_REASON_META[reason];
          const isSelected = selectedReason === reason;
          return (
            <button
              key={reason}
              onClick={() => handleReasonClick(reason)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200
                ${isSelected
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/30 scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30'
                }
              `}
            >
              <span>{meta.emoji}</span>
              <span>{language === 'ja' ? meta.label : meta.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Expandable Note Input */}
      <AnimatePresence>
        {(isExpanded || selectedReason) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={currentT.notePlaceholder}
              className="w-full px-3 py-2 mb-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-700"
              maxLength={200}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onSkip}
          className="px-4 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {currentT.skip}
        </button>
        {selectedReason && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
          >
            {currentT.save}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
