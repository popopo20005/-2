import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
    hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    variant = 'default',
    hoverEffect = true,
    ...props
}) => {
    const baseStyles = "glass-card relative overflow-hidden";

    const variants = {
        default: "",
        primary: "bg-primary/10 border-primary/20",
        success: "bg-accent/10 border-accent/20",
        warning: "bg-orange-500/10 border-orange-500/20",
        error: "bg-red-500/10 border-red-500/20",
    };

    const hoverStyles = hoverEffect ? "glass-card-hover" : "";

    return (
        <div
            className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};
