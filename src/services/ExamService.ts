import type { Problem } from '../types';
import { problemService, statisticsService } from '../lib/database';

export interface ExamSettings {
    questionCount: number;
    timeLimit: number; // minutes
    difficulty: 'weakness' | 'random' | 'hard';
    categories?: string[];
}

export interface ExamResultData {
    score: number;
    totalQuestions: number;
    correctCount: number;
    timeSpent: number; // seconds
    grade: 'S' | 'A' | 'B' | 'C' | 'F';
    weaknessIdentified: string[];
    date: Date;
}

export const examService = {
    generateExam: async (settings: ExamSettings): Promise<Problem[]> => {
        const allProblems = await problemService.getAll();
        let candidates: Problem[] = [];

        if (settings.categories && settings.categories.length > 0) {
            candidates = allProblems.filter(p => settings.categories!.includes(p.category));
        } else {
            candidates = [...allProblems];
        }

        if (settings.difficulty === 'random') {
            return shuffleArray(candidates).slice(0, settings.questionCount);
        }

        if (settings.difficulty === 'weakness') {
            // Get worst problems
            const worst = await statisticsService.getWorstProblems();
            const worstIds = new Set(worst.map(w => w.problem.id));

            const weaknessProblems = candidates.filter(p => worstIds.has(p.id));
            const otherProblems = candidates.filter(p => !worstIds.has(p.id));

            // Prioritize weakness, fill rest with random
            const selected = [
                ...shuffleArray(weaknessProblems),
                ...shuffleArray(otherProblems)
            ].slice(0, settings.questionCount);

            return selected;
        }

        if (settings.difficulty === 'hard') {
            // For now, 'hard' can be same as weakness or based on low global accuracy if available
            // Fallback to weakness logic
            return examService.generateExam({ ...settings, difficulty: 'weakness' });
        }

        return candidates.slice(0, settings.questionCount);
    },

    calculateGrade: (percentage: number): 'S' | 'A' | 'B' | 'C' | 'F' => {
        if (percentage >= 90) return 'S';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B';
        if (percentage >= 60) return 'C';
        return 'F';
    }
};

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
