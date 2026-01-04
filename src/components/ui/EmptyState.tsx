import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in-95 duration-300", className)}>
            {Icon && (
                <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center mb-4">
                    <Icon size={32} className="text-[var(--color-text-muted)] opacity-50" />
                </div>
            )}
            <h3 className="text-lg font-bold text-[var(--color-text-secondary)] mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-[var(--color-text-muted)] max-w-xs mb-6">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="primary" className="min-w-[120px]">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
