/**
 * MoreView - Claude Design モック 2n 準拠の「その他」画面
 * プロフィールカード + 機能グループ一覧 + 検索
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Lock } from 'lucide-react';
import { getUserProgress } from '../services/gamificationService';
import { isFeatureUnlocked } from '../services/featureUnlockService';
import type { View } from '../types';

interface MoreViewProps {
  onNavigate: (view: View) => void;
}

interface FeatureItem {
  name: string;
  view: View;
  tag?: string;
  tagColor?: string;
  unlockId?: string;
}

interface FeatureGroup {
  name: string;
  items: FeatureItem[];
}

export function MoreView({ onNavigate }: MoreViewProps) {
  const [userName, setUserName] = useState('');
  const [level, setLevel] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const language = (localStorage.getItem('language') || 'ja') as 'ja' | 'en';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const savedName = localStorage.getItem('userName') || (language === 'ja' ? 'ユーザー' : 'User');
    setUserName(savedName);
    try {
      const progress = await getUserProgress();
      setLevel(progress.level);
    } catch { /* ignore */ }
  };

  const featureGroups: FeatureGroup[] = language === 'ja' ? [
    {
      name: 'はじめに',
      items: [
        { name: 'クイックスタートガイド', view: 'guide' },
        { name: 'プロンプト生成', view: 'promptGenerator' },
        { name: 'AI おつかい', view: 'promptWizard' },
      ],
    },
    {
      name: '学習ツール',
      items: [
        { name: '弱点分析', view: 'weaknessAnalysis', unlockId: 'weaknessAnalysis' },
        { name: 'SM-2 復習管理', view: 'spacedRepetitionManager' },
        { name: 'ポモドーロタイマー', view: 'pomodoro', unlockId: 'pomodoro' },
        { name: '学習カレンダー', view: 'diary' },
        { name: '学習プラン', view: 'studyPlanDashboard', unlockId: 'studyPlan' },
      ],
    },
    {
      name: '分析・レポート',
      items: [
        { name: '統計・トレンド', view: 'stats', unlockId: 'trendAnalysis' },
        { name: 'おすすめ問題', view: 'recommendations' },
        { name: '学習インサイト', view: 'insights' },
        { name: 'サブトピック分析', view: 'subtopicAnalysis' },
        { name: 'PDCAサイクル', view: 'pdcaCycle' },
        { name: '過去問分析', view: 'pastExamAnalysis' },
      ],
    },
    {
      name: 'コンテンツ管理',
      items: [
        { name: '問題の編集', view: 'problemEdit' },
        { name: 'ノート管理', view: 'noteManager', unlockId: 'noteManager' },
        { name: 'スマートノート', view: 'smartNotes' },
        { name: 'テンプレート', view: 'templateManager' },
        { name: 'お気に入り', view: 'favorites' },
      ],
    },
    {
      name: 'データ・設定',
      items: [
        { name: '設定', view: 'settings' },
        { name: 'バックアップ', view: 'advancedBackup', unlockId: 'backup' },
        { name: '共有・QR', view: 'qrShare', unlockId: 'share' },
        { name: 'バッジコレクション', view: 'badges' },
        { name: '目標管理', view: 'goalManager', unlockId: 'goalManager' },
        { name: '解答履歴', view: 'history' },
      ],
    },
  ] : [
    {
      name: 'Getting Started',
      items: [
        { name: 'Quick Start Guide', view: 'guide' },
        { name: 'Prompt Generator', view: 'promptGenerator' },
        { name: 'AI Handoff', view: 'promptWizard' },
      ],
    },
    {
      name: 'Study Tools',
      items: [
        { name: 'Weakness Analysis', view: 'weaknessAnalysis', unlockId: 'weaknessAnalysis' },
        { name: 'SM-2 Review Manager', view: 'spacedRepetitionManager' },
        { name: 'Pomodoro Timer', view: 'pomodoro', unlockId: 'pomodoro' },
        { name: 'Study Calendar', view: 'diary' },
        { name: 'Study Plan', view: 'studyPlanDashboard', unlockId: 'studyPlan' },
      ],
    },
    {
      name: 'Analysis & Reports',
      items: [
        { name: 'Statistics & Trends', view: 'stats', unlockId: 'trendAnalysis' },
        { name: 'Recommendations', view: 'recommendations' },
        { name: 'Learning Insights', view: 'insights' },
        { name: 'Subtopic Analysis', view: 'subtopicAnalysis' },
        { name: 'PDCA Cycle', view: 'pdcaCycle' },
        { name: 'Past Exam Analysis', view: 'pastExamAnalysis' },
      ],
    },
    {
      name: 'Content Management',
      items: [
        { name: 'Edit Problems', view: 'problemEdit' },
        { name: 'Note Manager', view: 'noteManager', unlockId: 'noteManager' },
        { name: 'Smart Notes', view: 'smartNotes' },
        { name: 'Templates', view: 'templateManager' },
        { name: 'Favorites', view: 'favorites' },
      ],
    },
    {
      name: 'Data & Settings',
      items: [
        { name: 'Settings', view: 'settings' },
        { name: 'Backup', view: 'advancedBackup', unlockId: 'backup' },
        { name: 'Share / QR', view: 'qrShare', unlockId: 'share' },
        { name: 'Badges', view: 'badges' },
        { name: 'Goal Manager', view: 'goalManager', unlockId: 'goalManager' },
        { name: 'Answer History', view: 'history' },
      ],
    },
  ];

  // フィルタリング
  const filteredGroups = searchTerm
    ? featureGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter(group => group.items.length > 0)
    : featureGroups;

  const initial = userName.charAt(0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] max-w-md md:max-w-3xl lg:max-w-5xl mx-auto w-full">
      {/* Profile Card */}
      <motion.button
        onClick={() => onNavigate('settings')}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full text-left mb-4"
      >
        <div
          className="rounded-2xl p-4 px-5 flex items-center gap-[14px]"
          style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
          >
            {initial}
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-[#F8FAFC]">{userName}</div>
            <div className="text-[12px] text-[#94A3B8]">Lv.{level}</div>
          </div>
          <ChevronRight size={18} className="text-[#64748B]" />
        </div>
      </motion.button>

      {/* Search */}
      <div
        className="rounded-xl px-4 py-3 mb-[18px] flex items-center gap-2"
        style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Search size={16} className="text-[#64748B]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={language === 'ja' ? '機能をさがす' : 'Search features'}
          className="bg-transparent text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none flex-1"
        />
      </div>

      {/* Feature Groups */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-x-4 content-start">
        {filteredGroups.map((group, gi) => (
          <motion.div
            key={group.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.06, duration: 0.4 }}
            className="mb-4"
          >
            <div className="text-[12px] font-semibold text-[#64748B] mb-2">{group.name}</div>
            <div
              className="rounded-[14px] overflow-hidden"
              style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {group.items.map((item, ii) => {
                const locked = item.unlockId ? !isFeatureUnlocked(item.unlockId) : false;
                return (
                  <button
                    key={item.view + ii}
                    onClick={() => !locked && onNavigate(item.view)}
                    className={`w-full px-[18px] py-[13px] flex justify-between items-center text-left transition-colors ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 active:bg-white/10'}`}
                    style={{
                      borderBottom: ii < group.items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                    disabled={locked}
                  >
                    <span className="text-[14px] text-[#CBD5E1] flex items-center gap-2">
                      {item.name}
                      {locked && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#64748B]"
                              style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <Lock size={10} /> {language === 'ja' ? 'ロック' : 'Locked'}
                        </span>
                      )}
                      {item.tag && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ color: item.tagColor || '#818CF8', background: `${item.tagColor || '#6366F1'}15` }}>
                          {item.tag}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={14} className="text-[#64748B]" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
