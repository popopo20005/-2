import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Library, Plus, BarChart3, MoreHorizontal } from 'lucide-react';

interface AppShellProps {
    children: React.ReactNode;
    currentView: string;
    onNavigate: (view: any) => void;
    isDarkMode: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, currentView, onNavigate, isDarkMode }) => {
    const navItems = [
        { id: 'menu', icon: Home, label: 'ホーム', isFab: false },
        { id: 'quizSets', icon: Library, label: 'ライブラリ', isFab: false },
        { id: 'create', icon: Plus, label: 'つくる', isFab: true },
        { id: 'review', icon: BarChart3, label: 'ふりかえり', isFab: false },
        { id: 'more', icon: MoreHorizontal, label: 'その他', isFab: false },
    ];

    const isNavActive = (itemId: string) => {
        if (itemId === 'menu') return currentView === 'menu';
        if (itemId === 'quizSets') return currentView === 'quizSets';
        if (itemId === 'create') return currentView === 'create' || currentView === 'editor';
        if (itemId === 'review') return currentView === 'review' || currentView === 'stats';
        if (itemId === 'more') return currentView === 'more' || currentView === 'settings';
        return false;
    };

    return (
        <div className={`min-h-screen bg-background text-text-primary relative overflow-hidden selection:bg-primary selection:text-white ${isDarkMode ? 'dark' : ''}`}>
            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-mesh opacity-40 animate-pulse-slow" />
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
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-7xl mx-auto px-6 sm:px-8 py-6"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Navigation Bar - モック準拠: 5固定ナビ */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-auto md:w-24 md:h-screen md:flex-col md:justify-center"
                 style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex md:flex-col justify-around items-center h-20 md:h-auto md:gap-6 px-4 md:py-8">
                    {navItems.map((item) => {
                        const isActive = isNavActive(item.id);

                        // 中央FABボタン (つくる)
                        if (item.isFab) {
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    className="relative -mt-5 md:mt-0"
                                >
                                    <div className="w-[52px] h-[52px] rounded-full bg-primary flex items-center justify-center"
                                         style={{ boxShadow: '0 0 18px rgba(99,102,241,0.5)' }}>
                                        <Plus size={26} className="text-white" strokeWidth={2.5} />
                                    </div>
                                </button>
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className="flex flex-col items-center gap-[5px] py-1"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                        isActive ? 'bg-primary-light' : 'bg-white/15'
                                    }`}
                                />
                                <span
                                    className={`text-[11px] transition-colors duration-200 ${
                                        isActive
                                            ? 'font-semibold text-[#C7D2FE]'
                                            : 'text-[#64748B]'
                                    }`}
                                >
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};
