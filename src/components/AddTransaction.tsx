import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar, StickyNote, ChevronDown } from 'lucide-react';
import { Modal, NumberPad, AmountDisplay, CategoryPicker, Button } from './ui';
import { useCategories, useAccounts, useAddTransaction } from '../hooks/useTransactions';
import type { Category, TransactionType, TransactionFormData } from '../types';

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

    // 设置默认账户
    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);

    // 重置表单
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setSelectedCategory(null);
            setNote('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setStep('amount');
        }
    }, [isOpen]);

    // 类型切换时重置分类
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

    const renderContent = () => {
        switch (step) {
            case 'amount':
                return (
                    <div className="p-4">
                        {/* 类型切换 */}
                        <div className="flex gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => setType('expense')}
                                className={`
                  flex-1 py-2 rounded-[var(--radius-md)] font-medium transition-colors
                  ${type === 'expense'
                                        ? 'bg-[var(--color-expense)] text-white'
                                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                                    }
                `}
                            >
                                支出
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('income')}
                                className={`
                  flex-1 py-2 rounded-[var(--radius-md)] font-medium transition-colors
                  ${type === 'income'
                                        ? 'bg-[var(--color-income)] text-white'
                                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                                    }
                `}
                            >
                                收入
                            </button>
                        </div>

                        {/* 金额显示 */}
                        <AmountDisplay value={amount} type={type} />

                        {/* 数字键盘 */}
                        <NumberPad
                            value={amount}
                            onChange={setAmount}
                            onConfirm={handleAmountConfirm}
                        />
                    </div>
                );

            case 'category':
                return (
                    <div>
                        <div className="px-4 py-2 bg-[var(--color-bg-secondary)]">
                            <AmountDisplay value={amount} type={type} />
                        </div>
                        <div className="py-2">
                            <h3 className="px-4 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                选择分类
                            </h3>
                            <CategoryPicker
                                categories={categories}
                                selectedId={selectedCategory?.id}
                                onSelect={handleCategorySelect}
                            />
                        </div>
                    </div>
                );

            case 'details':
                return (
                    <div className="p-4 space-y-4">
                        {/* 金额和分类摘要 */}
                        <div className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)]">
                            <div>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    {selectedCategory?.name}
                                </p>
                                <p className={`text-2xl font-bold ${type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}`}>
                                    {type === 'expense' ? '-' : '+'}RM{amount}
                                </p>
                            </div>
                            <button
                                onClick={() => setStep('amount')}
                                className="text-[var(--color-primary)] text-sm"
                            >
                                修改
                            </button>
                        </div>

                        {/* 日期选择 */}
                        <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)]">
                            <Calendar size={20} className="text-[var(--color-text-secondary)]" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="flex-1 bg-transparent text-[var(--color-text)]"
                            />
                        </div>

                        {/* 账户选择 */}
                        <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)]">
                            <ChevronDown size={20} className="text-[var(--color-text-secondary)]" />
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="flex-1 bg-transparent text-[var(--color-text)]"
                            >
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 备注 */}
                        <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)]">
                            <StickyNote size={20} className="text-[var(--color-text-secondary)] mt-0.5" />
                            <textarea
                                placeholder="添加备注..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                className="flex-1 bg-transparent text-[var(--color-text)] resize-none placeholder:text-[var(--color-text-muted)]"
                            />
                        </div>

                        {/* 提交按钮 */}
                        <Button
                            fullWidth
                            size="lg"
                            loading={isLoading}
                            onClick={handleSubmit}
                        >
                            保存
                        </Button>
                    </div>
                );
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 'amount' ? '记一笔' : step === 'category' ? '选择分类' : '确认详情'}
        >
            {renderContent()}
        </Modal>
    );
}
