import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';

interface QuizCardProps {
    category: string;
    question: string;
    children: ReactNode;
    showFeedback?: boolean;
    isCorrect?: boolean;
}

export function QuizCard({ category, question, children, showFeedback, isCorrect }: QuizCardProps) {
    return (
        <div className="perspective-1000 w-full max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
                <motion.div
                    key={question}
                    initial={{ opacity: 0, rotateX: -20, y: 40, scale: 0.9 }}
                    animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
                    exit={{ opacity: 0, rotateX: 20, y: -40, scale: 0.9 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        mass: 1
                    }}
                    className="w-full"
                >
                    <GlassCard
                        variant={showFeedback ? (isCorrect ? 'success' : 'error') : 'default'}
                        className={`
                            p-6 md:p-10 min-h-[450px] flex flex-col transition-all duration-500
                            ${showFeedback
                                ? (isCorrect
                                    ? 'shadow-[0_0_50px_rgba(16,185,129,0.3)] border-accent/30'
                                    : 'shadow-[0_0_50px_rgba(239,68,68,0.3)] border-red-500/30')
                                : 'shadow-2xl hover:shadow-[0_0_40px_rgba(99,102,241,0.2)]'
                            }
                        `}
                    >
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                            <div className="w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl" />
                        </div>

                        <div className="relative z-10 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <span className="inline-flex items-center px-4 py-1.5 bg-surfaceHighlight border border-white/10 text-primary-light rounded-full text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-md">
                                    <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
                                    {category}
                                </span>
                                {showFeedback && (
                                    <motion.span
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`text-2xl font-bold ${isCorrect ? 'text-accent' : 'text-red-500'}`}
                                    >
                                        {isCorrect ? 'Correct!' : 'Incorrect'}
                                    </motion.span>
                                )}
                            </div>

                            <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed tracking-tight drop-shadow-sm">
                                {question}
                            </h2>
                        </div>

                        <div className="flex-1 flex flex-col justify-center space-y-4 relative z-10">
                            {children}
                        </div>
                    </GlassCard>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
