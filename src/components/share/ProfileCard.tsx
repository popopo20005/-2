import React from 'react';
import type { UserProfile, SharedStatistics } from '../../types/share';
import { GlassCard } from '../ui/GlassCard';
import { NeumorphicButton } from '../ui/NeumorphicButton';
import { Trophy, Star, Activity, Share2 } from 'lucide-react';

interface ProfileCardProps {
    profile: UserProfile;
    statistics: SharedStatistics;
    onExport: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, statistics, onExport }) => {
    return (
        <GlassCard className="p-6 max-w-md mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-32 h-32" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                        {profile.avatar || profile.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.name}</h2>
                        <div className="flex items-center gap-2 text-primary font-medium">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{profile.title}</span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Level {profile.level}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Answered</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{statistics.totalAnswered}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Accuracy</div>
                        <div className="text-xl font-bold text-green-500">{statistics.overallAccuracy.toFixed(1)}%</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Streak</div>
                        <div className="text-xl font-bold text-orange-500 flex items-center justify-center gap-1">
                            <Activity className="w-4 h-4" />
                            {statistics.streakDays} Days
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Badges</div>
                        <div className="text-xl font-bold text-yellow-500">{statistics.badges.length}</div>
                    </div>
                </div>

                <NeumorphicButton
                    onClick={onExport}
                    variant="primary"
                    className="w-full py-3 font-bold"
                >
                    <div className="flex items-center justify-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Export Profile Data
                    </div>
                </NeumorphicButton>
            </div>
        </GlassCard>
    );
};
