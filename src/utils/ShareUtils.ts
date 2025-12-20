import type { SharedData, UserProfile, SharedStatistics } from '../types/share';
import type { QuizSet, StudyDiaryEntry } from '../types';

export const SHARE_DATA_VERSION = '1.0.0';

export const generateShareData = (
    profile: UserProfile,
    statistics: SharedStatistics,
    quizSets?: QuizSet[],
    diaryEntries?: StudyDiaryEntry[]
): SharedData => {
    return {
        version: SHARE_DATA_VERSION,
        profile,
        statistics,
        quizSets,
        diaryEntries,
        exportedAt: new Date(),
    };
};

export const validateShareData = (data: any): data is SharedData => {
    if (!data || typeof data !== 'object') return false;
    if (data.version !== SHARE_DATA_VERSION) {
        console.warn('Version mismatch', data.version);
        // We might want to support older versions in the future
    }

    // Basic validation
    if (!data.profile || !data.profile.id || !data.profile.name) return false;
    if (!data.statistics) return false;

    return true;
};

export const exportDataToJson = (data: SharedData): string => {
    return JSON.stringify(data, null, 2);
};

export const importDataFromJson = (json: string): SharedData | null => {
    try {
        const data = JSON.parse(json);
        // Restore Date objects
        if (data.exportedAt) data.exportedAt = new Date(data.exportedAt);
        if (data.profile?.joinedAt) data.profile.joinedAt = new Date(data.profile.joinedAt);

        if (validateShareData(data)) {
            return data;
        }
        return null;
    } catch (e) {
        console.error('Failed to parse share data', e);
        return null;
    }
};
