/**
 * SubtopicOnboarding - サブトピック分析のオンボーディングモーダル
 *
 * 初めてサブトピック分析機能を使うユーザーに対して、
 * 「統計を育てる」仕組みをわかりやすく説明する。
 *
 * 🌰 → 🌱 → 🌿 → 🌳 の成長ストーリーで直感的に理解できるUIを提供。
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Lang = 'ja' | 'en';

// ============================================================
// 国際化テキスト
// ============================================================

const t = {
  ja: {
    title: '📊 サブトピック分析について',
    slides: [
      {
        emoji: '🌰',
        title: 'あなただけの統計を育てましょう',
        body: 'この機能は、あなたの学習データから科目内の「どのサブトピックが重要か」を自動分析します。使えば使うほど精度が上がります。',
      },
      {
        emoji: '🌱',
        title: 'Step 1: 最初は参考データから',
        body: '最初は過去の出題傾向から推定した「参考値」をベースに配分されます。これだけでも一般的な学習には十分有効です。',
      },
      {
        emoji: '🌿',
        title: 'Step 2: あなたのデータで成長',
        body: '過去問や問題集のデータを分析すると、あなた専用の統計が蓄積されます。分析データが増えるほど、参考値から個人データの比率が高まります。',
      },
      {
        emoji: '🌳',
        title: 'Step 3: 成熟した統計で最適化',
        body: '3回以上の分析で300問以上を蓄積すると「成熟」段階に。あなた自身のデータが80%を占め、高精度な学習配分が実現します。',
      },
    ],
    blendExplanation: '信頼度に応じたデータ配分',
    blendLabels: {
      baseline: '開始前',
      low: '芽生え (🌱)',
      medium: '成長中 (🌿)',
      high: '成熟 (🌳)',
    },
    staticLabel: '参考値',
    personalLabel: '個人データ',
    gotIt: 'わかりました！',
    dontShowAgain: '次回から表示しない',
    next: '次へ',
    prev: '戻る',
    stepOf: (current: number, total: number) => `${current} / ${total}`,
  },
  en: {
    title: '📊 About Subtopic Analysis',
    slides: [
      {
        emoji: '🌰',
        title: 'Grow Your Own Statistics',
        body: 'This feature analyzes your study data to determine "which subtopics are important" within each subject. The more you use it, the more accurate it becomes.',
      },
      {
        emoji: '🌱',
        title: 'Step 1: Start with Reference Data',
        body: 'Initially, distribution is based on "reference values" estimated from past exam trends. This alone is effective for general study.',
      },
      {
        emoji: '🌿',
        title: 'Step 2: Grow with Your Data',
        body: 'When you analyze past exams or question banks, your personal statistics accumulate. As more data is added, the ratio shifts from reference to personal data.',
      },
      {
        emoji: '🌳',
        title: 'Step 3: Mature Statistics',
        body: 'After 3+ analyses with 300+ problems, you reach "maturity". Your own data makes up 80%, enabling highly accurate study distribution.',
      },
    ],
    blendExplanation: 'Data blend by confidence level',
    blendLabels: {
      baseline: 'Not started',
      low: 'Sprouting (🌱)',
      medium: 'Growing (🌿)',
      high: 'Mature (🌳)',
    },
    staticLabel: 'Reference',
    personalLabel: 'Personal',
    gotIt: 'Got it!',
    dontShowAgain: "Don't show again",
    next: 'Next',
    prev: 'Back',
    stepOf: (current: number, total: number) => `${current} / ${total}`,
  },
};

// ============================================================
// Props
// ============================================================

interface SubtopicOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Lang;
}

// ============================================================
// ブレンド比率データ
// ============================================================

const BLEND_DATA = [
  { level: 'baseline', static: 100, personal: 0 },
  { level: 'low', static: 70, personal: 30 },
  { level: 'medium', static: 40, personal: 60 },
  { level: 'high', static: 20, personal: 80 },
];

// ============================================================
// メインコンポーネント
// ============================================================

export function SubtopicOnboarding({ isOpen, onClose, lang = 'ja' }: SubtopicOnboardingProps) {
  const text = t[lang];
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const totalSlides = text.slides.length;

  const handleClose = () => {
    if (dontShow) {
      localStorage.setItem('subtopic_onboarding_dismissed', 'true');
    }
    setCurrentSlide(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-4">
          <h2 className="text-lg font-bold text-white">{text.title}</h2>
          <p className="text-xs text-purple-200 mt-0.5">{text.stepOf(currentSlide + 1, totalSlides)}</p>
        </div>

        {/* Slide Content */}
        <div className="px-5 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-4">
                <span className="text-5xl">{text.slides[currentSlide].emoji}</span>
              </div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 text-center mb-3">
                {text.slides[currentSlide].title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                {text.slides[currentSlide].body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Blend Ratio Chart (shown on last slide) */}
          {currentSlide === totalSlides - 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-5 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
            >
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3 text-center">
                {text.blendExplanation}
              </p>
              <div className="space-y-2">
                {BLEND_DATA.map((data) => (
                  <div key={data.level} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 w-20 text-right shrink-0">
                      {text.blendLabels[data.level as keyof typeof text.blendLabels]}
                    </span>
                    <div className="flex-1 flex h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-gray-300 dark:bg-gray-500 flex items-center justify-center"
                        style={{ width: `${data.static}%` }}
                      >
                        {data.static > 0 && (
                          <span className="text-[8px] text-gray-700 dark:text-gray-200 font-medium">
                            {data.static}%
                          </span>
                        )}
                      </div>
                      <div
                        className="bg-purple-500 flex items-center justify-center"
                        style={{ width: `${data.personal}%` }}
                      >
                        {data.personal > 0 && (
                          <span className="text-[8px] text-white font-medium">
                            {data.personal}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 bg-gray-300 dark:bg-gray-500 rounded-full" /> {text.staticLabel}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 bg-purple-500 rounded-full" /> {text.personalLabel}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-5 pb-5">
          {/* Dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {text.slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide ? 'bg-purple-600 w-5' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {currentSlide > 0 && (
              <button
                onClick={() => setCurrentSlide((s) => s - 1)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {text.prev}
              </button>
            )}
            <div className="flex-1" />
            {currentSlide < totalSlides - 1 ? (
              <button
                onClick={() => setCurrentSlide((s) => s + 1)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {text.next}
              </button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleClose}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {text.gotIt}
                </button>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontShow}
                    onChange={(e) => setDontShow(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{text.dontShowAgain}</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * オンボーディングが必要かチェック
 */
export function shouldShowOnboarding(): boolean {
  return localStorage.getItem('subtopic_onboarding_dismissed') !== 'true';
}

export default SubtopicOnboarding;
