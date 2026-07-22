import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Plus, Trash2, Calendar, Target, TrendingUp, Play, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/Button';
import type { SpacedRepetitionCard, QuizSet, Problem } from '../types';
import { spacedRepetitionService, quizSetService, problemService, db } from '../lib/database';
import { createNewCard, isCardDue, calculateRetentionRate } from '../lib/sm2Algorithm';

interface SpacedRepetitionManagerProps {
  onNavigate: (view: 'spacedRepetitionReview' | 'menu' | 'editor', options?: { quizSetId?: number; problemIds?: number[] }) => void;
}

interface QuizSetGroup {
  quizSetId: number;
  quizSetName: string;
  cards: SpacedRepetitionCard[];
  totalCards: number;
  dueCards: number;
  learningCards: number;
  newCards: number;
  averageAccuracy: number;
}

export const SpacedRepetitionManager: React.FC<SpacedRepetitionManagerProps> = ({ onNavigate }) => {
  const [cards, setCards] = useState<SpacedRepetitionCard[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedQuizSet, setSelectedQuizSet] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // 統計データ
  const [stats, setStats] = useState({
    total: 0,
    dueCards: 0,
    learningCards: 0,
    newCards: 0,
    retentionRate: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCards, allQuizSets, allProblems] = await Promise.all([
        spacedRepetitionService.getAllCards(),
        quizSetService.getAll(),
        problemService.getAll()
      ]);

      setCards(allCards);
      setQuizSets(allQuizSets);
      setProblems(allProblems);

      // 統計計算
      const dueCards = allCards.filter(c => isCardDue(c)).length;
      const learningCards = allCards.filter(c => c.isLearning).length;
      const newCards = allCards.filter(c => c.isNew).length;
      const retentionRate = calculateRetentionRate(allCards);

      setStats({
        total: allCards.length,
        dueCards,
        learningCards,
        newCards,
        retentionRate
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!selectedQuizSet) return;

    const quizSet = quizSets.find(qs => qs.id === selectedQuizSet);
    if (!quizSet) return;

    try {
      // 問題集の全問題をカードに追加
      for (const problemId of quizSet.problemIds) {
        // 既存のカードがあるかチェック
        const existingCard = await spacedRepetitionService.getCardByProblemAndQuizSet(
          problemId,
          selectedQuizSet
        );

        if (!existingCard) {
          const problem = problems.find(p => p.id === problemId);
          const newCard = createNewCard(
            problemId,
            problem?.category,
            selectedQuizSet,
            quizSet.name
          );
          await spacedRepetitionService.createCard(newCard);
        }
      }

      // リロード
      await loadData();
      setShowAddCard(false);
      setSelectedQuizSet(null);
    } catch (error) {
      console.error('Failed to add cards:', error);
    }
  };

  const handleDeleteQuizSetCards = async (quizSetId: number, quizSetName: string) => {
    if (!confirm(`「${quizSetName}」の全カードを削除しますか？`)) return;

    try {
      const cardsToDelete = cards.filter(c => c.quizSetId === quizSetId);
      for (const card of cardsToDelete) {
        if (card.id) {
          await db.spacedRepetitionCards.delete(card.id);
        }
      }
      await loadData();
    } catch (error) {
      console.error('Failed to delete cards:', error);
    }
  };

  const getProblemText = (card: SpacedRepetitionCard): string => {
    const problem = problems.find(p => p.id === card.problemId);
    return problem?.question || 'Unknown Problem';
  };

  const toggleGroup = (quizSetId: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(quizSetId)) {
      newExpanded.delete(quizSetId);
    } else {
      newExpanded.add(quizSetId);
    }
    setExpandedGroups(newExpanded);
  };

  // 問題集ごとにカードをグループ化
  const groupedCards: QuizSetGroup[] = cards.reduce((acc, card) => {
    const quizSetId = card.quizSetId || 0;
    let group = acc.find(g => g.quizSetId === quizSetId);

    if (!group) {
      const quizSet = quizSets.find(qs => qs.id === quizSetId);
      group = {
        quizSetId,
        quizSetName: quizSet?.name || '未分類',
        cards: [],
        totalCards: 0,
        dueCards: 0,
        learningCards: 0,
        newCards: 0,
        averageAccuracy: 0
      };
      acc.push(group);
    }

    group.cards.push(card);
    group.totalCards++;
    if (isCardDue(card)) group.dueCards++;
    if (card.isLearning) group.learningCards++;
    if (card.isNew) group.newCards++;

    return acc;
  }, [] as QuizSetGroup[]);

  // 各グループの平均正答率を計算
  groupedCards.forEach(group => {
    const totalAccuracy = group.cards.reduce((sum, card) => sum + card.accuracy, 0);
    group.averageAccuracy = group.cards.length > 0 ? totalAccuracy / group.cards.length : 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">間隔反復学習</h1>
            </div>
            <Button
              variant="ghost"
              onClick={() => onNavigate('menu')}
            >
              戻る
            </Button>
          </div>
          <p className="text-gray-400">SM-2アルゴリズムで効率的に記憶定着</p>
        </motion.div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">総カード数</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-300">復習待ち</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{stats.dueCards}</div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">学習中</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{stats.learningCards}</div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">新規</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{stats.newCards}</div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">定着率</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">{stats.retentionRate.toFixed(1)}%</div>
          </GlassCard>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            variant="primary"
            onClick={async () => {
              const dueCards = await spacedRepetitionService.getDueCards(200);
              const problemIds = dueCards.map(c => c.problemId);
              if (problemIds.length > 0) {
                onNavigate('spacedRepetitionReview', { problemIds });
              }
            }}
            disabled={stats.dueCards === 0}
            className="flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            復習開始 ({stats.dueCards}枚)
          </Button>

          <Button
            variant="success"
            onClick={() => setShowAddCard(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            問題集を追加
          </Button>

          <Button
            variant="secondary"
            onClick={() => onNavigate('editor')}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            問題を作成
          </Button>
        </div>

        {/* カード追加モーダル */}
        <AnimatePresence>
          {showAddCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowAddCard(false)}
            >
              <GlassCard
                className="p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-white mb-4">問題集を追加</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      問題集を選択
                    </label>
                    <select
                      value={selectedQuizSet ?? ''}
                      onChange={(e) => setSelectedQuizSet(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">選択してください</option>
                      {quizSets.map((qs) => (
                        <option key={qs.id} value={qs.id}>
                          {qs.name} ({qs.problemIds.length}問)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-sm text-blue-300">
                      💡 選択した問題集の全ての問題がカードとして追加されます
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleAddCard}
                      disabled={!selectedQuizSet}
                      className="flex-1"
                    >
                      追加
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowAddCard(false);
                        setSelectedQuizSet(null);
                      }}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 問題集ごとにグループ化されたカード一覧 */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">問題集一覧</h2>

          {groupedCards.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">まだ問題集が追加されていません</p>
              <Button
                variant="primary"
                onClick={() => setShowAddCard(true)}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                問題集を追加
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedCards.map((group) => (
                <motion.div
                  key={group.quizSetId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/30 rounded-lg overflow-hidden"
                >
                  {/* グループヘッダー */}
                  <div className="p-4 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <BookOpen className="w-5 h-5 text-purple-400" />
                          <h3 className="text-lg font-bold text-white">
                            {group.quizSetName}
                          </h3>
                          <span className="text-sm text-gray-400">
                            ({group.totalCards}問)
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-red-400">
                            <Calendar className="w-3 h-3" />
                            復習待ち: {group.dueCards}
                          </span>
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Clock className="w-3 h-3" />
                            学習中: {group.learningCards}
                          </span>
                          <span className="flex items-center gap-1 text-green-400">
                            <Target className="w-3 h-3" />
                            新規: {group.newCards}
                          </span>
                          <span className="flex items-center gap-1 text-purple-400">
                            <TrendingUp className="w-3 h-3" />
                            平均正答率: {group.averageAccuracy.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {group.dueCards > 0 && (
                          <Button
                            variant="primary"
                            onClick={async () => {
                              const dueCards = await spacedRepetitionService.getDueCardsByQuizSet(group.quizSetId, 200);
                              const problemIds = dueCards.map(c => c.problemId);
                              if (problemIds.length > 0) {
                                onNavigate('spacedRepetitionReview', { problemIds });
                              }
                            }}
                            className="flex items-center gap-1 text-xs px-3 py-1"
                          >
                            <Play className="w-3 h-3" />
                            復習 ({group.dueCards})
                          </Button>
                        )}

                        <button
                          onClick={() => handleDeleteQuizSetCards(group.quizSetId, group.quizSetName)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="この問題集を削除"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>

                        <button
                          onClick={() => toggleGroup(group.quizSetId)}
                          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          {expandedGroups.has(group.quizSetId) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* カード詳細（展開時） */}
                  <AnimatePresence>
                    {expandedGroups.has(group.quizSetId) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2 border-t border-gray-700/50">
                          {group.cards.map((card, index) => (
                            <div
                              key={card.id || index}
                              className="p-3 bg-gray-900/30 rounded-lg"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {card.isNew && (
                                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                        NEW
                                      </span>
                                    )}
                                    {card.isLearning && (
                                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                        学習中
                                      </span>
                                    )}
                                    {isCardDue(card) && !card.isNew && (
                                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                        復習待ち
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-sm text-gray-300 mb-2 break-words">
                                    {getProblemText(card)}
                                  </p>

                                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(card.nextReviewDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span>復習{card.totalReviews}回</span>
                                    <span>正答率{card.accuracy.toFixed(0)}%</span>
                                    <span>EF{card.easinessFactor.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
