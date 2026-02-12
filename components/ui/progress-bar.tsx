'use client';

export interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'destructive' | 'success' | 'warning';
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
};

const colorStyles = {
  primary: 'bg-primary',
  destructive: 'bg-destructive',
  success: 'bg-green-500',
  warning: 'bg-yellow-500'
};

export function ProgressBar({
  progress,
  size = 'md',
  color = 'primary',
  showPercentage = false,
  label,
  className = ''
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{clampedProgress}%</span>
          )}
        </div>
      )}
      <div
        className={`${sizeStyles[size]} bg-muted rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full transition-all duration-500 ease-out ${colorStyles[color]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
