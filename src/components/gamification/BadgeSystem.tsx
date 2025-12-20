import React from 'react';
import { Trophy, Star, Zap, Target, BookOpen, Award, Crown, Medal, CheckCircle } from 'lucide-react';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode | string;
    color: string;
    isUnlocked: boolean;
    progress?: number;
    condition?: (stats: any) => boolean;
}

interface BadgeSystemProps {
    badges?: Badge[];
    stats?: any;
    language?: 'ja' | 'en';
}

export const BadgeSystem: React.FC<BadgeSystemProps> = ({ badges = [], language = 'ja' }) => {
    // Color mapping for badges
    const colorMap: Record<string, { bg: string; border: string; icon: string; progress: string }> = {
        bronze: {
            bg: '#f5f5f4',
            border: '#d6d3d1',
            icon: '#78716c',
            progress: '#78716c'
        },
        gold: {
            bg: '#fef3c7',
            border: '#fde68a',
            icon: '#d97706',
            progress: '#f59e0b'
        },
        blue: {
            bg: '#dbeafe',
            border: '#bfdbfe',
            icon: '#2563eb',
            progress: '#3b82f6'
        },
        purple: {
            bg: '#f3e8ff',
            border: '#e9d5ff',
            icon: '#9333ea',
            progress: '#a855f7'
        }
    };

    // Icon mapping for string identifiers
    const getIcon = (icon: React.ReactNode | string) => {
        if (typeof icon !== 'string') return icon;

        const className = "w-6 h-6";
        switch (icon) {
            case 'star': return <Star className={className} />;
            case 'trophy': return <Trophy className={className} />;
            case 'zap': return <Zap className={className} />;
            case 'target': return <Target className={className} />;
            case 'book': return <BookOpen className={className} />;
            case 'crown': return <Crown className={className} />;
            case 'medal': return <Medal className={className} />;
            default: return <Award className={className} />;
        }
    };

    // If no badges provided but stats are, we could generate them here (legacy support)
    // For now, we assume badges are passed in

    if (badges.length === 0) {
        return null;
    }

    // Debug: Log badges received in BadgeSystem
    console.log('🎖️ BadgeSystem rendering with badges:');
    badges.forEach(b => {
        console.log(`  - ${b.name}:`, {
            isUnlocked: b.isUnlocked,
            typeOfIsUnlocked: typeof b.isUnlocked,
            progress: b.progress,
            color: b.color,
            willApplyUnlockedStyles: b.isUnlocked === true
        });
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {badges.map(badge => {
                const colors = colorMap[badge.color] || colorMap.bronze;
                return (
                    <div
                        key={badge.id}
                        className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-300 ${
                            badge.isUnlocked
                                ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 shadow-lg'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                        style={badge.isUnlocked ? {
                            borderColor: '#f59e0b',
                            boxShadow: `0 0 30px rgba(245, 158, 11, 0.3), 0 10px 15px -3px ${colors.progress}20, 0 4px 6px -2px ${colors.progress}10`
                        } : undefined}
                    >
                        {/* Unlocked Badge */}
                        {badge.isUnlocked && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs font-bold shadow-lg">
                                <CheckCircle className="w-3 h-3" />
                                {language === 'ja' ? '獲得済み' : 'UNLOCKED'}
                            </div>
                        )}
                        <div className="flex items-start gap-4">
                            <div
                                className="p-3 rounded-full"
                                style={badge.isUnlocked ? {
                                    backgroundColor: '#fef3c7',
                                    color: '#f59e0b'
                                } : {
                                    backgroundColor: '#e5e7eb',
                                    color: '#9ca3af'
                                }}
                            >
                                {getIcon(badge.icon)}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{badge.name}</h3>
                                <p className="text-xs text-gray-700 dark:text-white mb-3">{badge.description}</p>

                                {badge.progress !== undefined && (
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${badge.progress}%`,
                                                backgroundColor: badge.isUnlocked ? colors.progress : '#9ca3af'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
