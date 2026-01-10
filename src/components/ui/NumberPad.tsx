import { useCallback } from 'react';
import { Delete, Check } from 'lucide-react';

interface NumberPadProps {
    value: string;
    onChange: (value: string) => void;
    onConfirm?: () => void;
    maxLength?: number;
    hideDecimal?: boolean;
}

const DEFAULT_MAX_LENGTH = 10;

const NUMBER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

const getKeyStyle = (key: string, hideDecimal: boolean): string => {
    const baseStyles = "h-14 rounded-[var(--radius-md)] text-xl font-medium flex items-center justify-center transition-all duration-150 active:scale-95";

    if (key === 'del') {
        return `${baseStyles} bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]`;
    }

    if (key === '.' && hideDecimal) {
        return `${baseStyles} invisible`;
    }

    return `${baseStyles} bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-border)]`;
};

const getConfirmButtonStyle = (value: string): string => {
    const isValid = value && value !== '0' && value !== '.';
    const baseStyles = "w-full mt-2 h-14 rounded-[var(--radius-md)] transition-all duration-200 flex items-center justify-center gap-2 text-lg font-bold active:scale-[0.98]";

    if (!isValid) {
        return `${baseStyles} bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] disabled:cursor-not-allowed`;
    }

    return `${baseStyles} bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30 ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-bg-card)]`;
};

export function NumberPad({
    value,
    onChange,
    onConfirm,
    maxLength = DEFAULT_MAX_LENGTH,
    hideDecimal = false
}: NumberPadProps) {
    const handleInput = useCallback((char: string) => {
        if (char === '.' && hideDecimal) return;

        if (char === '.') {
            if (value.includes('.')) return;
            if (value === '' || value === '0') {
                onChange('0.');
                return;
            }
        }

        if (value.includes('.')) {
            const [, decimal] = value.split('.');
            if (decimal && decimal.length >= 2) return;
        }

        if (value.length >= maxLength) return;

        if (value === '0' && char !== '.') {
            onChange(char);
            return;
        }

        onChange(value + char);
    }, [value, onChange, maxLength, hideDecimal]);

    const handleDelete = useCallback(() => {
        onChange(value.slice(0, -1));
    }, [value, onChange]);

    const handleClear = useCallback(() => {
        onChange('');
    }, [onChange]);

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)] p-2">
            <div className="grid grid-cols-3 gap-2">
                {NUMBER_KEYS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => {
                            if (key === 'del') {
                                handleDelete();
                            } else {
                                handleInput(key);
                            }
                        }}
                        onDoubleClick={() => {
                            if (key === 'del') {
                                handleClear();
                            }
                        }}
                        disabled={key === '.' && hideDecimal}
                        className={getKeyStyle(key, hideDecimal)}
                    >
                        {key === 'del' ? <Delete size={24} /> : key}
                    </button>
                ))}
            </div>

            {onConfirm && (
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={!value || value === '0' || value === '.'}
                    className={getConfirmButtonStyle(value)}
                >
                    <Check size={24} strokeWidth={3} />
                    <span>完成</span>
                </button>
            )}
        </div>
    );
}

interface AmountDisplayProps {
    value: string;
    type: 'income' | 'expense';
    currencySymbol?: string;
}

const AMOUNT_COLOR_CLASS = {
    income: 'text-[var(--color-income)]',
    expense: 'text-[var(--color-expense)]'
} as const;

export function AmountDisplay({
    value,
    type,
    currencySymbol = 'RM'
}: AmountDisplayProps) {
    const displayValue = value || '0';
    const colorClass = AMOUNT_COLOR_CLASS[type];
    const sign = type === 'expense' ? '-' : '+';

    return (
        <div className="text-center py-6">
            <span className={`text-4xl font-bold tracking-tight ${colorClass}`}>
                {sign}{currencySymbol}{displayValue}
            </span>
        </div>
    );
}
