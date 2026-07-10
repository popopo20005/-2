/**
 * ReviewView - Claude Design モック 2j 準拠の「ふりかえり」画面
 * 週次サマリー + 弱点トップ3 + 学習カレンダー/トレンドへのリンク
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { historyService } from '../lib/database';
import { detectTopWeaknesses } from '../services/weaknessDetectionService';
import { getWeeklyStudyTime } from '../lib/studyTimeService';
import type { View, HistoryEntry } from '../types';

interface ReviewViewProps {
  onNavigate: (view: View) => void;
  language: 'ja' | 'en';
}

interface WeeklyStats {
  accuracy: number;
  totalProblems: number;
  studyMinutes: number;
  dailyData: { day: string; count: number }[];
}

interface WeaknessItem {
  category: string;
  accuracy: number;
}

export function ReviewView({ onNavigate, language }: ReviewViewProps) {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [weaknesses, setWeaknesses] = useState<WeaknessItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 今週の日付範囲
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const dayLabels = language === 'ja'
        ? ['月', '火', '水', '木', '金', '土', '日']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      // 履歴を取得
      const allHistory: HistoryEntry[] = await historyService.getAll();
      const weekHistory = allHistory.filter(h => new Date(h.timestamp) >= monday);

      const totalProblems = weekHistory.length;
      const correctCount = weekHistory.filter(h => h.isCorrect).length;
      const accuracy = totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0;

      // 日別集計
      const dailyData = dayLabels.map((day, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const count = weekHistory.filter(h => {
          const hDate = new Date(h.timestamp).toISOString().split('T')[0];
          return hDate === dateStr;
        }).length;
        return { day, count };
      });

      // 学習時間
      let studyMinutes = 0;
      try {
        const weeklyTime = await getWeeklyStudyTime();
        studyMinutes = Math.round(weeklyTime.reduce((sum, d) => sum + d.duration, 0) / 60);
      } catch { /* ignore */ }

      setWeeklyStats({ accuracy, totalProblems, studyMinutes, dailyData });

      // 弱点
      try {
        const topWeaknesses = await detectTopWeaknesses();
        setWeaknesses(
          topWeaknesses.slice(0, 3).map(w => ({
            category: w.category,
            accuracy: Math.round(w.accuracy * 100),
          }))
        );
      } catch { /* ignore */ }
    } catch (e) {
      console.error('ReviewView loadData error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 日付範囲テキスト
  const getDateRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${fmt(monday)} – ${fmt(sunday)}`;
  };

  const getAccuracyColor = (acc: number) => {
    if (acc < 60) return '#F472B6';
    if (acc < 75) return '#FBBF24';
    return '#34D399';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxDaily = Math.max(...(weeklyStats?.dailyData.map(d => d.count) || [1]), 1);

  return (
    <div className="flex flex-col max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full">
      {/* Header */}
      <h1 className="text-2xl font-bold text-[#F8FAFC] mb-[18px]">
        {language === 'ja' ? 'ふりかえり' : 'Review'}
      </h1>

      <div className="md:grid md:grid-cols-2 md:gap-4">
      {/* Weekly Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-5 mb-[14px]"
        style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex justify-between mb-4">
          <span className="text-[13px] font-semibold text-[#94A3B8]">
            {language === 'ja' ? '今週' : 'This Week'}
          </span>
          <span className="text-[12px] text-[#64748B]">{getDateRange()}</span>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 mb-[18px]">
          <div className="flex-1 text-center">
            <div className="text-[22px] font-bold" style={{ color: '#34D399' }}>
              {weeklyStats?.accuracy || 0}%
            </div>
            <div className="text-[11px] text-[#64748B]">
              {language === 'ja' ? '正答率' : 'Accuracy'}
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[22px] font-bold text-[#F8FAFC]">
              {weeklyStats?.totalProblems || 0}
            </div>
            <div className="text-[11px] text-[#64748B]">
              {language === 'ja' ? '問題数' : 'Problems'}
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[22px] font-bold text-[#F8FAFC]">
              {weeklyStats?.studyMinutes || 0}
              <span className="text-[13px] text-[#64748B]">
                {language === 'ja' ? '分' : 'm'}
              </span>
            </div>
            <div className="text-[11px] text-[#64748B]">
              {language === 'ja' ? '学習時間' : 'Study Time'}
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end gap-2 h-[72px]">
          {weeklyStats?.dailyData.map((bar, i) => {
            const heightPercent = maxDaily > 0 ? (bar.count / maxDaily) * 100 : 0;
            const today = new Date();
            const dayOfWeek = today.getDay();
            const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const isToday = i === todayIndex;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-[6px] h-full justify-end">
                <div
                  className="w-full rounded-t-[6px] rounded-b-[2px] min-h-[4px]"
                  style={{
                    height: `${Math.max(heightPercent, 6)}%`,
                    background: isToday
                      ? 'linear-gradient(to top, #6366F1, #818CF8)'
                      : 'rgba(99,102,241,0.3)',
                  }}
                />
                <span className="text-[10px] text-[#64748B]">{bar.day}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Weakness Top 3 */}
      {weaknesses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-2xl p-[18px] px-5 mb-[14px]"
          style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-[13px] font-semibold text-[#94A3B8] mb-3">
            {language === 'ja' ? '弱点トップ3' : 'Top 3 Weaknesses'}
          </div>
          <div className="flex flex-col gap-[10px]">
            {weaknesses.map((w, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-[14px] text-[#F8FAFC]">{w.category}</span>
                <span
                  className="text-[12px] font-bold"
                  style={{ color: getAccuracyColor(w.accuracy) }}
                >
                  {w.accuracy}%
                  {i === 0 && (
                    <span className="ml-1">
                      {language === 'ja' ? '→ 重点出題中' : '→ Focus'}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      </div>

      {/* Navigation Links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        {[
          {
            label: language === 'ja' ? '学習カレンダー' : 'Study Calendar',
            view: 'diary' as View,
          },
          {
            label: language === 'ja' ? '月次・トレンド・予測' : 'Monthly Trends & Predictions',
            view: 'stats' as View,
          },
          {
            label: language === 'ja' ? '弱点分析の詳細' : 'Weakness Analysis Details',
            view: 'weaknessAnalysis' as View,
          },
        ].map((link, i) => (
          <button
            key={i}
            onClick={() => onNavigate(link.view)}
            className="rounded-xl px-[18px] py-[14px] flex justify-between items-center transition-colors hover:bg-white/5 active:bg-white/10"
            style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-[13px] text-[#CBD5E1]">{link.label}</span>
            <ChevronRight size={14} className="text-[#64748B]" />
          </button>
        ))}
      </motion.div>
    </div>
  );
}
