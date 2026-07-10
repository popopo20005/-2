import { motion } from 'framer-motion';

interface QuizProgressProps {
    current: number;
    total: number;
    showFeedback: boolean;
}

export function QuizProgress({ current, total, showFeedback }: QuizProgressProps) {
    const progress = ((current + (showFeedback ? 1 : 0)) / total) * 100;

    return (
        <div className="mb-7 w-full max-w-3xl mx-auto flex items-center gap-3">
            {/* Progress Bar */}
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                    key={`progress-${current}-${showFeedback}`}
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{
                        background: '#6366F1',
                        boxShadow: '0 0 10px rgba(99,102,241,0.5)',
                    }}
                />
            </div>

            {/* Counter */}
            <span className="text-[13px] font-semibold text-[#94A3B8] tabular-nums whitespace-nowrap">
                {current + (showFeedback ? 1 : 0)}/{total}
            </span>
        </div>
    );
}
