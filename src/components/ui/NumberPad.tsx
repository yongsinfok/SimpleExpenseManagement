import { useState, useCallback } from 'react';
import { Delete, Check } from 'lucide-react';

interface NumberPadProps {
    value: string;
    onChange: (value: string) => void;
    onConfirm?: () => void;
    maxLength?: number;
}

export function NumberPad({
    value,
    onChange,
    onConfirm,
    maxLength = 10
}: NumberPadProps) {
    const handleInput = useCallback((char: string) => {
        if (char === '.') {
            // 防止多个小数点
            if (value.includes('.')) return;
            // 如果是空或只有小数点，补0
            if (value === '' || value === '0') {
                onChange('0.');
                return;
            }
        }

        // 限制小数点后两位
        if (value.includes('.')) {
            const [, decimal] = value.split('.');
            if (decimal && decimal.length >= 2) return;
        }

        // 限制最大长度
        if (value.length >= maxLength) return;

        // 防止前导0
        if (value === '0' && char !== '.') {
            onChange(char);
            return;
        }

        onChange(value + char);
    }, [value, onChange, maxLength]);

    const handleDelete = useCallback(() => {
        onChange(value.slice(0, -1));
    }, [value, onChange]);

    const handleClear = useCallback(() => {
        onChange('');
    }, [onChange]);

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)] p-2">
            <div className="grid grid-cols-3 gap-2">
                {keys.map((key) => (
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
                        className={`
              h-14 rounded-[var(--radius-md)]
              text-xl font-medium
              flex items-center justify-center
              transition-all duration-150
              active:scale-95
              ${key === 'del'
                                ? 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]'
                                : 'bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
                            }
            `}
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
                    className={`
            w-full mt-2 h-14 rounded-[var(--radius-md)]
            bg-[var(--color-primary)] text-white
            text-lg font-semibold
            flex items-center justify-center gap-2
            transition-all duration-150
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
                >
                    <Check size={24} />
                    完成
                </button>
            )}
        </div>
    );
}

// 金额显示组件
interface AmountDisplayProps {
    value: string;
    type: 'income' | 'expense';
    currencySymbol?: string;
}

export function AmountDisplay({
    value,
    type,
    currencySymbol = 'RM'
}: AmountDisplayProps) {
    const displayValue = value || '0';

    return (
        <div className="text-center py-6">
            <span
                className={`
          text-4xl font-bold tracking-tight
          ${type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}
        `}
            >
                {type === 'expense' ? '-' : '+'}{currencySymbol}{displayValue}
            </span>
        </div>
    );
}
