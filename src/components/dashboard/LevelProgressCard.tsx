import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Trophy, Star } from 'lucide-react';

interface LevelProgressCardProps {
    level: number;
    currentXP: number;
    nextLevelXP: number;
    rankName: string;
}

export const LevelProgressCard: React.FC<LevelProgressCardProps> = ({
    level,
    currentXP,
    nextLevelXP,
    rankName,
}) => {
    const progress = Math.min((currentXP / nextLevelXP) * 100, 100);

    return (
        <GlassCard variant="primary" className="relative overflow-hidden mb-6 group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Level Info */}
                <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                        {/* Circular Progress Background */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="40"
                                cy="40"
                                r="36"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-white/20"
                            />
                            <circle
                                cx="40"
                                cy="40"
                                r="36"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={226.2}
                                strokeDashoffset={226.2 - (226.2 * progress) / 100}
                                className="text-white transition-all duration-1000 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-xs font-medium text-white/80">LVL</span>
                            <span className="text-2xl font-bold text-white">{level}</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-5 h-5 text-yellow-300" />
                            <h2 className="text-2xl font-bold text-white">{rankName}</h2>
                        </div>
                        <p className="text-white/80 text-sm">
                            {nextLevelXP - currentXP} XP to next level
                        </p>
                    </div>
                </div>

                {/* Right: XP Progress */}
                <div className="w-full md:w-1/3">
                    <div className="flex justify-between text-xs text-white/80 mb-2">
                        <span>Current XP</span>
                        <span className="font-bold">{currentXP} / {nextLevelXP}</span>
                    </div>
                    <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                            className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/30 animate-pulse-glow" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10 transform rotate-12 group-hover:rotate-45 transition-transform duration-700">
                <Star className="w-48 h-48 text-white" />
            </div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </GlassCard>
    );
};
