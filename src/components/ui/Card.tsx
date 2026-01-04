import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'premium';
}

const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
};

const shadowStyles = {
    none: '',
    sm: 'shadow-[var(--shadow-sm)]',
    md: 'shadow-[var(--shadow-md)]',
    lg: 'shadow-[var(--shadow-lg)]',
    premium: 'shadow-premium',
};

export function Card({
    children,
    padding = 'md',
    shadow = 'md',
    className = '',
    ...props
}: CardProps) {
    return (
        <div
            className={cn(
                'bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] transition-all duration-300',
                paddingStyles[padding],
                shadowStyles[shadow],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
    return (
        <div className={cn("flex items-center justify-between mb-4", className)}>
            <div>
                <h3 className="text-base font-bold text-[var(--color-text)] tracking-tight">{title}</h3>
                {subtitle && (
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] opacity-80">{subtitle}</p>
                )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
}

