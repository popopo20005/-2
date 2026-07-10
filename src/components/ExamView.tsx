import React, { useState, useEffect } from 'react';
import type { ExamSettings, ExamResultData } from '../services/ExamService';
import { examService } from '../services/ExamService';
import { ExamConfig } from './exam/ExamConfig';
import { ExamResult } from './exam/ExamResult';
import type { Problem } from '../types';
import { QuizCard } from './quiz/QuizCard';
import { AnswerButton } from './quiz/AnswerButton';
import { NeumorphicButton } from './ui/NeumorphicButton';
import { Clock, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { historyService } from '../lib/database';

interface ExamViewProps {
    onBack: () => void;
}

type ExamState = 'config' | 'playing' | 'result';

export const ExamView: React.FC<ExamViewProps> = ({ onBack }) => {
    const [state, setState] = useState<ExamState>('config');
    const [settings, setSettings] = useState<ExamSettings | null>(null);
    const [questions, setQuestions] = useState<Problem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<(boolean | number)[]>([]);
    const [strikethroughStates, setStrikethroughStates] = useState<boolean[][]>([]); // Track strikethrough for each question's options
    const [flagged, setFlagged] = useState<Set<number>>(new Set());
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [result, setResult] = useState<ExamResultData | null>(null);

    // Timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (state === 'playing' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        finishExam();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [state, timeLeft]);

    const startExam = async (newSettings: ExamSettings) => {
        setSettings(newSettings);
        const generatedQuestions = await examService.generateExam(newSettings);
        setQuestions(generatedQuestions);
        setAnswers(new Array(generatedQuestions.length).fill(undefined));
        setStrikethroughStates(generatedQuestions.map(q =>
            q.options ? new Array(q.options.length).fill(false) : []
        ));
        setCurrentIndex(0);
        setFlagged(new Set());

        if (newSettings.timeLimit > 0) {
            setTimeLeft(newSettings.timeLimit * 60);
        } else {
            setTimeLeft(0); // No limit
        }

        setStartTime(new Date());
        setState('playing');
    };

    const handleAnswer = (answer: boolean | number) => {
        const newAnswers = [...answers];
        newAnswers[currentIndex] = answer;
        setAnswers(newAnswers);

        // Auto advance after short delay
        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(currentIndex + 1);
            }
        }, 300);
    };

    const handleToggleStrikethrough = (optionIndex: number) => {
        const newStrikethroughStates = [...strikethroughStates];
        if (!newStrikethroughStates[currentIndex]) {
            newStrikethroughStates[currentIndex] = [];
        }
        const currentStrikethrough = [...(newStrikethroughStates[currentIndex] || [])];
        currentStrikethrough[optionIndex] = !currentStrikethrough[optionIndex];
        newStrikethroughStates[currentIndex] = currentStrikethrough;
        setStrikethroughStates(newStrikethroughStates);
    };

    const toggleFlag = () => {
        const newFlagged = new Set(flagged);
        if (newFlagged.has(currentIndex)) {
            newFlagged.delete(currentIndex);
        } else {
            newFlagged.add(currentIndex);
        }
        setFlagged(newFlagged);
    };

    const finishExam = async () => {
        if (!startTime) return;

        const endTime = new Date();
        const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        let correctCount = 0;
        const incorrectProblems: Problem[] = [];

        questions.forEach((q, idx) => {
            const userAnswer = answers[idx];
            let isCorrect = false;

            if (q.type === 'multiple-choice') {
                isCorrect = userAnswer === q.correctAnswer;
            } else {
                isCorrect = userAnswer === q.answer;
            }

            if (isCorrect) {
                correctCount++;
            } else {
                incorrectProblems.push(q);
            }

            // Save history
            if (userAnswer !== undefined) {
                historyService.add({
                    problemId: q.id!,
                    category: q.category,
                    isCorrect,
                    userAnswer
                });
            }
        });

        const percentage = (correctCount / questions.length) * 100;
        const grade = examService.calculateGrade(percentage);

        setResult({
            score: Math.round(percentage),
            totalQuestions: questions.length,
            correctCount,
            timeSpent,
            grade,
            weaknessIdentified: [...new Set(incorrectProblems.map(p => p.category))],
            date: new Date()
        });

        setState('result');
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (state === 'config') {
        return <ExamConfig onStart={startExam} onBack={onBack} />;
    }

    if (state === 'result' && result) {
        return (
            <ExamResult
                result={result}
                onRetry={() => setState('config')}
                onHome={onBack}
            />
        );
    }

    const currentProblem = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const answeredCount = answers.filter(a => a !== undefined).length;

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 flex flex-col">
            {/* Header */}
            <div className="max-w-4xl mx-auto w-full mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                        Question {currentIndex + 1} <span className="text-gray-500 text-sm">/ {questions.length}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {settings?.timeLimit! > 0 && (
                        <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'}`}>
                            <Clock className="w-5 h-5" />
                            {formatTime(timeLeft)}
                        </div>
                    )}
                    <NeumorphicButton
                        onClick={finishExam}
                        variant="secondary"
                        className="px-4 py-2 text-sm"
                        disabled={answeredCount === 0}
                    >
                        Finish Exam
                    </NeumorphicButton>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="max-w-4xl mx-auto w-full mb-8">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <div className="flex gap-1">
                        {questions.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-primary' :
                                    answers[idx] !== undefined ? 'bg-green-500' :
                                        flagged.has(idx) ? 'bg-yellow-500' :
                                            'bg-gray-300 dark:bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Question Area */}
            <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="mb-6 flex justify-end">
                            <button
                                onClick={toggleFlag}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${flagged.has(currentIndex)
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}
                            >
                                <Flag className="w-4 h-4" />
                                {flagged.has(currentIndex) ? 'Flagged' : 'Flag for Review'}
                            </button>
                        </div>

                        <QuizCard
                            category={currentProblem.category}
                            question={currentProblem.question}
                            showFeedback={false}
                        >
                            <div className="mt-8 grid grid-cols-1 gap-4">
                                {currentProblem.type === 'multiple-choice' ? (
                                    currentProblem.options?.map((option, idx) => (
                                        <AnswerButton
                                            key={idx}
                                            index={idx}
                                            label={option}
                                            isSelected={answers[currentIndex] === idx}
                                            onClick={() => handleAnswer(idx)}
                                            disabled={false}
                                            isStrikedThrough={strikethroughStates[currentIndex]?.[idx] || false}
                                            onStrikethrough={() => handleToggleStrikethrough(idx)}
                                        />
                                    ))
                                ) : (
                                    <div className="flex gap-4">
                                        <AnswerButton
                                            label="True"
                                            isSelected={answers[currentIndex] === true}
                                            onClick={() => handleAnswer(true)}
                                            disabled={false}
                                            variant="secondary"
                                            className={answers[currentIndex] === true ? 'ring-2 ring-primary' : ''}
                                        />
                                        <AnswerButton
                                            label="False"
                                            isSelected={answers[currentIndex] === false}
                                            onClick={() => handleAnswer(false)}
                                            disabled={false}
                                            variant="secondary"
                                            className={answers[currentIndex] === false ? 'ring-2 ring-primary' : ''}
                                        />
                                    </div>
                                )}
                            </div>
                        </QuizCard>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="max-w-4xl mx-auto w-full mt-8 flex justify-between">
                <NeumorphicButton
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    variant="secondary"
                    disabled={currentIndex === 0}
                    className="px-6"
                >
                    Previous
                </NeumorphicButton>

                {!isLastQuestion ? (
                    <NeumorphicButton
                        onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                        variant="secondary"
                        className="px-6"
                    >
                        Next
                    </NeumorphicButton>
                ) : (
                    <NeumorphicButton
                        onClick={finishExam}
                        variant="primary"
                        className="px-8"
                    >
                        Submit Exam
                    </NeumorphicButton>
                )}
            </div>
        </div>
    );
};
