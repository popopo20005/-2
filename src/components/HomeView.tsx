/**
 * HomeView - Claude Design モック準拠のホーム画面
 * モック 2b (Day1) / 2c (Day30) / 3h (ストリーク危機) / 4b (サイクルバー) を統合
 * 「今日の1歩」を中心に、SM-2復習+弱点を1つのCTAに束ねる
 * 段階的機能解放 + a-PDCAサイクルバー
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserProgress } from '../services/gamificationService';
import { spacedRepetitionService, problemService } from '../lib/database';
import { detectTopWeaknesses, getRecommendedProblemsForWeakness } from '../services/weaknessDetectionService';
import { CycleBar } from './CycleBar';
import { FeatureUnlockMoment } from './FeatureUnlockMoment';
import {
  checkUnlocks,
  getLockedFeatures,
  getPendingUnlocks,
  markUnlockShown,
  isFeatureUnlocked,
  type FeatureDefinition,
} from '../services/featureUnlockService';
import type { View } from '../types';

interface HomeViewProps {
  language: 'ja' | 'en';
  onNavigate: (view: View, options?: any) => void;
}

interface TodayStep {
  title: string;
  subtitle: string;
  problemIds?: number[];
  mode?: string;
}

interface PathNode {
  label: string;
  day: string;
  isActive: boolean;
  isCompleted: boolean;
}

export function HomeView({ language, onNavigate }: HomeViewProps) {
  const [userName, setUserName] = useState('');
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpForNext, setXpForNext] = useState(100);
  const [streak, setStreak] = useState(0);
  const [todayStep, setTodayStep] = useState<TodayStep | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysUsing, setDaysUsing] = useState(1);
  const [sm2Stats, setSm2Stats] = useState<{
    totalCards: number; dueToday: number; avgAccuracy: number;
  } | null>(null);
  const [unlockFeature, setUnlockFeature] = useState<FeatureDefinition | null>(null);
  const [isStreakCrisis, setIsStreakCrisis] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedName = localStorage.getItem('userName') || 'ユーザー';
      setUserName(savedName);

      const progress = await getUserProgress();
      setLevel(progress.level);
      setXp(progress.totalXP);
      setStreak(progress.currentStreak);

      const nextLevelXP = Math.floor(100 * Math.pow(progress.level + 1, 1.3));
      setXpForNext(nextLevelXP);

      // 使用日数
      const firstUsed = localStorage.getItem('appFirstUsedDate');
      let days = 1;
      if (!firstUsed) {
        localStorage.setItem('appFirstUsedDate', new Date().toISOString());
      } else {
        days = Math.max(1, Math.ceil((Date.now() - new Date(firstUsed).getTime()) / (1000 * 60 * 60 * 24)));
      }
      setDaysUsing(days);

      // SM-2 統計を取得
      try {
        const stats = await spacedRepetitionService.getSROverallStats();
        setSm2Stats({ totalCards: stats.totalCards, dueToday: stats.dueToday, avgAccuracy: stats.averageAccuracy });
      } catch { /* SM-2未使用 */ }

      // 機能解放チェック
      const newUnlocks = checkUnlocks(progress.level, days);
      if (newUnlocks.length === 0) {
        // 既存の未表示解放を確認
        const pending = getPendingUnlocks();
        if (pending.length > 0) {
          setUnlockFeature(pending[0]);
        }
      } else {
        setUnlockFeature(newUnlocks[0]);
      }

      // ストリーク危機判定 (21時以降 & 今日まだ学習していない)
      const hour = new Date().getHours();
      const todayStudied = localStorage.getItem('lastStudyDate') === new Date().toISOString().split('T')[0];
      if (hour >= 21 && !todayStudied && progress.currentStreak > 0) {
        setIsStreakCrisis(true);
      }

      // 「今日の1歩」を決定
      await determineTodayStep();
    } catch (e) {
      console.error('HomeView loadData error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const determineTodayStep = async () => {
    // 1. SM-2復習カードがあるか?
    try {
      const allCards = await spacedRepetitionService.getAllCards();
      const now = new Date();
      const dueCards = allCards.filter((c: { nextReviewDate: Date }) => new Date(c.nextReviewDate) <= now);

      if (dueCards.length > 0) {
        const categoryCount: Record<string, number> = {};
        for (const card of dueCards) {
          const cat = card.category || '復習';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        }
        const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];

        const weaknesses = await detectTopWeaknesses();
        const weakCount = Math.min(3, weaknesses.length > 0 ? 3 : 0);
        const total = Math.min(dueCards.length + weakCount, 10);

        setTodayStep({
          title: `${topCategory[0]}の復習 ${total}問`,
          subtitle: language === 'ja'
            ? `約${Math.ceil(total * 0.5)}分 / SM-2復習 ${Math.min(dueCards.length, total - weakCount)}問${weakCount > 0 ? ` + 弱点 ${weakCount}問` : ''}`
            : `~${Math.ceil(total * 0.5)}min / ${Math.min(dueCards.length, total - weakCount)} review${weakCount > 0 ? ` + ${weakCount} weak` : ''}`,
          problemIds: dueCards.slice(0, total - weakCount).map((c: { problemId: number }) => c.problemId),
          mode: 'review',
        });
        return;
      }
    } catch { /* SM-2未使用 */ }

    // 2. 弱点がある場合
    try {
      const weaknesses = await detectTopWeaknesses();
      if (weaknesses.length > 0) {
        const top = weaknesses[0];
        const weakProblemIds = await getRecommendedProblemsForWeakness(top.category);
        setTodayStep({
          title: language === 'ja' ? `${top.category}を強化 5問` : `Practice ${top.category} (5)`,
          subtitle: language === 'ja' ? '約3分 / 弱点を重点練習' : '~3min / Focus on weak areas',
          problemIds: weakProblemIds.slice(0, 5),
          mode: 'review',
        });
        return;
      }
    } catch { /* 弱点検出未使用 */ }

    // 3. デフォルト
    const allProblems = await problemService.getAll();
    const shuffled = [...allProblems].sort(() => Math.random() - 0.5);
    const selectedIds = shuffled.slice(0, 5).map(p => p.id).filter((id): id is number => id !== undefined);
    setTodayStep({
      title: language === 'ja'
        ? (allProblems.length > 0 ? 'おさらい 5問' : 'サンプルで5問プレイ')
        : (allProblems.length > 0 ? 'Review 5 problems' : 'Try 5 sample problems'),
      subtitle: language === 'ja' ? '約3分 / これだけでOK' : '~3min / Just this is enough',
      problemIds: selectedIds.length > 0 ? selectedIds : undefined,
      mode: selectedIds.length > 0 ? 'review' : undefined,
    });
  };

  const handleStartTodayStep = () => {
    if (todayStep?.problemIds && todayStep.problemIds.length > 0) {
      onNavigate('quiz', { problemIds: todayStep.problemIds, mode: todayStep.mode });
    } else {
      onNavigate('quiz');
    }
  };

  const handleQuick5 = async () => {
    let problemIds: number[] = [];
    try {
      const allCards = await spacedRepetitionService.getAllCards();
      const now = new Date();
      const dueCards = allCards.filter((c: { nextReviewDate: Date }) => new Date(c.nextReviewDate) <= now);
      problemIds = dueCards.slice(0, 5).map((c: { problemId: number }) => c.problemId);
    } catch { /* ignore */ }
    if (problemIds.length < 5) {
      try {
        const allProblems = await problemService.getAll();
        const remaining = allProblems
          .filter(p => p.id && !problemIds.includes(p.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 5 - problemIds.length)
          .map(p => p.id!)
          .filter((id): id is number => id !== undefined);
        problemIds = [...problemIds, ...remaining];
      } catch { /* ignore */ }
    }
    if (problemIds.length > 0) {
      onNavigate('quiz', { problemIds, mode: 'review' });
    } else {
      onNavigate('quiz');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'ja' ? 'おはよう' : 'Good morning';
    if (hour < 18) return language === 'ja' ? 'こんにちは' : 'Good afternoon';
    return language === 'ja' ? 'こんばんは' : 'Good evening';
  };

  const getPathNodes = (): PathNode[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const days = ['月', '火', '水', '木', '金', '土', '日'];

    return days.map((day, i) => ({
      label: i < ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) ? '✓' : (i === ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) ? '今' : ''),
      day,
      isActive: i === ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1),
      isCompleted: i < ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1),
    }));
  };

  const handleUnlockAction = () => {
    if (unlockFeature) {
      markUnlockShown(unlockFeature.id);
      setUnlockFeature(null);
      // 機能に応じた画面へナビゲート
      const navMap: Record<string, View> = {
        weeklyReview: 'review',
        studyPlan: 'studyPlan',
        pomodoro: 'pomodoro',
        audioStudy: 'podcast',
        flashcard: 'spacedRepetitionManager',
        trendAnalysis: 'stats',
        weaknessAnalysis: 'weaknessAnalysis',
        goalManager: 'goalManager',
        noteManager: 'noteManager',
        backup: 'advancedBackup',
        share: 'share',
      };
      const target = navMap[unlockFeature.id];
      if (target) onNavigate(target);
    }
  };

  const handleUnlockDismiss = () => {
    if (unlockFeature) {
      markUnlockShown(unlockFeature.id);
      setUnlockFeature(null);
    }
  };

  // 残り時間計算（ストリーク危機用）
  const getTimeRemaining = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}時間${minutes}分`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pathNodes = getPathNodes();
  const lockedFeatures = getLockedFeatures().slice(0, 2);

  return (
    <>
      {/* 機能解放演出 */}
      <AnimatePresence>
        {unlockFeature && (
          <FeatureUnlockMoment
            feature={unlockFeature}
            language={language}
            triggerLabel={
              unlockFeature.unlockCondition.type === 'day'
                ? (language === 'ja' ? `${unlockFeature.unlockCondition.value}日連続達成!` : `${unlockFeature.unlockCondition.value} day streak!`)
                : (language === 'ja' ? `Lv.${unlockFeature.unlockCondition.value}達成!` : `Reached Lv.${unlockFeature.unlockCondition.value}!`)
            }
            onAction={handleUnlockAction}
            onDismiss={handleUnlockDismiss}
          />
        )}
      </AnimatePresence>

      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto space-y-4">
        {/* Header: 挨拶 + Lv + Streak */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[13px] text-[#94A3B8]">{getGreeting()}、{userName}さん</p>
            <p className="text-[20px] font-bold text-white">
              Lv.{level}{' '}
              <span className="text-[12px] font-semibold text-[#818CF8]">{xp}/{xpForNext} XP</span>
            </p>
          </div>
          <div
            className="flex items-center gap-[6px] px-4 py-2 rounded-full"
            style={isStreakCrisis
              ? { background: 'rgba(244,114,182,0.12)', border: '1.5px solid rgba(244,114,182,0.6)', boxShadow: '0 0 16px rgba(244,114,182,0.3)' }
              : { background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.4)' }
            }
          >
            <span
              className="w-[10px] h-[10px] rounded-full"
              style={isStreakCrisis
                ? { background: '#F472B6', boxShadow: '0 0 10px rgba(244,114,182,0.9)' }
                : { background: '#FB923C', boxShadow: '0 0 10px rgba(251,146,60,0.8)' }
              }
            />
            <span className={`text-[14px] font-bold ${isStreakCrisis ? 'text-[#F9A8D4]' : 'text-[#FDBA74]'}`}>
              {isStreakCrisis
                ? (language === 'ja' ? `${streak}日 危機!` : `${streak}d at risk!`)
                : streak > 0
                  ? (language === 'ja' ? `${streak}日連続` : `${streak} day streak`)
                  : (language === 'ja' ? `${daysUsing}日目` : `Day ${daysUsing}`)
              }
            </span>
          </div>
        </div>

        {/* a-PDCAサイクルバー (2周目以降 or Day7+) */}
        {daysUsing >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <CycleBar language={language} />
          </motion.div>
        )}

        {/* ストリーク危機CTA (screen 3h) */}
        {isStreakCrisis ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-[20px] p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(190,24,93,0.25), rgba(154,52,18,0.25))',
              border: '1.5px solid rgba(244,114,182,0.5)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-[12px] font-bold text-[#F9A8D4] tracking-[0.1em] mb-2">
              {language === 'ja' ? `残り ${getTimeRemaining()}` : `${getTimeRemaining()} remaining`}
            </p>
            <p className="text-[20px] font-bold text-white leading-relaxed mb-1">
              {language === 'ja'
                ? `5問だけで、${streak}日連続を守れます`
                : `Just 5 to keep your ${streak}-day streak`}
            </p>
            <p className="text-[13px] text-[#FBCFE8] opacity-80 mb-5">
              {todayStep?.subtitle || (language === 'ja' ? '約3分' : '~3min')}
            </p>
            <motion.button
              onClick={handleStartTodayStep}
              className="w-full h-[52px] rounded-[14px] flex items-center justify-center text-[16px] font-bold"
              style={{
                background: '#F472B6',
                color: '#500724',
                boxShadow: '0 0 24px rgba(244,114,182,0.5)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              {language === 'ja' ? 'いま5問だけやる' : 'Do just 5 now'}
            </motion.button>
          </motion.div>
        ) : (
          /* 通常の「今日の1歩」CTA */
          todayStep && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-[20px] p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(30,58,138,0.3), rgba(22,78,99,0.3))',
                border: '1px solid rgba(99,102,241,0.4)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.37)',
              }}
            >
              <p className="text-[12px] font-bold text-[#818CF8] tracking-[0.1em] mb-2">
                {language === 'ja' ? '今日の1歩' : "TODAY'S STEP"}
              </p>
              <p className="text-[21px] font-bold text-white leading-relaxed mb-1">
                {todayStep.title}
              </p>
              <p className="text-[13px] text-[#94A3B8] mb-5">{todayStep.subtitle}</p>
              <motion.button
                onClick={handleStartTodayStep}
                className="w-full h-[52px] rounded-[14px] bg-[#6366F1] flex items-center justify-center text-[16px] font-bold text-white"
                style={{ boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
                whileTap={{ scale: 0.97 }}
              >
                {language === 'ja' ? 'はじめる' : 'Start'}
              </motion.button>
            </motion.div>
          )
        )}

        {/* ストリーク危機時のフリーズオプション */}
        {isStreakCrisis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-[14px] px-[18px] py-[14px] flex justify-between items-center"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span className="text-[13px] text-[#94A3B8]">
              {language === 'ja' ? 'どうしても無理な日は…' : "Can't do it today?"}
            </span>
            <span className="text-[12px] font-bold text-[#818CF8]">
              {language === 'ja' ? 'フリーズを使う' : 'Use freeze'}
            </span>
          </motion.div>
        )}

        {/* SM-2 Summary Bar */}
        {sm2Stats && sm2Stats.totalCards > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-[14px] px-4 py-3 flex justify-between items-center"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-center flex-1">
              <div className="text-[16px] font-bold" style={{ color: sm2Stats.dueToday > 0 ? '#F472B6' : '#34D399' }}>
                {sm2Stats.dueToday}
              </div>
              <div className="text-[10px] text-[#64748B]">
                {language === 'ja' ? '要復習' : 'Due'}
              </div>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="text-center flex-1">
              <div className="text-[16px] font-bold text-[#F8FAFC]">{sm2Stats.totalCards}</div>
              <div className="text-[10px] text-[#64748B]">
                {language === 'ja' ? '総カード' : 'Cards'}
              </div>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="text-center flex-1">
              <div className="text-[16px] font-bold text-[#818CF8]">
                {Math.round(sm2Stats.avgAccuracy * 100)}%
              </div>
              <div className="text-[10px] text-[#64748B]">
                {language === 'ja' ? '記憶率' : 'Retention'}
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions (3列) - Day30+ or Lv.3+ */}
        {(daysUsing >= 7 || level >= 3) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-[10px]"
          >
            <button
              onClick={handleQuick5}
              className="flex-1 rounded-[14px] py-[14px] px-3 text-center"
              style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <p className="text-[13px] font-bold text-[#34D399]">
                {language === 'ja' ? 'クイック5' : 'Quick 5'}
              </p>
              <p className="text-[11px] text-[#64748B] mt-[2px]">3{language === 'ja' ? '分' : 'min'}</p>
            </button>
            {isFeatureUnlocked('pomodoro') && (
              <button
                onClick={() => onNavigate('pomodoro')}
                className="flex-1 rounded-[14px] py-[14px] px-3 text-center"
                style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p className="text-[13px] font-bold text-[#A78BFA]">
                  {language === 'ja' ? 'ポモドーロ' : 'Pomodoro'}
                </p>
                <p className="text-[11px] text-[#64748B] mt-[2px]">25{language === 'ja' ? '分' : 'min'}</p>
              </button>
            )}
            {isFeatureUnlocked('audioStudy') && (
              <button
                onClick={() => onNavigate('podcast')}
                className="flex-1 rounded-[14px] py-[14px] px-3 text-center"
                style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p className="text-[13px] font-bold text-[#60A5FA]">
                  {language === 'ja' ? '音声学習' : 'Audio'}
                </p>
                <p className="text-[11px] text-[#64748B] mt-[2px]">{language === 'ja' ? 'ながら' : 'Listen'}</p>
              </button>
            )}
          </motion.div>
        )}

        {/* 今週のみち (Day7+) */}
        {daysUsing >= 7 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="text-[13px] font-semibold text-[#94A3B8] mb-[10px]">
              {language === 'ja' ? '今週のみち' : "This week's path"}
            </p>
            <div className="flex">
              {pathNodes.map((node, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-[6px]">
                  <div
                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{
                      background: node.isActive
                        ? 'rgba(99,102,241,0.25)'
                        : node.isCompleted
                          ? 'rgba(16,185,129,0.2)'
                          : 'rgba(30,41,59,0.7)',
                      border: `2px solid ${
                        node.isActive ? '#6366F1' : node.isCompleted ? '#10B981' : 'rgba(255,255,255,0.15)'
                      }`,
                      color: node.isActive ? '#C7D2FE' : node.isCompleted ? '#34D399' : '#64748B',
                      boxShadow: node.isActive ? '0 0 14px rgba(99,102,241,0.7)' : 'none',
                    }}
                  >
                    {node.label}
                  </div>
                  <span className="text-[10px] text-[#64748B]">{node.day}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 週次レビューバナー (日曜日 & 解放済み) */}
        {new Date().getDay() === 0 && isFeatureUnlocked('weeklyReview') && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            onClick={() => onNavigate('review')}
            className="w-full rounded-[14px] px-[18px] py-[14px] flex justify-between items-center"
            style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(167,139,250,0.35)',
            }}
          >
            <span className="text-[13px] text-[#C4B5FD]">
              <strong>{language === 'ja' ? '週次レビュー' : 'Weekly Review'}</strong>
              {language === 'ja' ? 'の時間です(日曜)' : ' time (Sunday)'}
            </span>
            <span className="text-[12px] font-bold text-[#A78BFA]">
              {language === 'ja' ? '見る →' : 'View →'}
            </span>
          </motion.button>
        )}

        {/* つくるカード */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          onClick={() => onNavigate('create')}
          className="w-full rounded-[16px] px-5 py-4 flex justify-between items-center"
          style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-left">
            <p className="text-[14px] font-semibold text-white">
              {language === 'ja' ? '自分の問題をつくる' : 'Create your own problems'}
            </p>
            <p className="text-[12px] text-[#64748B]">
              {language === 'ja' ? '貼り付け or AIで自動生成' : 'Paste or AI auto-generate'}
            </p>
          </div>
          <div className="px-[18px] py-2 rounded-full text-[13px] font-bold text-[#34D399]"
               style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}>
            {language === 'ja' ? 'つくる' : 'Create'}
          </div>
        </motion.button>

        {/* クイックスタートガイド */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
          onClick={() => onNavigate('guide')}
          className="w-full rounded-[16px] px-5 py-4 flex justify-between items-center"
          style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-left">
            <p className="text-[14px] font-semibold text-white">
              {language === 'ja' ? 'クイックスタートガイド' : 'Quick Start Guide'}
            </p>
            <p className="text-[12px] text-[#64748B]">
              {language === 'ja' ? '5ステップで使い方をマスター' : 'Master the app in 5 steps'}
            </p>
          </div>
          <div className="px-[18px] py-2 rounded-full text-[13px] font-bold text-[#818CF8]"
               style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)' }}>
            {language === 'ja' ? 'ガイド' : 'Guide'}
          </div>
        </motion.button>

        {/* これから解放される機能 (Day1〜6) */}
        {lockedFeatures.length > 0 && daysUsing < 30 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <p className="text-[12px] font-semibold text-[#64748B] mb-[10px]">
              {language === 'ja' ? 'これから解放される機能' : 'Coming soon'}
            </p>
            <div className="flex flex-col gap-2 opacity-75">
              {lockedFeatures.map(feature => (
                <div
                  key={feature.id}
                  className="rounded-[12px] px-4 py-3 flex justify-between items-center"
                  style={{ background: 'rgba(30,41,59,0.45)', border: '1px dashed rgba(255,255,255,0.12)' }}
                >
                  <span className="text-[13px] text-[#64748B]">
                    {language === 'ja' ? feature.name : feature.nameEn}
                  </span>
                  <span className="text-[11px] font-bold text-[#818CF8] bg-[rgba(99,102,241,0.12)] rounded-full px-[10px] py-1">
                    {feature.unlockCondition.type === 'level'
                      ? `Lv.${feature.unlockCondition.value}${language === 'ja' ? 'で解放' : ''}`
                      : `${feature.unlockCondition.value}${language === 'ja' ? '日目で解放' : 'd'}`}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
