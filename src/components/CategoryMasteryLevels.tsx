/**
 * Category Mastery Levels (Khan Academy style)
 * 5-tier system: Not Started → Attempted → Familiar → Proficient → Mastered
 * Shows mastery badges with progress toward next level.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { historyService } from '../lib/database';

export type MasteryTier = 'not_started' | 'attempted' | 'familiar' | 'proficient' | 'mastered';

export interface CategoryMastery {
  category: string;
  tier: MasteryTier;
  tierIndex: number; // 0-4
  accuracy: number;
  totalAttempts: number;
  consecutiveCorrect: number;
  progress: number; // 0-100 toward next tier
}

interface CategoryMasteryLevelsProps {
  language: 'ja' | 'en';
  compact?: boolean;
  maxItems?: number;
}

// Tier definitions
const TIERS: {
  id: MasteryTier;
  label: string;
  labelEn: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  minAccuracy: number;
  minAttempts: number;
}[] = [
  { id: 'not_started', label: '未着手', labelEn: 'Not Started', emoji: '⚪', color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/20', minAccuracy: 0, minAttempts: 0 },
  { id: 'attempted', label: '挑戦中', labelEn: 'Attempted', emoji: '🔵', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', minAccuracy: 0, minAttempts: 3 },
  { id: 'familiar', label: '理解中', labelEn: 'Familiar', emoji: '🟢', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', minAccuracy: 60, minAttempts: 10 },
  { id: 'proficient', label: '習熟', labelEn: 'Proficient', emoji: '🟣', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', minAccuracy: 80, minAttempts: 20 },
  { id: 'mastered', label: 'マスター', labelEn: 'Mastered', emoji: '🏆', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', minAccuracy: 90, minAttempts: 30 },
];

export function calculateMasteryTier(accuracy: number, totalAttempts: number): { tier: MasteryTier; tierIndex: number; progress: number } {
  // Work backwards from highest tier
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const tier = TIERS[i];
    if (totalAttempts >= tier.minAttempts && accuracy >= tier.minAccuracy) {
      // Calculate progress toward next tier
      let progress = 100;
      if (i < TIERS.length - 1) {
        const next = TIERS[i + 1];
        const accuracyProgress = next.minAccuracy > 0
          ? Math.min(100, ((accuracy - tier.minAccuracy) / (next.minAccuracy - tier.minAccuracy)) * 100)
          : 100;
        const attemptProgress = Math.min(100, (totalAttempts / next.minAttempts) * 100);
        progress = Math.round((accuracyProgress + attemptProgress) / 2);
      }
      return { tier: tier.id, tierIndex: i, progress };
    }
  }
  return { tier: 'not_started', tierIndex: 0, progress: 0 };
}

export function CategoryMasteryLevels({ language, compact = false, maxItems = 10 }: CategoryMasteryLevelsProps) {
  const [masteries, setMasteries] = useState<CategoryMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMasteryData();
  }, []);

  const loadMasteryData = async () => {
    try {
      const allHistory = await historyService.getAll();

      // Group by category
      const categoryMap = new Map<string, { correct: number; total: number; consecutive: number }>();

      for (const entry of allHistory) {
        if (!entry.category) continue;
        const existing = categoryMap.get(entry.category) || { correct: 0, total: 0, consecutive: 0 };
        existing.total++;
        if (entry.isCorrect) {
          existing.correct++;
          existing.consecutive++;
        } else {
          existing.consecutive = 0;
        }
        categoryMap.set(entry.category, existing);
      }

      // Calculate mastery for each category
      const results: CategoryMastery[] = [];
      for (const [category, data] of categoryMap) {
        const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        const { tier, tierIndex, progress } = calculateMasteryTier(accuracy, data.total);
        results.push({
          category,
          tier,
          tierIndex,
          accuracy,
          totalAttempts: data.total,
          consecutiveCorrect: data.consecutive,
          progress,
        });
      }

      // Sort by tier (highest first), then by accuracy
      results.sort((a, b) => b.tierIndex - a.tierIndex || b.accuracy - a.accuracy);
      setMasteries(results.slice(0, maxItems));
    } catch (error) {
      console.error('CategoryMasteryLevels load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-20 bg-white/5 rounded-2xl" />;
  }

  if (masteries.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {masteries.map((m) => {
          const tierDef = TIERS[m.tierIndex];
          return (
            <div
              key={m.category}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                ${tierDef.bgColor} border ${tierDef.borderColor}`}
            >
              <span className="text-xs">{tierDef.emoji}</span>
              <span className="text-xs font-medium text-gray-300 truncate max-w-[80px]">
                {m.category}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {masteries.map((m, index) => {
        const tierDef = TIERS[m.tierIndex];
        return (
          <motion.div
            key={m.category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-3 rounded-xl border ${tierDef.borderColor} ${tierDef.bgColor}`}
          >
            <div className="flex items-center gap-3">
              {/* Tier badge */}
              <div className="text-xl leading-none flex-shrink-0">
                {tierDef.emoji}
              </div>

              {/* Category info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">
                    {m.category}
                  </span>
                  <span className={`text-xs font-medium ${tierDef.color}`}>
                    {language === 'ja' ? tierDef.label : tierDef.labelEn}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        m.tierIndex === 4 ? 'bg-amber-400' :
                        m.tierIndex === 3 ? 'bg-purple-400' :
                        m.tierIndex === 2 ? 'bg-green-400' :
                        m.tierIndex === 1 ? 'bg-blue-400' : 'bg-gray-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${m.progress}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05 }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 tabular-nums w-8 text-right">
                    {m.accuracy}%
                  </span>
                </div>

                {/* Stats */}
                <div className="mt-1 flex gap-3 text-[10px] text-gray-500">
                  <span>{m.totalAttempts} {language === 'ja' ? '問' : 'Q'}</span>
                  {m.tierIndex < 4 && (
                    <span>
                      {language === 'ja' ? '次のレベルまで' : 'Next:'} {TIERS[m.tierIndex + 1]?.minAttempts - m.totalAttempts > 0
                        ? `${TIERS[m.tierIndex + 1].minAttempts - m.totalAttempts}問`
                        : `${TIERS[m.tierIndex + 1].minAccuracy}%必要`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Get tier info for external use */
export function getTierInfo(tierIndex: number) {
  return TIERS[tierIndex] || TIERS[0];
}
