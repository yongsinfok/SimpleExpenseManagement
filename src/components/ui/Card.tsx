import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: boolean;
}

const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

export function Card({
    children,
    padding = 'md',
    shadow = true,
    className = '',
    ...props
}: CardProps) {
    return (
        <div
            className={`
        bg-[var(--color-bg-card)]
        rounded-[var(--radius-lg)]
        ${shadow ? 'shadow-[var(--shadow-md)]' : ''}
        ${paddingStyles[padding]}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-3">
            <div>
                <h3 className="font-semibold text-[var(--color-text)]">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
