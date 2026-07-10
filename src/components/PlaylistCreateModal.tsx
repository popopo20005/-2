import { useState, useEffect } from 'react';
import { quizSetService, playlistService } from '../lib/database';
import { GlassCard } from './ui/GlassCard';
import { NeumorphicButton } from './ui/NeumorphicButton';
import { X, Check, ListMusic, Sparkles } from 'lucide-react';
import type { QuizSet, PodcastPlaylist } from '../types';
import toast from 'react-hot-toast';

interface PlaylistCreateModalProps {
  onClose: () => void;
  onPlaylistCreated?: (playlist: PodcastPlaylist & { id: number }) => void;
  existingPlaylist?: PodcastPlaylist & { id: number };
}

const EMOJI_OPTIONS = ['🎵', '🎧', '📚', '🎯', '⭐', '🔥', '💡', '🎓', '📖', '🌟'];

export const PlaylistCreateModal = ({ onClose, onPlaylistCreated, existingPlaylist }: PlaylistCreateModalProps) => {
  const [name, setName] = useState(existingPlaylist?.name || '');
  const [description, setDescription] = useState(existingPlaylist?.description || '');
  const [emoji, setEmoji] = useState(existingPlaylist?.emoji || '🎵');
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [selectedQuizSetIds, setSelectedQuizSetIds] = useState<number[]>(existingPlaylist?.quizSetIds || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadQuizSets = async () => {
      const sets = await quizSetService.getAll();
      setQuizSets(sets);
    };
    loadQuizSets();
  }, []);

  const handleToggleQuizSet = (quizSetId: number) => {
    if (selectedQuizSetIds.includes(quizSetId)) {
      setSelectedQuizSetIds(selectedQuizSetIds.filter(id => id !== quizSetId));
    } else {
      setSelectedQuizSetIds([...selectedQuizSetIds, quizSetId]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('プレイリスト名を入力してください');
      return;
    }

    if (selectedQuizSetIds.length === 0) {
      toast.error('少なくとも1つの問題セットを選択してください');
      return;
    }

    setIsLoading(true);
    try {
      if (existingPlaylist?.id) {
        // Update existing playlist
        await playlistService.update(existingPlaylist.id, {
          name,
          description,
          emoji,
          quizSetIds: selectedQuizSetIds
        });
        toast.success('プレイリストを更新しました');
      } else {
        // Create new playlist
        const id = await playlistService.create({
          name,
          description,
          emoji,
          quizSetIds: selectedQuizSetIds,
          createdAt: new Date()
        });

        const createdPlaylist = await playlistService.getById(id);
        if (createdPlaylist && onPlaylistCreated) {
          onPlaylistCreated({ ...createdPlaylist, id });
        }
        toast.success('プレイリストを作成しました');
      }
      onClose();
    } catch (error) {
      console.error('Failed to save playlist:', error);
      toast.error('プレイリストの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const totalProblems = quizSets
    .filter(qs => qs.id && selectedQuizSetIds.includes(qs.id))
    .reduce((sum, qs) => sum + qs.problemIds.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ListMusic className="text-primary" size={28} />
              {existingPlaylist ? 'プレイリストを編集' : 'プレイリストを作成'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-secondary hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Emoji Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-white">
              絵文字を選択
            </label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((emojiOption) => (
                <button
                  key={emojiOption}
                  onClick={() => setEmoji(emojiOption)}
                  className={`text-3xl p-3 rounded-xl border-2 transition-all ${
                    emoji === emojiOption
                      ? 'border-primary bg-primary/20 scale-110'
                      : 'border-white/10 bg-surfaceHighlight hover:border-primary/50'
                  }`}
                >
                  {emojiOption}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-white">
              プレイリスト名 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 試験前の総復習"
              className="w-full p-3 rounded-xl bg-surfaceHighlight border border-white/10 text-white
                focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all
                placeholder-text-secondary/50"
              maxLength={50}
            />
            <p className="text-xs text-text-secondary">{name.length}/50文字</p>
          </div>

          {/* Description Input */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-white">
              説明（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 基本問題から応用問題まで、幅広くカバー"
              className="w-full p-3 rounded-xl bg-surfaceHighlight border border-white/10 text-white
                focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all
                placeholder-text-secondary/50 resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-text-secondary">{description.length}/200文字</p>
          </div>

          {/* Quiz Set Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              問題セットを選択 * ({selectedQuizSetIds.length}個選択中)
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto p-1">
              {quizSets.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <p>問題セットがありません</p>
                  <p className="text-sm mt-2">先に問題セットを作成してください</p>
                </div>
              ) : (
                quizSets.map((quizSet) => (
                  <button
                    key={quizSet.id}
                    onClick={() => quizSet.id && handleToggleQuizSet(quizSet.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      quizSet.id && selectedQuizSetIds.includes(quizSet.id)
                        ? 'border-primary bg-primary/20'
                        : 'border-white/10 bg-surfaceHighlight hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{quizSet.name}</h3>
                        <p className="text-sm text-text-secondary mt-1">
                          {quizSet.problemIds.length}問
                          {quizSet.description && ` • ${quizSet.description}`}
                        </p>
                      </div>
                      {quizSet.id && selectedQuizSetIds.includes(quizSet.id) && (
                        <Check className="text-primary ml-3 flex-shrink-0" size={24} />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Summary */}
          {selectedQuizSetIds.length > 0 && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white font-bold">合計:</span>
                <span className="text-primary font-bold">{totalProblems}問</span>
                <span className="text-text-secondary">
                  ({selectedQuizSetIds.length}個の問題セット)
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <NeumorphicButton
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              キャンセル
            </NeumorphicButton>
            <NeumorphicButton
              variant="primary"
              onClick={handleSave}
              className="flex-1"
              disabled={isLoading || !name.trim() || selectedQuizSetIds.length === 0}
            >
              {isLoading ? '保存中...' : existingPlaylist ? '更新' : '作成'}
            </NeumorphicButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
