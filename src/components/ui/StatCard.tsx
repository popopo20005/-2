import { type LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { type StatCardTheme } from '../../styles/designTokens';

export interface StatCardProps {
  theme: StatCardTheme;
  icon: LucideIcon;
  value: string | number;
  goal?: string | number;
  label: string;
  showProgress?: boolean;
  progress?: number;
  additionalInfo?: string;
  onClick?: () => void;
}

export function StatCard({
  theme,
  icon: Icon,
  value,
  goal,
  label,
  showProgress = false,
  progress = 0,
  additionalInfo,
  onClick,
}: StatCardProps) {
  const hasGoal = goal !== undefined;

  // Map themes to GlassCard variants
  const getVariant = (): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (theme) {
      case 'learning':
      case 'analysis':
        return 'primary';
      case 'success':
      case 'progress':
        return 'success';
      case 'streak':
      case 'achievement':
        return 'warning';
      case 'focus':
        return 'default'; // Purple theme handled via custom class if needed, or map to default
      default:
        return 'default';
    }
  };

  const variant = getVariant();

  // Custom colors for specific themes that don't map perfectly to variants
  const getThemeColors = () => {
    switch (theme) {
      case 'focus':
        return {
          icon: 'text-purple-500 dark:text-purple-400',
          text: 'text-purple-600 dark:text-purple-300',
          bar: 'bg-purple-500',
        };
      case 'learning':
      case 'analysis':
        return {
          icon: 'text-blue-500 dark:text-blue-400',
          text: 'text-blue-600 dark:text-blue-300',
          bar: 'bg-blue-500',
        };
      case 'success':
      case 'progress':
        return {
          icon: 'text-green-500 dark:text-green-400',
          text: 'text-green-600 dark:text-green-300',
          bar: 'bg-green-500',
        };
      case 'streak':
      case 'achievement':
        return {
          icon: 'text-orange-500 dark:text-orange-400',
          text: 'text-orange-600 dark:text-orange-300',
          bar: 'bg-orange-500',
        };
      default:
        return {
          icon: 'text-gray-500 dark:text-gray-400',
          text: 'text-gray-600 dark:text-gray-300',
          bar: 'bg-gray-500',
        };
    }
  };

  const colors = getThemeColors();

  return (
    <GlassCard
      variant={variant}
      className="cursor-pointer relative overflow-hidden group"
      onClick={onClick}
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-sm ${colors.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className={`text-sm font-bold uppercase tracking-wider opacity-80 ${colors.text}`}>
            {label}
          </div>
        </div>

        {/* Value */}
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-3xl font-bold text-gray-800 dark:text-white drop-shadow-sm">
            {value}
          </div>
          {hasGoal && (
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              / {goal}
            </div>
          )}
        </div>

        {/* Additional Info */}
        {additionalInfo && (
          <div className={`text-xs font-semibold mb-3 ${colors.text}`}>
            {additionalInfo}
          </div>
        )}

        {/* Progress Bar */}
        {showProgress && (
          <div className="w-full rounded-full h-2 bg-gray-200/50 dark:bg-gray-700/50 overflow-hidden backdrop-blur-sm">
            <div
              className={`h-full transition-all duration-1000 ease-out ${colors.bar}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Background Decoration */}
      <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
        <Icon className="w-24 h-24" />
      </div>
    </GlassCard>
  );
}
