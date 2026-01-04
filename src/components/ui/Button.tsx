import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.5)]',
    secondary: 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:bg-[var(--color-border)]',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]',
    danger: 'bg-gradient-to-br from-[var(--color-expense)] to-[#e11d48] text-white shadow-[0_4px_12px_-4px_rgba(244,63,94,0.4)]',
    glass: 'glass text-[var(--color-text)] shadow-sm hover:bg-white/80 dark:hover:bg-white/10',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs font-bold leading-none',
    md: 'px-5 py-2.5 text-sm font-bold',
    lg: 'px-8 py-3.5 text-base font-bold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'primary',
        size = 'md',
        fullWidth = false,
        loading = false,
        disabled,
        className = '',
        children,
        ...props
    }, ref) => {
        return (
            <motion.button
                ref={ref}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                disabled={disabled || loading}
                className={cn(
                    'inline-flex items-center justify-center gap-2',
                    'rounded-xl transition-all duration-300',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100',
                    'tracking-tight antialiased',
                    variantStyles[variant],
                    sizeStyles[size],
                    fullWidth ? 'w-full' : '',
                    className
                )}
                {...props}
            >
                {loading ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : null}
                {children}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';

