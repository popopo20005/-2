import React from 'react';
import type { ExamResultData } from '../../services/ExamService';
import { GlassCard } from '../ui/GlassCard';
import { NeumorphicButton } from '../ui/NeumorphicButton';
import { CheckCircle, XCircle, RefreshCw, Home, Award, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExamResultProps {
    result: ExamResultData;
    onRetry: () => void;
    onHome: () => void;
}

export const ExamResult: React.FC<ExamResultProps> = ({ result, onRetry, onHome }) => {
    const percentage = Math.round((result.correctCount / result.totalQuestions) * 100);

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'S': return 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]';
            case 'A': return 'text-green-400';
            case 'B': return 'text-blue-400';
            case 'C': return 'text-orange-400';
            default: return 'text-red-400';
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
            <div className="max-w-2xl w-full space-y-8">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <GlassCard className="p-8 text-center relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary to-purple-600 rounded-full blur-3xl" />
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Exam Completed</h2>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                                {new Date().toLocaleDateString()} • {Math.floor(result.timeSpent / 60)}m {result.timeSpent % 60}s
                            </div>

                            <div className="mb-8">
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Grade</div>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, type: "spring" }}
                                    className={`text-9xl font-black ${getGradeColor(result.grade)}`}
                                >
                                    {result.grade}
                                </motion.div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-white/10 rounded-xl p-4">
                                    <div className="flex justify-center mb-2 text-blue-500"><CheckCircle className="w-6 h-6" /></div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{result.correctCount}</div>
                                    <div className="text-xs text-gray-500">Correct</div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4">
                                    <div className="flex justify-center mb-2 text-red-500"><XCircle className="w-6 h-6" /></div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{result.totalQuestions - result.correctCount}</div>
                                    <div className="text-xs text-gray-500">Incorrect</div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4">
                                    <div className="flex justify-center mb-2 text-green-500"><Target className="w-6 h-6" /></div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{percentage}%</div>
                                    <div className="text-xs text-gray-500">Accuracy</div>
                                </div>
                            </div>

                            {result.grade === 'S' && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="mb-8 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl flex items-center justify-center gap-3"
                                >
                                    <Award className="w-8 h-8 text-yellow-500" />
                                    <div className="text-left">
                                        <div className="font-bold text-yellow-500">Perfect Score Bonus!</div>
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400">You've mastered this exam!</div>
                                    </div>
                                </motion.div>
                            )}

                            <div className="flex gap-4">
                                <NeumorphicButton onClick={onHome} variant="secondary" className="flex-1 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <Home className="w-5 h-5" />
                                        Home
                                    </div>
                                </NeumorphicButton>
                                <NeumorphicButton onClick={onRetry} variant="primary" className="flex-1 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <RefreshCw className="w-5 h-5" />
                                        Retry
                                    </div>
                                </NeumorphicButton>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
};
