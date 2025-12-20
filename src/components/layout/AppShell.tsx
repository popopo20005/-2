import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BarChart2, Settings, Layers, Brain } from 'lucide-react';

interface AppShellProps {
    children: React.ReactNode;
    currentView: string;
    onNavigate: (view: any) => void;
    isDarkMode: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, currentView, onNavigate, isDarkMode }) => {
    const navItems = [
        { id: 'menu', icon: Home, label: 'Home' },
        { id: 'quizSets', icon: Layers, label: 'Sets' },
        { id: 'spacedRepetitionManager', icon: Brain, label: 'SM-2' },
        { id: 'stats', icon: BarChart2, label: 'Stats' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className={`min-h-screen bg-background text-text-primary relative overflow-hidden selection:bg-primary selection:text-white ${isDarkMode ? 'dark' : ''}`}>
            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-mesh opacity-40 animate-pulse-slow" />
                {/* Noise texture overlay could be added here if available */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
            </div>

            {/* Main Content */}
            <main className="relative z-10 min-h-screen pb-24 md:pb-0 md:pl-24">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentView}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // Quintic ease
                        className="w-full max-w-7xl mx-auto px-6 sm:px-8 py-6"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-auto md:w-24 md:h-screen md:flex-col md:justify-center glass-card rounded-none md:rounded-r-2xl border-t md:border-t-0 md:border-r border-glass-border">
                <div className="flex md:flex-col justify-around items-center h-16 md:h-auto md:gap-8 p-2 md:py-8">
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`relative p-3 rounded-xl transition-all duration-300 group ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="navHighlight"
                                        className="absolute inset-0 bg-primary/10 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <item.icon
                                    size={24}
                                    className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className="sr-only">{item.label}</span>

                                {/* Active Glow */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-50" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};
