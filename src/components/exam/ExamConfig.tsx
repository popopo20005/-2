import React, { useState } from 'react';
import type { ExamSettings } from '../../services/ExamService';
import { GlassCard } from '../ui/GlassCard';
import { NeumorphicButton } from '../ui/NeumorphicButton';
import { Clock, Target, Layers, Play, ArrowLeft } from 'lucide-react';

interface ExamConfigProps {
    onStart: (settings: ExamSettings) => void;
    onBack: () => void;
}

export const ExamConfig: React.FC<ExamConfigProps> = ({ onStart, onBack }) => {
    const [settings, setSettings] = useState<ExamSettings>({
        questionCount: 10,
        timeLimit: 0,
        difficulty: 'random',
        categories: []
    });

    const handleStart = () => {
        onStart(settings);
    };

    return (
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
            <div className="max-w-2xl w-full space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <NeumorphicButton onClick={onBack} variant="secondary" className="p-2">
                        <ArrowLeft className="w-5 h-5" />
                    </NeumorphicButton>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exam Configuration</h1>
                </div>

                <GlassCard className="p-8 space-y-8">
                    {/* Question Count */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            Number of Questions
                        </h3>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            {[10, 20, 30, 50, 100].map((count) => (
                                <button
                                    key={count}
                                    onClick={() => setSettings({ ...settings, questionCount: count })}
                                    className={`py-3 rounded-xl font-bold transition-all ${settings.questionCount === count
                                        ? 'bg-primary text-white shadow-lg scale-105'
                                        : 'bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-white/20'
                                        }`}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Limit */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Time Limit
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { value: 0, label: 'None' },
                                { value: 10, label: '10 min' },
                                { value: 30, label: '30 min' },
                                { value: 60, label: '60 min' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setSettings({ ...settings, timeLimit: option.value })}
                                    className={`py-3 rounded-xl font-bold transition-all ${settings.timeLimit === option.value
                                        ? 'bg-blue-500 text-white shadow-lg scale-105'
                                        : 'bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-white/20'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-red-500" />
                            Difficulty / Mode
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { value: 'random', label: 'Random', desc: 'Mix of all problems' },
                                { value: 'weakness', label: 'Weakness Focus', desc: 'Prioritize incorrect answers' },
                                { value: 'hard', label: 'Hard Mode', desc: 'Challenging problems only' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setSettings({ ...settings, difficulty: option.value as any })}
                                    className={`p-4 rounded-xl text-left transition-all ${settings.difficulty === option.value
                                        ? 'bg-red-500 text-white shadow-lg scale-105'
                                        : 'bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-white/20'
                                        }`}
                                >
                                    <div className="font-bold">{option.label}</div>
                                    <div className={`text-xs mt-1 ${settings.difficulty === option.value ? 'text-white/80' : 'text-gray-500 dark:text-gray-500'}`}>
                                        {option.desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <NeumorphicButton
                            onClick={handleStart}
                            variant="primary"
                            className="w-full py-4 text-lg font-bold"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Play className="w-6 h-6 fill-current" />
                                Start Exam
                            </div>
                        </NeumorphicButton>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
