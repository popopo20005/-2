import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, CheckCircle, XCircle, SkipForward, Award, Home } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/Button';
import confetti from 'canvas-confetti';
import type { SpacedRepetitionCard, Problem, ReviewResult } from '../types';
import { spacedRepetitionService, problemService } from '../lib/database';
import { sortCardsByPriority, updateCardAfterReview } from '../lib/sm2Algorithm';

interface SpacedRepetitionReviewProps {
  onNavigate: (view: 'spacedRepetitionManager' | 'menu') => void;
  quizSetId?: number; // 問題集IDでフィルタリング（オプション）
}

export const SpacedRepetitionReview: React.FC<SpacedRepetitionReviewProps> = ({ onNavigate, quizSetId }) => {
  const [cards, setCards] = useState<SpacedRepetitionCard[]>([]);
  const [problems, setProblems] = useState<Map<number, Problem>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState<boolean | number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, [quizSetId]);

  const loadCards = async () => {
    setLoading(true);
    try {
      // 復習対象カードを取得（優先度順）
      let dueCards: SpacedRepetitionCard[];

      if (quizSetId) {
        // 問題集IDが指定されている場合は、その問題集のカードのみを取得
        dueCards = await spacedRepetitionService.getDueCardsByQuizSet(quizSetId, 50);
      } else {
        // 全ての復習対象カードを取得
        dueCards = await spacedRepetitionService.getDueCards(50);
      }

      const sortedCards = sortCardsByPriority(dueCards);

      // 問題データを取得
      const problemIds = sortedCards.map(c => c.problemId);
      const problemList = await problemService.getByIds(problemIds);
      const problemMap = new Map(problemList.map(p => [p.id!, p]));

      setCards(sortedCards);
      setProblems(problemMap);
      setSessionStats({ total: sortedCards.length, correct: 0, incorrect: 0 });
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentCard = cards[currentIndex];
  const currentProblem = currentCard ? problems.get(currentCard.problemId) : null;

  const handleAnswer = (answer: boolean | number) => {
    setUserAnswer(answer);
    setShowAnswer(true);
  };

  const handleNext = useCallback(async () => {
    if (!currentCard || !currentProblem || userAnswer === null) return;

    const responseTime = Date.now() - startTime;
    const isCorrect = currentProblem.type === 'multiple-choice'
      ? userAnswer === currentProblem.correctAnswer
      : userAnswer === currentProblem.answer;

    // SM-2アルゴリズムでカードを更新
    const reviewResult: ReviewResult = {
      quality: isCorrect ? 4 : 0,
      responseTime,
      wasCorrect: isCorrect
    };

    const updatedCard = updateCardAfterReview(currentCard, reviewResult);
    await spacedRepetitionService.updateCard(updatedCard);

    // 統計更新
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1)
    }));

    // 正解時は紙吹雪
    if (isCorrect) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }

    // 次のカードへ
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setUserAnswer(null);
      setStartTime(Date.now());
    } else {
      // セッション完了
      setIsCompleted(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [currentCard, currentProblem, userAnswer, currentIndex, cards.length, startTime]);

  const handleSkip = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setUserAnswer(null);
      setStartTime(Date.now());
    } else {
      setIsCompleted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">復習カードを読み込み中...</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md w-full text-center">
          <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">復習カードがありません</h2>
          <p className="text-gray-400 mb-6">
            すべてのカードを復習済みです！<br />
            明日また来てください。
          </p>
          <Button
            variant="primary"
            onClick={() => onNavigate('spacedRepetitionManager')}
            className="w-full"
          >
            カード管理画面へ
          </Button>
        </GlassCard>
      </div>
    );
  }

  if (isCompleted) {
    const accuracy = sessionStats.total > 0
      ? (sessionStats.correct / sessionStats.total) * 100
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            <Award className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
          </motion.div>

          <h2 className="text-3xl font-bold text-white mb-6">復習完了！</h2>

          <div className="space-y-4 mb-8">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">復習カード数</div>
              <div className="text-2xl font-bold text-white">{sessionStats.total}枚</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">正解</div>
                <div className="text-2xl font-bold text-green-400">{sessionStats.correct}</div>
              </div>

              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">不正解</div>
                <div className="text-2xl font-bold text-red-400">{sessionStats.incorrect}</div>
              </div>
            </div>

            <div className="p-4 bg-purple-500/10 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">正答率</div>
              <div className="text-3xl font-bold text-purple-400">{accuracy.toFixed(1)}%</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => onNavigate('spacedRepetitionManager')}
              className="flex-1"
            >
              カード管理画面へ
            </Button>
            <Button
              variant="secondary"
              onClick={() => onNavigate('menu')}
              className="flex-1"
            >
              メニューへ
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold text-white">復習セッション</h1>
          </div>
          <Button
            variant="secondary"
            onClick={() => onNavigate('spacedRepetitionManager')}
            size="sm"
          >
            <Home className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>{currentIndex + 1} / {cards.length}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          {currentProblem && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-8 mb-6">
                {/* Card Info */}
                <div className="flex items-center gap-2 mb-6">
                  {currentCard.isNew && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                      NEW
                    </span>
                  )}
                  {currentCard.isLearning && (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                      学習中
                    </span>
                  )}
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full">
                    {currentProblem.category}
                  </span>
                </div>

                {/* Question */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {currentProblem.question}
                  </h2>
                </div>

                {/* Answer Options */}
                {!showAnswer && (
                  <div className="space-y-3">
                    {currentProblem.type === 'multiple-choice' && currentProblem.options ? (
                      currentProblem.options.map((option, index) => (
                        <Button
                          key={index}
                          variant={userAnswer === index ? 'primary' : 'outline'}
                          onClick={() => handleAnswer(index)}
                          className="w-full text-left justify-start"
                        >
                          {String.fromCharCode(65 + index)}. {option}
                        </Button>
                      ))
                    ) : (
                      <div className="flex gap-4">
                        <Button
                          variant={userAnswer === true ? 'success' : 'outline'}
                          onClick={() => handleAnswer(true)}
                          className="flex-1"
                        >
                          ⭕ 正しい
                        </Button>
                        <Button
                          variant={userAnswer === false ? 'error' : 'outline'}
                          onClick={() => handleAnswer(false)}
                          className="flex-1"
                        >
                          ❌ 誤り
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Answer Result */}
                {showAnswer && userAnswer !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Result Badge */}
                    <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-gray-800/50">
                      {(() => {
                        const isCorrect = currentProblem.type === 'multiple-choice'
                          ? userAnswer === currentProblem.correctAnswer
                          : userAnswer === currentProblem.answer;

                        return isCorrect ? (
                          <>
                            <CheckCircle className="w-8 h-8 text-green-400" />
                            <span className="text-2xl font-bold text-green-400">正解！</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-8 h-8 text-red-400" />
                            <span className="text-2xl font-bold text-red-400">不正解</span>
                          </>
                        );
                      })()}
                    </div>

                    {/* Explanation */}
                    <div className="p-4 bg-blue-500/10 rounded-lg">
                      <h3 className="text-sm font-semibold text-blue-400 mb-2">解説</h3>
                      <p className="text-white">{currentProblem.explanation}</p>
                    </div>

                    {/* Next Button */}
                    <Button
                      variant="primary"
                      onClick={handleNext}
                      className="w-full"
                    >
                      次へ
                    </Button>
                  </motion.div>
                )}

                {/* Skip Button */}
                {!showAnswer && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleSkip}
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
                    >
                      <SkipForward className="w-4 h-4" />
                      スキップ
                    </button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Stats */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-400">正解</div>
              <div className="text-xl font-bold text-green-400">{sessionStats.correct}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">不正解</div>
              <div className="text-xl font-bold text-red-400">{sessionStats.incorrect}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">正答率</div>
              <div className="text-xl font-bold text-purple-400">
                {sessionStats.total > 0
                  ? ((sessionStats.correct / sessionStats.total) * 100).toFixed(0)
                  : 0}%
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
