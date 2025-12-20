import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, RotateCcw, BookOpen } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { NeumorphicButton } from '../ui/NeumorphicButton';

interface FeedbackModalProps {
    isOpen: boolean;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
    onNext: () => void;
    isLastQuestion: boolean;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    isCorrect,
    correctAnswer,
    explanation,
    onNext,
    isLastQuestion
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
                        onClick={onNext}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20, rotateX: -10 }}
                        animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20, rotateX: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-full max-w-lg pointer-events-auto perspective-1000"
                    >
                        <GlassCard
                            className={`relative overflow-hidden border-t border-l border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isCorrect ? 'shadow-emerald-500/20' : 'shadow-rose-500/20'
                                }`}
                        >
                            {/* Background Glow */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b ${isCorrect ? 'from-emerald-500/20' : 'from-rose-500/20'
                                } to-transparent blur-2xl`} />

                            <div className="relative z-10 p-6 flex flex-col items-center text-center">
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${isCorrect
                                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
                                            : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30'
                                        }`}
                                >
                                    {isCorrect ? (
                                        <CheckCircle className="w-10 h-10 text-white" />
                                    ) : (
                                        <XCircle className="w-10 h-10 text-white" />
                                    )}
                                </motion.div>

                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className={`text-3xl font-bold mb-2 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                >
                                    {isCorrect ? 'Correct!' : 'Incorrect'}
                                </motion.h2>

                                {!isCorrect && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ delay: 0.3 }}
                                        className="mb-6"
                                    >
                                        <p className="text-slate-400 text-sm mb-1">Correct Answer:</p>
                                        <p className="text-xl font-semibold text-white">{correctAnswer}</p>
                                    </motion.div>
                                )}

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-white/5 rounded-xl p-4 mb-8 w-full border border-white/10"
                                >
                                    <div className="flex items-center justify-center gap-2 mb-2 text-slate-300">
                                        <BookOpen className="w-4 h-4" />
                                        <span className="text-sm font-medium">Explanation</span>
                                    </div>
                                    <p className="text-slate-200 leading-relaxed">
                                        {explanation}
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="w-full"
                                >
                                    <NeumorphicButton
                                        onClick={onNext}
                                        variant="primary"
                                        className="w-full py-4 text-lg font-bold flex items-center justify-center gap-2 group"
                                    >
                                        {isLastQuestion ? (
                                            <>
                                                <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                                See Results
                                            </>
                                        ) : (
                                            <>
                                                Next Question
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </NeumorphicButton>
                                </motion.div>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
