import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, StickyNote, ChevronDown, Check, ArrowLeft, ArrowRight, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, NumberPad, AmountDisplay, CategoryPicker, Button, Card } from './ui';
import { useCategories, useAccounts, useAddTransaction } from '../hooks/useTransactions';
import type { Category, TransactionType, TransactionFormData } from '../types';
import { cn } from '../utils/cn';

interface AddTransactionProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddTransaction({ isOpen, onClose, onSuccess }: AddTransactionProps) {
    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [note, setNote] = useState('');
    const [step, setStep] = useState<'amount' | 'category' | 'details'>('amount');

    const categories = useCategories(type);
    const accounts = useAccounts();
    const { addTransaction, isLoading } = useAddTransaction();

    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setSelectedCategory(null);
            setNote('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setStep('amount');
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedCategory(null);
    }, [type]);

    const handleCategorySelect = (category: Category) => {
        setSelectedCategory(category);
        setStep('details');
    };

    const handleSubmit = async () => {
        if (!amount || !selectedCategory || !selectedAccountId) return;

        const data: TransactionFormData = {
            type,
            amount: parseFloat(amount),
            categoryId: selectedCategory.id,
            accountId: selectedAccountId,
            date,
            note
        };

        try {
            await addTransaction(data);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Failed to add transaction:', error);
        }
    };

    const handleAmountConfirm = () => {
        if (amount && parseFloat(amount) > 0) {
            setStep('category');
        }
    };

    const stepVariants = {
        initial: (direction: number) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95
        }),
        animate: {
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95
        })
    };

    const [direction, setDirection] = useState(0);

    const changeStep = (newStep: typeof step) => {
        const steps: (typeof step)[] = ['amount', 'category', 'details'];
        const currentIdx = steps.indexOf(step);
        const newIdx = steps.indexOf(newStep);
        setDirection(newIdx > currentIdx ? 1 : -1);
        setStep(newStep);
    };

    const renderContent = () => {
        return (
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={step}
                    custom={direction}
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full"
                >
                    {step === 'amount' && (
                        <div className="p-6 space-y-6">
                            {/* Type Switcher */}
                            <div className="flex p-1.5 bg-[var(--color-bg-secondary)] rounded-[1.5rem] border border-[var(--color-border)]/50">
                                <button
                                    onClick={() => setType('expense')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.25rem] text-sm font-black uppercase tracking-widest transition-all",
                                        type === 'expense'
                                            ? "bg-[var(--color-expense)] text-white shadow-lg shadow-red-500/20"
                                            : "text-[var(--color-text-secondary)] opacity-50"
                                    )}
                                >
                                    <span>支出</span>
                                </button>
                                <button
                                    onClick={() => setType('income')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.25rem] text-sm font-black uppercase tracking-widest transition-all",
                                        type === 'income'
                                            ? "bg-[var(--color-income)] text-white shadow-lg shadow-emerald-500/20"
                                            : "text-[var(--color-text-secondary)] opacity-50"
                                    )}
                                >
                                    <span>收入</span>
                                </button>
                            </div>

                            <AmountDisplay value={amount} type={type} />

                            <NumberPad
                                value={amount}
                                onChange={setAmount}
                                onConfirm={handleAmountConfirm}
                            />
                        </div>
                    )}

                    {step === 'category' && (
                        <div className="space-y-4">
                            <div className="px-6 py-4 bg-gradient-to-r from-[var(--color-bg-secondary)] to-transparent">
                                <AmountDisplay value={amount} type={type} />
                            </div>
                            <div className="px-6 flex items-center justify-between">
                                <h3 className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                    选择分类
                                </h3>
                                <button
                                    onClick={() => changeStep('amount')}
                                    className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-1"
                                >
                                    <ArrowLeft size={10} strokeWidth={3} /> 返回金额
                                </button>
                            </div>
                            <div className="pb-8">
                                <CategoryPicker
                                    categories={categories}
                                    selectedId={selectedCategory?.id}
                                    onSelect={handleCategorySelect}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'details' && (
                        <div className="p-6 space-y-6">
                            {/* Summary Card */}
                            <Card padding="lg" shadow="premium" className="relative overflow-hidden group">
                                <div className={cn(
                                    "absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 opacity-20",
                                    type === 'income' ? "bg-emerald-500" : "bg-red-500"
                                )} />
                                <div className="relative flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                                            {selectedCategory?.name || '未知分类'}
                                        </p>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-sm font-black opacity-40">RM</span>
                                            <span className={cn(
                                                "text-3xl font-black tracking-tighter",
                                                type === 'income' ? "text-[var(--color-income)]" : "text-[var(--color-expense)]"
                                            )}>
                                                {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => changeStep('amount')}
                                        className="w-10 h-10 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                                    >
                                        <ArrowLeft size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </Card>

                            <div className="space-y-4">
                                {/* Date Picker */}
                                <div className="space-y-1.5">
                                    <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">交易日期</label>
                                    <div className="group flex items-center gap-3 p-4 bg-[var(--color-bg-secondary)] rounded-2xl border border-transparent focus-within:border-[var(--color-primary)]/30 focus-within:bg-[var(--color-bg-card)] transition-all">
                                        <Calendar size={18} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="flex-1 bg-transparent text-sm font-bold text-[var(--color-text)] outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Account Selection */}
                                <div className="space-y-1.5">
                                    <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">支付账户</label>
                                    <div className="group flex items-center gap-3 p-4 bg-[var(--color-bg-secondary)] rounded-2xl border border-transparent focus-within:border-[var(--color-primary)]/30 focus-within:bg-[var(--color-bg-card)] transition-all relative">
                                        <Wallet size={18} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                                        <select
                                            value={selectedAccountId}
                                            onChange={(e) => setSelectedAccountId(e.target.value)}
                                            className="flex-1 bg-transparent text-sm font-bold text-[var(--color-text)] outline-none appearance-none z-10"
                                        >
                                            {accounts.map((account) => (
                                                <option key={account.id} value={account.id}>{account.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 text-[var(--color-text-muted)] pointer-events-none" strokeWidth={3} />
                                    </div>
                                </div>

                                {/* Note */}
                                <div className="space-y-1.5">
                                    <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">备注说明</label>
                                    <div className="group flex items-start gap-3 p-4 bg-[var(--color-bg-secondary)] rounded-2xl border border-transparent focus-within:border-[var(--color-primary)]/30 focus-within:bg-[var(--color-bg-card)] transition-all">
                                        <StickyNote size={18} className="text-[var(--color-text-muted)] mt-1 group-focus-within:text-[var(--color-primary)] transition-colors" />
                                        <textarea
                                            placeholder="点击添加备注..."
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            rows={2}
                                            className="flex-1 bg-transparent text-sm font-bold text-[var(--color-text)] outline-none resize-none placeholder:opacity-30"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                fullWidth
                                size="lg"
                                loading={isLoading}
                                onClick={handleSubmit}
                                className="h-16 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-[var(--color-primary)]/20"
                            >
                                <Check size={20} className="mr-2" strokeWidth={3} /> 保存记录
                            </Button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 'amount' ? '记账' : step === 'category' ? '分类' : '确认'}
        >
            <div className="min-h-[480px] flex flex-col">
                {renderContent()}
            </div>
        </Modal>
    );
}

