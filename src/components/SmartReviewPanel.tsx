/**
 * SmartReviewPanel - ダッシュボードに表示する復習提案パネル
 *
 * 忘却リスク・復習提案・カテゴリー別定着率を表示
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Calendar, TrendingDown, Play } from 'lucide-react';
import { generateSmartReviewSummary } from '../services/smartReviewService';
import type { SmartReviewSummary } from '../services/smartReviewService';

interface SmartReviewPanelProps {
  language?: 'ja' | 'en';
  onStartReview: (problemIds: number[]) => void;
}

const t = {
  ja: {
    title: 'スマート復習',
    urgentLabel: '忘却リスク',
    todayLabel: '今日の復習',
    weeklyLabel: '弱点強化',
    categoryRetention: 'カテゴリー別定着率',
    startReview: '復習する',
    estimatedTime: '推定',
    min: '分',
    problems: '問',
    noReview: '復習の必要はありません',
    retentionAvg: '平均定着率',
  },
  en: {
    title: 'Smart Review',
    urgentLabel: 'Forgetting Risk',
    todayLabel: "Today's Review",
    weeklyLabel: 'Weakness Focus',
    categoryRetention: 'Category Retention',
    startReview: 'Start Review',
    estimatedTime: 'Est.',
    min: 'min',
    problems: 'problems',
    noReview: 'No review needed',
    retentionAvg: 'Avg. Retention',
  },
};

export const SmartReviewPanel: React.FC<SmartReviewPanelProps> = ({
  language = 'ja',
  onStartReview,
}) => {
  const [summary, setSummary] = useState<SmartReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentT = t[language];

  useEffect(() => {
    const load = async () => {
      try {
        const data = await generateSmartReviewSummary();
        setSummary(data);
      } catch (error) {
        console.error('[SmartReviewPanel] Error:', error);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) return null;
  if (!summary) return null;

  const hasProposals = summary.proposals.length > 0;
  if (!hasProposals) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle size={16} className="text-red-400" />;
      case 'recommended': return <Calendar size={16} className="text-blue-400" />;
      case 'weekly': return <TrendingDown size={16} className="text-amber-400" />;
      default: return <Brain size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'from-red-500/20 to-red-600/10 border-red-500/30';
      case 'recommended': return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
      case 'weekly': return 'from-amber-500/20 to-amber-600/10 border-amber-500/30';
      default: return 'from-gray-500/20 to-gray-600/10 border-gray-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/20">
            <Brain size={18} className="text-purple-400" />
          </div>
          <h3 className="text-base font-bold text-white">{currentT.title}</h3>
        </div>
        <div className="text-xs text-gray-400">
          {currentT.retentionAvg}: {Math.round(summary.averageRetention * 100)}%
        </div>
      </div>

      {/* Proposals */}
      <div className="px-4 pb-4 space-y-2.5">
        {summary.proposals.slice(0, 3).map((proposal) => (
          <div
            key={proposal.id}
            className={`
              p-3.5 rounded-xl border bg-gradient-to-br
              ${getTypeColor(proposal.type)}
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getTypeIcon(proposal.type)}
                  <span className="text-sm font-semibold text-white">{proposal.title}</span>
                  <span className="text-xs text-gray-400">
                    {proposal.problemIds.length}{currentT.problems}
                  </span>
                </div>
                <p className="text-xs text-gray-300 line-clamp-1">{proposal.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentT.estimatedTime} {proposal.estimatedMinutes}{currentT.min}
                </p>
              </div>
              <button
                onClick={() => onStartReview(proposal.problemIds)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors"
              >
                <Play size={12} fill="white" />
                <span>{currentT.startReview}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Category Retention Bars */}
      {summary.categoryRetention.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400 mb-2 font-medium">{currentT.categoryRetention}</p>
          <div className="space-y-1.5">
            {summary.categoryRetention.slice(0, 4).map((cat) => (
              <div key={cat.category} className="flex items-center gap-2">
                <span className="text-xs text-gray-300 w-20 truncate">{cat.category}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      cat.retention >= 0.8
                        ? 'bg-green-400'
                        : cat.retention >= 0.5
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.round(cat.retention * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10 text-right">
                  {Math.round(cat.retention * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
