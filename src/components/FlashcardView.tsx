import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Lightbulb } from 'lucide-react';
import type { Problem } from '../types';
import { MarkdownPreview } from './MarkdownPreview';
import { Badge } from './ui/Badge';
import { NeumorphicButton } from './ui/NeumorphicButton';

interface FlashcardViewProps {
  problems: Problem[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
  language: 'ja' | 'en';
}

const t = {
  ja: {
    tapToReveal: 'タップして答えを表示',
    correctAnswer: '✅ 正解',
    choices: '選択肢',
    explanation: '解説',
    userNotes: 'あなたのメモ',
    prev: '前へ',
    next: '次へ',
    exit: '終了',
    noExplanation: '解説がありません',
    keyboardHints: 'Space: フリップ / ← →: カード移動 / Esc: 終了'
  },
  en: {
    tapToReveal: 'Tap to reveal answer',
    correctAnswer: '✅ Correct Answer',
    choices: 'Choices',
    explanation: 'Explanation',
    userNotes: 'Your Notes',
    prev: 'Previous',
    next: 'Next',
    exit: 'Exit',
    noExplanation: 'No explanation available',
    keyboardHints: 'Space: Flip / ← →: Navigate / Esc: Exit'
  }
};

export function FlashcardView({
  problems,
  currentIndex,
  onNext,
  onPrev,
  onExit,
  language
}: FlashcardViewProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const currentProblem = problems[currentIndex];

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          setIsFlipped(prev => !prev);
          break;
        case 'ArrowLeft':
        case 'h':
        case 'H':
          e.preventDefault();
          if (currentIndex > 0) onPrev();
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          if (currentIndex < problems.length - 1) onNext();
          break;
        case 'Escape':
          e.preventDefault();
          onExit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, problems.length, onNext, onPrev, onExit]);

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  const handlePrev = () => {
    if (currentIndex > 0) onPrev();
  };

  const handleNext = () => {
    if (currentIndex < problems.length - 1) onNext();
  };

  return (
    <div className="min-h-screen bg-surface pb-20 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-secondary hover:text-white"
              title={t[language].exit}
            >
              <X size={24} />
            </button>
            <div className="text-white font-bold">
              {currentIndex + 1} / {problems.length}
            </div>
          </div>

          <div className="hidden md:block text-xs text-text-secondary">
            {t[language].keyboardHints}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-6 pt-4">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / problems.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="perspective-1000">
          <motion.div
            className="relative w-full min-h-[500px] cursor-pointer"
            onClick={handleFlip}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front Side */}
            <div
              className={`absolute inset-0 backface-hidden ${isFlipped ? 'pointer-events-none' : ''}`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="h-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center gap-8">
                {/* Category Badge */}
                <Badge variant="info" className="text-sm">
                  {currentProblem.category}
                </Badge>

                {/* Question Text */}
                <div className="text-center flex-1 flex items-center justify-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-relaxed">
                    {currentProblem.question}
                  </h2>
                </div>

                {/* Hint */}
                <div className="flex items-center gap-2 text-primary animate-pulse">
                  <Lightbulb size={20} />
                  <span className="text-sm font-medium">{t[language].tapToReveal}</span>
                </div>
              </div>
            </div>

            {/* Back Side */}
            <div
              className={`absolute inset-0 backface-hidden ${!isFlipped ? 'pointer-events-none' : ''}`}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="h-full bg-surfaceHighlight backdrop-blur-xl border border-white/10 rounded-3xl p-8 overflow-y-auto">
                <div className="space-y-6">
                  {/* Correct Answer - Multiple Choice */}
                  {currentProblem.type === 'multiple-choice' && currentProblem.options && typeof currentProblem.correctAnswer === 'number' && (
                    <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                      <h3 className="font-bold text-green-400 mb-2">{t[language].correctAnswer}</h3>
                      <p className="text-white text-lg">
                        {String.fromCharCode(65 + currentProblem.correctAnswer)}. {currentProblem.options[currentProblem.correctAnswer]}
                      </p>
                    </div>
                  )}

                  {/* Correct Answer - True/False */}
                  {currentProblem.type === 'true-false' && (
                    <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                      <h3 className="font-bold text-green-400 mb-2">{t[language].correctAnswer}</h3>
                      <p className="text-white text-lg">
                        {currentProblem.answer ? '⭕ True' : '❌ False'}
                      </p>
                    </div>
                  )}

                  {/* All Choices - Multiple Choice Only */}
                  {currentProblem.type === 'multiple-choice' && currentProblem.options && (
                    <div>
                      <h3 className="font-bold text-white mb-3">{t[language].choices}</h3>
                      <div className="space-y-2">
                        {currentProblem.options.map((option: string, idx: number) => {
                          const isCorrect = idx === currentProblem.correctAnswer;
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border ${
                                isCorrect
                                  ? 'bg-green-500/10 border-green-500/30 text-white'
                                  : 'bg-white/5 border-white/10 text-text-secondary'
                              }`}
                            >
                              <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                              {option}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  <div>
                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                      <span>📖</span>
                      <span>{t[language].explanation}</span>
                    </h3>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-text-secondary leading-relaxed">
                        {currentProblem.explanation || t[language].noExplanation}
                      </p>
                    </div>
                  </div>

                  {/* User Notes */}
                  {currentProblem.userNotes && (
                    <div>
                      <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                        <span>📝</span>
                        <span>{t[language].userNotes}</span>
                      </h3>
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <MarkdownPreview content={currentProblem.userNotes} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <div className="flex items-center justify-between gap-4">
          <NeumorphicButton
            variant="secondary"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            <span className="hidden sm:inline">{t[language].prev}</span>
          </NeumorphicButton>

          <div className="text-center text-sm text-text-secondary">
            {isFlipped ? (
              <span className="text-primary">📖 Showing answer</span>
            ) : (
              <span>💡 Tap card to flip</span>
            )}
          </div>

          <NeumorphicButton
            variant="secondary"
            onClick={handleNext}
            disabled={currentIndex === problems.length - 1}
            className="flex items-center gap-2"
          >
            <span className="hidden sm:inline">{t[language].next}</span>
            <ChevronRight size={20} />
          </NeumorphicButton>
        </div>
      </div>
    </div>
  );
}
