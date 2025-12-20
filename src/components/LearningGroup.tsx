import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, SharedStatistics, Rival } from '../types/share';
import { ProfileCard } from './share/ProfileCard';
import { RivalList } from './share/RivalList';
import { StudyDiary } from './share/StudyDiary';
import { NeumorphicButton } from './ui/NeumorphicButton';
import { Users, BookOpen, User, Upload, ArrowLeft, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { statisticsService } from '../lib/database';
import { generateShareData, exportDataToJson, importDataFromJson } from '../utils/ShareUtils';
import { rivalService } from '../services/RivalService';
import { toast } from 'react-hot-toast';

interface ShareViewProps {
    onBack: () => void;
    onNavigate?: (view: any) => void;
}

type Tab = 'profile' | 'rivals' | 'diary';

export const LearningGroup: React.FC<ShareViewProps> = ({ onBack, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<SharedStatistics | null>(null);
    const [rivals, setRivals] = useState<Rival[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
        loadRivals();
    }, []);

    const loadData = async () => {
        try {
            // Mock profile data (replace with real user data management later)
            const userProfile: UserProfile = {
                id: 'user_current', // Should be persistent
                name: 'Me',
                title: 'Quiz Learner',
                level: 5,
                joinedAt: new Date()
            };

            const overall = await statisticsService.getOverallStats();

            // Mock streak and badges for now (or fetch if available)
            const sharedStats: SharedStatistics = {
                totalAnswered: overall.totalAnswered,
                totalCorrect: overall.totalCorrect,
                overallAccuracy: overall.overallAccuracy,
                streakDays: 3, // Mock
                badges: [] // Mock
            };

            setProfile(userProfile);
            setStats(sharedStats);
        } catch (error) {
            console.error('Failed to load profile data', error);
        }
    };

    const loadRivals = () => {
        setRivals(rivalService.getRivals());
    };

    const handleExport = () => {
        if (!profile || !stats) return;
        const data = generateShareData(profile, stats);
        const json = exportDataToJson(data);

        // Create download link
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-profile-${profile.name}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Profile exported successfully!');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const data = importDataFromJson(content);

            if (data) {
                rivalService.addRival(data);
                loadRivals();
                toast.success(`Imported ${data.profile.name}'s profile!`);
                setActiveTab('rivals');
            } else {
                toast.error('Invalid profile data');
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const handleRemoveRival = (id: string) => {
        if (window.confirm('Are you sure you want to remove this rival?')) {
            rivalService.removeRival(id);
            loadRivals();
            toast.success('Rival removed');
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <NeumorphicButton onClick={onBack} variant="secondary" className="p-2">
                            <ArrowLeft className="w-5 h-5" />
                        </NeumorphicButton>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Group</h1>
                    </div>

                    <div className="flex gap-2">
                        {onNavigate && (
                            <NeumorphicButton onClick={() => onNavigate('qrShare')} variant="secondary" className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <QrCode className="w-4 h-4" />
                                    <span className="hidden sm:inline">QR Share</span>
                                </div>
                            </NeumorphicButton>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                        <NeumorphicButton onClick={handleImportClick} variant="primary" className="px-4 py-2">
                            <div className="flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                Import Friend
                            </div>
                        </NeumorphicButton>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    {[
                        { id: 'profile', label: 'My Profile', icon: User },
                        { id: 'rivals', label: 'Rivals', icon: Users },
                        { id: 'diary', label: 'Study Diary', icon: BookOpen },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-lg scale-105'
                                    : 'bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-white/20'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'profile' && profile && stats && (
                            <ProfileCard
                                profile={profile}
                                statistics={stats}
                                onExport={handleExport}
                            />
                        )}
                        {activeTab === 'rivals' && (
                            <RivalList rivals={rivals} onRemove={handleRemoveRival} />
                        )}
                        {activeTab === 'diary' && (
                            <StudyDiary />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
