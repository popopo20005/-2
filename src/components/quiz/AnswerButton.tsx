import { motion } from 'framer-motion';
import { NeumorphicButton } from '../ui/NeumorphicButton';
import type { ReactNode } from 'react';

interface AnswerButtonProps {
    index?: number;
    label?: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'success' | 'error';
    isSelected?: boolean;
    isCorrect?: boolean;
    showResult?: boolean;
    children?: ReactNode;
    className?: string;
}

export function AnswerButton({
    index,
    label,
    onClick,
    disabled = false,
    variant = 'secondary',
    isSelected = false,
    isCorrect = false,
    showResult = false,
    children,
    className = '',
}: AnswerButtonProps) {
    // Determine the visual state
    let buttonVariant: 'primary' | 'secondary' | 'success' | 'error' = variant;

    if (showResult) {
        if (isCorrect) {
            buttonVariant = 'success';
        } else if (isSelected && !isCorrect) {
            buttonVariant = 'error';
        }
    } else if (isSelected) {
        buttonVariant = 'primary';
    }

    // Animation variants
    const animations = {
        idle: { scale: 1 },
        hover: { scale: disabled ? 1 : 1.02 },
        tap: { scale: disabled ? 1 : 0.98 },
        shake: {
            x: [0, -10, 10, -10, 10, 0],
            transition: { duration: 0.4 }
        },
        pulse: {
            scale: [1, 1.05, 1],
            boxShadow: [
                "0 0 0px rgba(16, 185, 129, 0)",
                "0 0 20px rgba(16, 185, 129, 0.5)",
                "0 0 0px rgba(16, 185, 129, 0)"
            ],
            transition: { duration: 0.6, repeat: Infinity, repeatDelay: 1 }
        }
    };

    // Determine animation state
    let animateState = "idle";
    if (showResult) {
        if (isCorrect) animateState = "pulse";
        if (isSelected && !isCorrect) animateState = "shake";
    }

    return (
        <motion.div
            variants={animations}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            animate={animateState}
            className="w-full"
        >
            <NeumorphicButton
                variant={buttonVariant}
                onClick={onClick}
                disabled={disabled}
                fullWidth
                className={`justify-start text-left p-4 h-auto min-h-[60px] transition-all duration-300 ${showResult && !isCorrect && !isSelected ? 'opacity-50 grayscale' : ''
                    } ${className}`}
            >
                {children ? (
                    children
                ) : (
                    <div className="flex items-center w-full">
                        {index !== undefined && (
                            <span className={`
              flex items-center justify-center w-8 h-8 rounded-full mr-4 text-sm font-bold shrink-0 shadow-inner transition-colors duration-300
              ${buttonVariant === 'secondary'
                                    ? 'bg-surfaceHighlight text-text-secondary'
                                    : 'bg-white/20 text-white border border-white/20'}
            `}>
                                {String.fromCharCode(65 + index)}
                            </span>
                        )}
                        <span className={`text-base font-medium break-words w-full leading-snug ${buttonVariant === 'secondary' ? 'text-text-primary' : 'text-white'
                            }`}>
                            {label}
                        </span>

                        {/* Result Icons with Animation */}
                        {showResult && isCorrect && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="ml-auto text-xl bg-white/20 rounded-full p-1"
                            >
                                ✅
                            </motion.span>
                        )}
                        {showResult && isSelected && !isCorrect && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="ml-auto text-xl bg-white/20 rounded-full p-1"
                            >
                                ❌
                            </motion.span>
                        )}
                    </div>
                )}
            </NeumorphicButton>
        </motion.div>
    );
}
