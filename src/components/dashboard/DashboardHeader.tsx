import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { StreakFlame } from '../ui/StreakFlame';
import { Sun, Moon } from 'lucide-react';

interface DashboardHeaderProps {
    userName: string;
    streakDays: number;
    isDarkMode: boolean;
    onToggleDarkMode?: () => void;
    greeting?: string;
    subtitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    userName,
    streakDays,
    isDarkMode,
    onToggleDarkMode,
    greeting,
    subtitle,
}) => {
    return (
        <GlassCard className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-white/20 dark:border-white/10 rounded-none md:rounded-2xl md:static mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-start to-primary-end p-0.5 shadow-lg">
                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary-start to-primary-end">
                                    {userName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
                    </div>
                    {(greeting || subtitle) && (
                        <div>
                            {greeting && (
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {greeting}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Streak Badge */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
                        <StreakFlame streak={streakDays} size="sm" />
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            {streakDays}
                        </span>
                    </div>

                    {/* Dark Mode Toggle */}
                    {onToggleDarkMode && (
                        <button
                            onClick={onToggleDarkMode}
                            className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>
        </GlassCard>
    );
};
