import React from 'react';
import type { Rival } from '../../types/share';
import { GlassCard } from '../ui/GlassCard';
import { Trash2, TrendingUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RivalListProps {
    rivals: Rival[];
    onRemove: (id: string) => void;
}

export const RivalList: React.FC<RivalListProps> = ({ rivals, onRemove }) => {
    if (rivals.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No rivals added yet.</p>
                <p className="text-sm mt-2">Import a friend's data to compete!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AnimatePresence>
                {rivals.map((rival) => (
                    <motion.div
                        key={rival.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        layout
                    >
                        <GlassCard className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                    {rival.profile.avatar || rival.profile.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{rival.profile.name}</h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Award className="w-3 h-3" />
                                            Lvl {rival.profile.level}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {rival.statistics.overallAccuracy.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs text-gray-500">Last Updated</div>
                                    <div className="text-xs font-medium">{rival.lastUpdated.toLocaleDateString()}</div>
                                </div>
                                <button
                                    onClick={() => onRemove(rival.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Remove Rival"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
