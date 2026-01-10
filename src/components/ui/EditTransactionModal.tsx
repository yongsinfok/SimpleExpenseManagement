import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import type { Transaction, TransactionType, Category } from '../../types';

interface EditTransactionModalProps {
    transaction: Transaction | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
    categories: Category[];
    accounts: { id: string; name: string }[];
}

export function EditTransactionModal({
    transaction,
    isOpen,
    onClose,
    onSave,
    categories,
    accounts,
}: EditTransactionModalProps) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState('');
    const [note, setNote] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (transaction) {
            setAmount(transaction.amount.toString());
            setCategoryId(transaction.categoryId);
            setAccountId(transaction.accountId);
            setDate(transaction.date);
            setNote(transaction.note || '');
            setType(transaction.type);
        }
    }, [transaction]);

    const filteredCategories = categories.filter(c => c.type === type);

    const handleSave = async () => {
        if (!transaction || !amount || parseFloat(amount) <= 0) {
            toast.error('请输入有效金额');
            return;
        }
        if (!categoryId) {
            toast.error('请选择分类');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(transaction.id, {
                amount: parseFloat(amount),
                categoryId,
                accountId,
                date,
                note: note || undefined,
                type,
            });
        } catch (error) {
            toast.error('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !transaction) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-t-3xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]/50">
                        <h3 className="text-lg font-black text-[var(--color-text)]">编辑交易</h3>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                        <TypeSwitcher value={type} onChange={(newType) => { setType(newType); setCategoryId(''); }} />

                        <FormField label="金额" type="number" value={amount} onChange={setAmount} placeholder="0.00" />

                        <CategorySelector
                            categories={filteredCategories}
                            selectedId={categoryId}
                            onSelect={setCategoryId}
                        />

                        <SelectField
                            label="账户"
                            value={accountId}
                            onChange={setAccountId}
                            options={accounts}
                        />

                        <DateField value={date} onChange={setDate} />

                        <TextAreaField label="备注" value={note} onChange={setNote} maxLength={200} placeholder="可选备注..." />
                    </div>

                    <div className="p-6 pt-0 flex gap-3">
                        <CancelButton onClick={onClose} disabled={isSaving} />
                        <SaveButton onClick={handleSave} disabled={isSaving} isLoading={isSaving} />
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Sub-components

interface TypeSwitcherProps {
    value: TransactionType;
    onChange: (value: TransactionType) => void;
}

function TypeSwitcher({ value, onChange }: TypeSwitcherProps) {
    return (
        <div className="flex p-1.5 bg-[var(--color-bg-secondary)] rounded-2xl">
            <TypeButton active={value === 'expense'} onClick={() => onChange('expense')}>支出</TypeButton>
            <TypeButton active={value === 'income'} onClick={() => onChange('income')}>收入</TypeButton>
        </div>
    );
}

interface TypeButtonProps {
    active: boolean;
    onClick: () => void;
    children: string;
}

function TypeButton({ active, onClick, children }: TypeButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                active
                    ? "bg-[var(--color-" + (children === '支出' ? 'expense' : 'income') + "] text-white shadow-lg"
                    : "text-[var(--color-text-secondary)] opacity-50"
            )}
        >
            {children}
        </button>
    );
}

interface FormFieldProps {
    label: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}

function FormField({ label, type = 'text', value, onChange, placeholder }: FormFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                placeholder={placeholder}
            />
        </div>
    );
}

interface CategorySelectorProps {
    categories: Category[];
    selectedId: string;
    onSelect: (id: string) => void;
}

function CategorySelector({ categories, selectedId, onSelect }: CategorySelectorProps) {
    return (
        <div className="space-y-1.5">
            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">分类</label>
            <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.id)}
                        className={cn(
                            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                            selectedId === cat.id
                                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border-transparent"
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { id: string; name: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none appearance-none"
            >
                {options.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
            </select>
        </div>
    );
}

interface DateFieldProps {
    value: string;
    onChange: (value: string) => void;
}

function DateField({ value, onChange }: DateFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">日期</label>
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none"
            />
        </div>
    );
}

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    placeholder: string;
}

function TextAreaField({ label, value, onChange, maxLength = 200, placeholder }: TextAreaFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={2}
                maxLength={maxLength}
                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none resize-none"
                placeholder={placeholder}
            />
        </div>
    );
}

interface CancelButtonProps {
    onClick: () => void;
    disabled: boolean;
}

function CancelButton({ onClick, disabled }: CancelButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex-1 py-4 rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] font-black uppercase tracking-widest text-sm"
        >
            取消
        </button>
    );
}

interface SaveButtonProps {
    onClick: () => void;
    disabled: boolean;
    isLoading: boolean;
}

function SaveButton({ onClick, disabled, isLoading }: SaveButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex-1 py-4 rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
                <>
                    <Check size={18} strokeWidth={3} />
                    保存
                </>
            )}
        </button>
    );
}
