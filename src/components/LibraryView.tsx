/**
 * LibraryView - Claude Design モック 2f 準拠のライブラリ画面
 * 検索 + フィルタタブ + セットカード一覧
 * タップでセット詳細 or 既存QuizSetManagerへ遷移
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MoreHorizontal } from 'lucide-react';
import { quizSetService, historyService } from '../lib/database';
import type { View, QuizSet, HistoryEntry } from '../types';

interface LibraryViewProps {
  onNavigate: (view: View, options?: any) => void;
  onStartQuiz: (quizSetId: number) => void;
  onStartCategoryQuiz: (quizSetId: number, category: string) => void;
  onShare?: (quizSetId: number) => void;
}

interface SetCard {
  id: number;
  name: string;
  count: number;
  accuracy: number;
  color: string;
}

type FilterTab = 'all' | 'favorites' | 'tags';

export function LibraryView({ onNavigate, onStartQuiz }: LibraryViewProps) {
  const [sets, setSets] = useState<SetCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showFullManager, setShowFullManager] = useState(false);
  const language = (localStorage.getItem('language') || 'ja') as 'ja' | 'en';

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      const allSets: QuizSet[] = await quizSetService.getAll();
      const allHistory: HistoryEntry[] = await historyService.getAll();

      const setCards: SetCard[] = await Promise.all(
        allSets.map(async (qs) => {
          const count = qs.problemIds?.length || 0;
          // 正答率を計算
          const setHistory = allHistory.filter(h =>
            qs.problemIds?.includes(h.problemId)
          );
          const answered = setHistory.length;
          const correct = setHistory.filter(h => h.isCorrect).length;
          const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

          const color = accuracy >= 80 ? '#34D399' : accuracy >= 60 ? '#FBBF24' : accuracy > 0 ? '#F472B6' : '#64748B';

          return {
            id: qs.id!,
            name: qs.name,
            count,
            accuracy,
            color,
          };
        })
      );

      setSets(setCards);
    } catch (e) {
      console.error('LibraryView loadSets error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSets = sets.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: language === 'ja' ? 'すべて' : 'All' },
    { id: 'favorites', label: language === 'ja' ? 'お気に入り' : 'Favorites' },
    { id: 'tags', label: language === 'ja' ? 'タグ' : 'Tags' },
  ];

  // フルマネージャーに切り替え (既存機能へのフォールバック)
  if (showFullManager) {
    // App.tsx の quizSets ビューと同じ挙動にフォールバック
    onNavigate('quizSets');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">
          {language === 'ja' ? 'ライブラリ' : 'Library'}
        </h1>
        <button
          onClick={() => setShowFullManager(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <MoreHorizontal size={20} className="text-[#64748B]" />
        </button>
      </div>

      {/* Search */}
      <div
        className="rounded-xl px-4 py-3 mb-[14px] flex items-center gap-2"
        style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Search size={16} className="text-[#64748B]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={language === 'ja' ? 'セット・問題をさがす' : 'Search sets & problems'}
          className="bg-transparent text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none flex-1"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-[18px]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="rounded-full px-[14px] py-[7px] text-[12px] font-semibold transition-colors"
            style={
              activeTab === tab.id
                ? { background: 'rgba(99,102,241,0.15)', border: '1px solid #6366F1', color: '#C7D2FE' }
                : { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Set Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#64748B] text-sm mb-4">
              {language === 'ja' ? '問題セットがありません' : 'No quiz sets found'}
            </p>
            <button
              onClick={() => onNavigate('create')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#6366F1', boxShadow: '0 0 16px rgba(99,102,241,0.35)' }}
            >
              {language === 'ja' ? '問題をつくる' : 'Create Problems'}
            </button>
          </div>
        ) : (
          filteredSets.map((set, index) => (
            <motion.button
              key={set.id}
              onClick={() => onStartQuiz(set.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
              className="w-full text-left"
            >
              <div
                className="rounded-2xl p-[18px] px-5 transition-transform active:scale-[0.98]"
                style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="flex justify-between items-center mb-[10px]">
                  <div className="text-[15px] font-semibold text-[#F8FAFC]">{set.name}</div>
                  <span className="text-[11px] text-[#64748B]">{set.count}問</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${set.accuracy}%`,
                        background: set.color,
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: set.color }}>
                    {set.accuracy > 0 ? `${set.accuracy}%` : '—'}
                  </span>
                  <span
                    className="rounded-full px-[14px] py-[6px] text-[12px] font-bold"
                    style={{
                      background: 'rgba(99,102,241,0.15)',
                      border: '1px solid rgba(99,102,241,0.4)',
                      color: '#C7D2FE',
                    }}
                  >
                    {language === 'ja' ? '続き' : 'Continue'}
                  </span>
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
