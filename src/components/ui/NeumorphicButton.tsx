import React from 'react';

interface NeumorphicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'icon' | 'success' | 'error';
    fullWidth?: boolean;
    isLoading?: boolean;
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
    children,
    className = '',
    variant = 'primary',
    fullWidth = false,
    isLoading = false,
    disabled,
    ...props
}) => {
    const baseStyles = "relative overflow-hidden rounded-xl font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

    const variants = {
        primary: "bg-primary hover:bg-primary-hover text-white shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5",
        secondary: "bg-surface hover:bg-surfaceHighlight text-text-primary border border-glass-border shadow-glass hover:shadow-glass-hover",
        icon: "p-3 rounded-full bg-surface hover:bg-surfaceHighlight text-text-primary border border-glass-border shadow-glass hover:shadow-glass-hover flex items-center justify-center",
        success: "bg-accent hover:bg-accent-hover text-white shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5",
        error: "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5",
    };

    const widthStyles = fullWidth ? "w-full py-4" : variant === 'icon' ? "" : "px-8 py-3";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${widthStyles} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            ) : (
                <div className="relative z-10 flex items-center justify-center gap-2">
                    {children}
                </div>
            )}

            {/* Glow effect for primary buttons */}
            {(variant === 'primary' || variant === 'success' || variant === 'error') && !disabled && !isLoading && (
                <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
            )}
        </button>
    );
};
