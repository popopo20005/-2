import { motion } from 'framer-motion';

interface StreakFlameProps {
    streak: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function StreakFlame({ streak, size = 'md', className = '' }: StreakFlameProps) {
    const isActive = streak > 0;

    const sizeClasses = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-4xl',
    };

    const flameVariants = {
        idle: {
            scale: 1,
            opacity: 0.5,
            filter: 'grayscale(100%)',
        },
        burning: {
            scale: [1, 1.1, 1],
            opacity: 1,
            filter: 'grayscale(0%)',
            textShadow: [
                '0 0 10px rgba(255, 165, 0, 0.5)',
                '0 0 20px rgba(255, 69, 0, 0.8)',
                '0 0 10px rgba(255, 165, 0, 0.5)',
            ],
            transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut" as const,
            },
        },
        blazing: {
            scale: [1, 1.2, 0.9, 1.1, 1],
            opacity: 1,
            filter: 'grayscale(0%)',
            textShadow: [
                '0 0 15px rgba(255, 165, 0, 0.6)',
                '0 0 30px rgba(255, 0, 0, 0.9)',
                '0 0 15px rgba(255, 165, 0, 0.6)',
            ],
            transition: {
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut" as const,
            },
        }
    };

    const getVariant = () => {
        if (!isActive) return 'idle';
        if (streak >= 7) return 'blazing';
        return 'burning';
    };

    return (
        <motion.div
            className={`${sizeClasses[size]} ${className} cursor-default`}
            variants={flameVariants}
            animate={getVariant()}
            title={`${streak} Day Streak!`}
        >
            🔥
        </motion.div>
    );
}
