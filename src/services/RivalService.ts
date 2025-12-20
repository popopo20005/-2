import type { Rival, SharedData } from '../types/share';

const RIVALS_STORAGE_KEY = 'quiz_app_rivals';

export const rivalService = {
    getRivals: (): Rival[] => {
        try {
            const data = localStorage.getItem(RIVALS_STORAGE_KEY);
            if (!data) return [];
            const rivals = JSON.parse(data);
            // Restore dates
            return rivals.map((r: any) => ({
                ...r,
                lastUpdated: new Date(r.lastUpdated),
                profile: {
                    ...r.profile,
                    joinedAt: new Date(r.profile.joinedAt)
                }
            }));
        } catch (e) {
            console.error('Failed to load rivals', e);
            return [];
        }
    },

    addRival: (sharedData: SharedData): Rival => {
        const rivals = rivalService.getRivals();

        const newRival: Rival = {
            id: sharedData.profile.id,
            profile: sharedData.profile,
            statistics: sharedData.statistics,
            lastUpdated: new Date()
        };

        // Check if rival already exists, update if so
        const index = rivals.findIndex(r => r.id === newRival.id);
        if (index >= 0) {
            rivals[index] = newRival;
        } else {
            rivals.push(newRival);
        }

        localStorage.setItem(RIVALS_STORAGE_KEY, JSON.stringify(rivals));
        return newRival;
    },

    removeRival: (rivalId: string) => {
        const rivals = rivalService.getRivals();
        const filtered = rivals.filter(r => r.id !== rivalId);
        localStorage.setItem(RIVALS_STORAGE_KEY, JSON.stringify(filtered));
    },

    // Mock function to get current user profile (replace with real data source later)
    getCurrentUserProfile: (): any => {
        // This should ideally come from a UserService or similar
        return {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            name: 'Guest User',
            title: 'Beginner',
            level: 1,
            joinedAt: new Date()
        };
    }
};
