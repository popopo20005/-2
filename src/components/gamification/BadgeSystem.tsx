/**
 * BadgeCollection - Full badge collection view with filters and progress
 * Phase 4: Gamification
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Star, Zap, Target, BookOpen, Award, Crown, Medal,
  CheckCircle, Flame, Shield, Brain, Sparkles, Gem, Diamond,
  Moon, Sunrise, Clock, ArrowLeft, Filter,
} from 'lucide-react';
import {
  BADGE_DEFINITIONS,
  TIER_COLORS,
  type BadgeCategory,
  type BadgeDefinition,
} from '../../types/gamification';
import { getAllBadgesWithStatus } from '../../services/gamificationService';

const t = {
  ja: {
    title: 'バッジコレクション',
    all: 'すべて',
    unlocked: '獲得済み',
    locked: '未獲得',
    streak: '継続',
    accuracy: '正確性',
    volume: '問題数',
    mastery: '熟練',
    special: '特別',
    progress: '進捗',
    earned: '獲得済み',
    earnedCount: (n: number, total: number) => `${n} / ${total} 獲得`,
    xpReward: (xp: number) => `+${xp} XP`,
  },
  en: {
    title: 'Badge Collection',
    all: 'All',
    unlocked: 'Unlocked',
    locked: 'Locked',
    streak: 'Streak',
    accuracy: 'Accuracy',
    volume: 'Volume',
    mastery: 'Mastery',
    special: 'Special',
    progress: 'Progress',
    earned: 'Earned',
    earnedCount: (n: number, total: number) => `${n} / ${total} Earned`,
    xpReward: (xp: number) => `+${xp} XP`,
  },
};

interface BadgeWithStatus {
  definition: BadgeDefinition;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress: number;
}

interface BadgeCollectionProps {
  onBack: () => void;
  language?: 'ja' | 'en';
}

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  target: Target,
  'check-circle': CheckCircle,
  'book-open': BookOpen,
  zap: Zap,
  star: Star,
  award: Award,
  trophy: Trophy,
  clock: Clock,
  crown: Crown,
  medal: Medal,
  shield: Shield,
  brain: Brain,
  sparkles: Sparkles,
  gem: Gem,
  diamond: Diamond,
  moon: Moon,
  sunrise: Sunrise,
};

export function BadgeCollection({ onBack, language = 'ja' }: BadgeCollectionProps) {
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<BadgeCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const labels = t[language];

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setIsLoading(true);
    try {
      const data = await getAllBadgesWithStatus();
      setBadges(data);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBadges = badges.filter(b => {
    if (statusFilter === 'unlocked' && !b.isUnlocked) return false;
    if (statusFilter === 'locked' && b.isUnlocked) return false;
    if (categoryFilter !== 'all' && b.definition.category !== categoryFilter) return false;
    return true;
  });

  const unlockedCount = badges.filter(b => b.isUnlocked).length;

  const categories: Array<{ key: BadgeCategory | 'all'; label: string }> = [
    { key: 'all', label: labels.all },
    { key: 'streak', label: labels.streak },
    { key: 'accuracy', label: labels.accuracy },
    { key: 'volume', label: labels.volume },
    { key: 'mastery', label: labels.mastery },
    { key: 'special', label: labels.special },
  ];

  const renderIcon = (iconName: string, className: string) => {
    const IconComp = ICON_MAP[iconName] || Award;
    return <IconComp className={className} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#818CF8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: '#0F172A' }}>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{labels.title}</h1>
        </div>
        <p className="text-[#C7D2FE] text-sm">
          {labels.earnedCount(unlockedCount, BADGE_DEFINITIONS.length)}
        </p>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / BADGE_DEFINITIONS.length) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 space-y-2">
        {/* Status filter */}
        <div className="flex gap-2">
          {(['all', 'unlocked', 'locked'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-[#6366F1] text-white'
                  : 'text-[#94A3B8]'
              }`}
              style={statusFilter !== f ? {
                background: 'rgba(30,41,59,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
              } : undefined}
            >
              {f === 'all' ? labels.all : f === 'unlocked' ? labels.unlocked : labels.locked}
            </button>
          ))}
        </div>
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Filter className="w-4 h-4 text-[#64748B] flex-shrink-0 mt-1" />
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.key
                  ? 'bg-[#6366F1]/20 text-[#818CF8]'
                  : 'text-[#94A3B8]'
              }`}
              style={categoryFilter !== cat.key ? {
                background: 'rgba(30,41,59,0.5)',
              } : undefined}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badge Grid */}
      <div className="px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredBadges.map((badge, index) => {
          const tier = badge.definition.tier;
          const colors = TIER_COLORS[tier];

          return (
            <motion.div
              key={badge.definition.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative p-4 rounded-2xl transition-all duration-300"
              style={badge.isUnlocked ? {
                background: 'rgba(30,41,59,0.7)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: `0 0 20px ${colors.glow}`,
              } : {
                background: 'rgba(30,41,59,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: 0.5,
              }}
            >
              {/* Unlocked badge */}
              {badge.isUnlocked && (
                <div className="absolute -top-1 -right-1 bg-[#10B981] text-white w-5 h-5 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3" />
                </div>
              )}

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                style={badge.isUnlocked ? {
                  background: 'rgba(255,255,255,0.1)',
                  color: '#818CF8',
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  color: '#64748B',
                }}
              >
                {renderIcon(badge.definition.icon, 'w-6 h-6')}
              </div>

              {/* Name */}
              <h3 className="text-sm font-bold text-center text-[#F8FAFC] mb-1 line-clamp-1">
                {language === 'ja' ? badge.definition.name : badge.definition.nameEn}
              </h3>

              {/* Description */}
              <p className="text-xs text-center text-[#94A3B8] mb-2 line-clamp-2">
                {language === 'ja' ? badge.definition.description : badge.definition.descriptionEn}
              </p>

              {/* Progress bar */}
              {!badge.isUnlocked && (
                <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="h-1.5 rounded-full bg-[#64748B] transition-all duration-500"
                    style={{ width: `${badge.progress}%` }}
                  />
                </div>
              )}

              {/* XP reward */}
              <p className={`text-xs text-center mt-1 ${
                badge.isUnlocked ? 'text-[#34D399]' : 'text-[#64748B]'
              }`}>
                {labels.xpReward(badge.definition.xpReward)}
              </p>
            </motion.div>
          );
        })}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-12 text-[#64748B]">
          {statusFilter === 'unlocked'
            ? (language === 'ja' ? 'まだバッジを獲得していません' : 'No badges earned yet')
            : (language === 'ja' ? 'バッジが見つかりません' : 'No badges found')}
        </div>
      )}
    </div>
  );
}

// Re-export for backward compatibility
export { BadgeCollection as BadgeSystem };
