import type { QuizSet, StudyDiaryEntry } from './index';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
}

export interface UserProfile {
    id: string;
    name: string;
    title: string; // e.g. "Quiz Master"
    level: number;
    avatar?: string; // URL or icon name
    joinedAt: Date;
}

export interface SharedStatistics {
    totalAnswered: number;
    totalCorrect: number;
    overallAccuracy: number;
    streakDays: number;
    badges: Badge[];
}

export interface SharedData {
    version: string;
    profile: UserProfile;
    statistics: SharedStatistics;
    quizSets?: QuizSet[]; // Optional: Shared quiz sets
    diaryEntries?: StudyDiaryEntry[]; // Optional: Shared diary
    exportedAt: Date;
}

export interface Rival {
    id: string;
    profile: UserProfile;
    statistics: SharedStatistics;
    lastUpdated: Date;
}
