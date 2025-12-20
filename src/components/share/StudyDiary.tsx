import React, { useState, useEffect } from 'react';
import type { StudyDiaryEntry } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { NeumorphicButton } from '../ui/NeumorphicButton';
import { Plus, Save, Trash2, Calendar, Smile, Meh, Frown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DIARY_STORAGE_KEY = 'quiz_app_diary';

export const StudyDiary: React.FC = () => {
    const [entries, setEntries] = useState<StudyDiaryEntry[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [newEntry, setNewEntry] = useState<Partial<StudyDiaryEntry>>({
        title: '',
        content: '',
        mood: 'good'
    });

    useEffect(() => {
        const saved = localStorage.getItem(DIARY_STORAGE_KEY);
        if (saved) {
            setEntries(JSON.parse(saved));
        }
    }, []);

    const saveEntry = () => {
        if (!newEntry.title || !newEntry.content) return;

        const entry: StudyDiaryEntry = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            title: newEntry.title,
            content: newEntry.content,
            mood: newEntry.mood as any,
            topics: [],
            achievements: [],
            challenges: [],
            goals: [],
            createdAt: new Date()
        };

        const updated = [entry, ...entries];
        setEntries(updated);
        localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(updated));
        setIsEditing(false);
        setNewEntry({ title: '', content: '', mood: 'good' });
    };

    const deleteEntry = (id: number) => {
        const updated = entries.filter(e => e.id !== id);
        setEntries(updated);
        localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(updated));
    };

    const getMoodIcon = (mood?: string) => {
        switch (mood) {
            case 'excellent': return <Smile className="w-5 h-5 text-green-500" />;
            case 'good': return <Smile className="w-5 h-5 text-blue-500" />;
            case 'okay': return <Meh className="w-5 h-5 text-yellow-500" />;
            case 'challenging': return <Frown className="w-5 h-5 text-orange-500" />;
            case 'difficult': return <Frown className="w-5 h-5 text-red-500" />;
            default: return <Smile className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Study Diary</h3>
                <NeumorphicButton
                    onClick={() => setIsEditing(!isEditing)}
                    variant="primary"
                    className="px-4 py-2"
                >
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Entry
                    </div>
                </NeumorphicButton>
            </div>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <GlassCard className="p-4 space-y-4">
                            <input
                                type="text"
                                placeholder="Title"
                                className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary"
                                value={newEntry.title}
                                onChange={e => setNewEntry({ ...newEntry, title: e.target.value })}
                            />
                            <textarea
                                placeholder="What did you learn today?"
                                className="w-full h-32 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary resize-none"
                                value={newEntry.content}
                                onChange={e => setNewEntry({ ...newEntry, content: e.target.value })}
                            />
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    {['excellent', 'good', 'okay', 'challenging'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setNewEntry({ ...newEntry, mood: m as any })}
                                            className={`p-2 rounded-full transition-colors ${newEntry.mood === m ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-gray-100 dark:hover:bg-white/10'}`}
                                        >
                                            {getMoodIcon(m)}
                                        </button>
                                    ))}
                                </div>
                                <NeumorphicButton onClick={saveEntry} variant="primary" className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Save
                                    </div>
                                </NeumorphicButton>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {entries.map((entry) => (
                    <GlassCard key={entry.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white">{entry.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {entry.date}
                                    <span className="mx-1">•</span>
                                    {getMoodIcon(entry.mood)}
                                    <span className="capitalize">{entry.mood}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteEntry(entry.id!)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.content}</p>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
};
