import { motion } from 'framer-motion';

interface QuizProgressProps {
    current: number;
    total: number;
    showFeedback: boolean;
}

export function QuizProgress({ current, total, showFeedback }: QuizProgressProps) {
    const progress = ((current + (showFeedback ? 1 : 0)) / total) * 100;

    return (
        <div className="mb-8 w-full max-w-3xl mx-auto">
            <div className="flex justify-between items-end mb-2 px-1">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Progress</span>
                <span className="text-sm font-black text-primary">
                    {Math.round(progress)}%
                </span>
            </div>

            {/* 3D Progress Bar Container */}
            <div className="relative w-full h-4 bg-slate-800/50 rounded-full shadow-inner overflow-hidden backdrop-blur-sm border border-white/5">
                {/* Background Depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-white/5" />

                {/* Progress Fill */}
                <motion.div
                    key={`progress-${current}-${showFeedback}`}
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative h-full rounded-full"
                >
                    {/* Main Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary to-primary-light" />

                    {/* 3D Highlight (Top) */}
                    <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/40 to-transparent rounded-t-full" />

                    {/* 3D Shadow (Bottom) */}
                    <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/20 to-transparent rounded-b-full" />

                    {/* Glow Effect at the tip */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-full bg-white/30 blur-[2px]" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-primary/50 blur-md rounded-full translate-x-2" />
                </motion.div>
            </div>
        </div>
    );
}
