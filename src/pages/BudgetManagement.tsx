import { useState, useMemo } from 'react';
import { format, startOfMonth } from 'date-fns';
import { ChevronLeft, Plus, Trash2, Wallet, PieChart } from 'lucide-react';
import { EmptyState } from '../components/ui';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories, useTransactions } from '../hooks/useTransactions';

interface BudgetManagementProps {
    onBack: () => void;
}

export function BudgetManagement({ onBack }: BudgetManagementProps) {
    const currentPeriod = format(new Date(), 'yyyy-MM');
    const { budgets, setBudget, deleteBudget } = useBudgets(currentPeriod);
    const categories = useCategories('expense');
    const transactions = useTransactions({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');

    const spendingByCategory = useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.type === 'expense') {
                acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [transactions]);

    const handleSaveBudget = async () => {
        if (!selectedCategoryId || !amount || isNaN(parseFloat(amount))) return;

        await setBudget({
            categoryId: selectedCategoryId,
            amount: parseFloat(amount),
            period: 'monthly',
            startDate: currentPeriod
        });

        setShowAddModal(false);
        setSelectedCategoryId('');
        setAmount('');
    };

    const budgetList = useMemo(() => {
        return budgets.map(b => {
            const category = categories.find(c => c.id === b.categoryId);
            const spent = b.categoryId ? (spendingByCategory[b.categoryId] || 0) : 0;
            const remaining = b.amount - spent;
            const percentage = Math.min((spent / b.amount) * 100, 100);

            return {
                ...b,
                categoryName: category?.name || '未知分类',
                categoryColor: category?.color || '#888',
                spent,
                remaining,
                percentage
            };
        });
    }, [budgets, categories, spendingByCategory]);

    const totalBudget = budgetList.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgetList.reduce((sum, b) => sum + b.spent, 0);
    const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg)] animate-in fade-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[var(--color-bg-card)] border-b border-[var(--color-border)]/50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:bg-[var(--color-bg-secondary)]"><ChevronLeft size={24} /></button>
                    <h1 className="text-xl font-black text-[var(--color-text)]">预算管理</h1>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="p-2.5 bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* 总体预算概览 */}
                <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/80 rounded-3xl p-6 text-white shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">本月总支出预算</p>
                            <h2 className="text-3xl font-black">RM {totalBudget.toLocaleString()}</h2>
                        </div>
                        <Wallet size={32} className="text-white/30" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span>已用 RM {totalSpent.toLocaleString()}</span>
                            <span>{totalPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-1000"
                                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 分类预算列表 */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-black text-[var(--color-text-muted)] uppercase tracking-widest">分类预算详情</h3>
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-2 py-1 rounded-full">{budgetList.length} 个项目</span>
                    </div>

                    {budgetList.length === 0 ? (
                        <EmptyState
                            icon={PieChart}
                            title="尚未设置任何预算"
                            description="设定预算可以帮助你更好地控制支出"
                            actionLabel="立即添加"
                            onAction={() => setShowAddModal(true)}
                        />
                    ) : (
                        budgetList.map(budget => (
                            <div key={budget.id} className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]/50">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: budget.categoryColor }} />
                                        <span className="font-bold text-[var(--color-text)]">{budget.categoryName}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-[var(--color-text)]">RM {budget.amount}</span>
                                        <button onClick={() => deleteBudget(budget.id)} className="text-[var(--color-expense)]/50 hover:text-[var(--color-expense)] p-1 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${budget.percentage}%`,
                                            backgroundColor: budget.percentage > 90 ? 'var(--color-expense)' : budget.categoryColor
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-extrabold">
                                    <span className="text-[var(--color-text-muted)]">剩余 RM {budget.remaining.toFixed(2)}</span>
                                    <span style={{ color: budget.percentage > 90 ? 'var(--color-expense)' : 'var(--color-text-muted)' }}>
                                        {budget.spent.toFixed(1)} / {budget.amount}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Budget Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-[var(--color-bg-card)] rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-[var(--color-text)]">添加预算</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-[var(--color-text-muted)] p-2">取消</button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-1">选择分类</label>
                                <select
                                    value={selectedCategoryId}
                                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                                    className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-2xl p-4 font-bold border-none appearance-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                >
                                    <option value="">请选择支出分类...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-1">每月限额 (RM)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-2xl p-4 font-black text-xl border-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveBudget}
                            disabled={!selectedCategoryId || !amount}
                            className="w-full py-4 bg-[var(--color-text)] text-[var(--color-bg)] rounded-2xl font-black text-lg tracking-widest disabled:opacity-20 active:scale-95 transition-all shadow-xl"
                        >
                            保存预算
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
