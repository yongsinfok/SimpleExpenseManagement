import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] active:bg-[var(--color-primary-dark)]',
    secondary: 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:bg-[var(--color-border)] active:bg-[var(--color-border)]',
    ghost: 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]',
    danger: 'bg-[var(--color-expense)] text-white hover:opacity-90 active:opacity-80',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
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
            <button
                ref={ref}
                disabled={disabled || loading}
                className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-[var(--radius-md)]
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
                {...props}
            >
                {loading && (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
