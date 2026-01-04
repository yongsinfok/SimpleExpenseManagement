import { useState, useMemo } from 'react';
import { format, startOfMonth } from 'date-fns';
import { ChevronLeft, Plus, Trash2, ArrowLeft, Target, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState, Card, Button, Modal } from '../components/ui';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories, useTransactions } from '../hooks/useTransactions';
import { cn } from '../utils/cn';

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
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-full bg-[var(--color-bg)]"
        >
            {/* Nav Header */}
            <div className="flex items-center gap-4 px-6 py-5 glass sticky top-0 z-50 border-b border-[var(--color-border)]/50">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] shadow-sm active:scale-95 transition-all"
                >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-[var(--color-text)] tracking-tight italic">预算管理</h2>
                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Budget & Planning</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
                {/* Master Overview Card */}
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="relative rounded-[2.5rem] bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] text-white p-7 shadow-2xl shadow-indigo-900/40 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-2xl" />

                    <div className="relative space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Monthly Budget Strategy</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-black opacity-30">RM</span>
                                    <span className="text-4xl font-black tracking-tighter">
                                        {totalBudget.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                <Target size={24} className="text-indigo-200" strokeWidth={2.5} />
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Consumption Progress</p>
                                    <p className="text-sm font-black">RM {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-white/30 text-[10px] font-bold">SPENT</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black tracking-tighter">{totalPercentage.toFixed(0)}%</p>
                                </div>
                            </div>
                            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 backdrop-blur-sm border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(totalPercentage, 100)}%` }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        totalPercentage > 90 ? "bg-gradient-to-r from-red-400 to-red-500" : "bg-gradient-to-r from-indigo-300 to-white"
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Sub-Budget Lists */}
                <div className="space-y-4 pb-24">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Category Allocation</h3>
                        <span className="text-[10px] font-black text-white bg-[var(--color-primary)] px-2.5 py-1 rounded-full shadow-sm">{budgetList.length} CATEGORIES</span>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {budgetList.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <EmptyState
                                    icon={TrendingUp}
                                    title="Precision Management"
                                    description="尚未设置任何分类预算，开始精准掌控每一分支出"
                                    actionLabel="建立首个预算"
                                    onAction={() => setShowAddModal(true)}
                                />
                            </motion.div>
                        ) : (
                            budgetList.map((budget, index) => (
                                <motion.div
                                    key={budget.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card padding="lg" shadow="md" className="group">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                                                    style={{ backgroundColor: budget.categoryColor }}
                                                >
                                                    <span className="text-xs font-black">{budget.categoryName[0]}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-[var(--color-text)] tracking-tight truncate">{budget.categoryName}</h4>
                                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">RM {budget.amount} Budget</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteBudget(budget.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>

                                        <div className="space-y-2.5">
                                            <div className="h-2 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${budget.percentage}%` }}
                                                    transition={{ duration: 1, delay: index * 0.1 }}
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        backgroundColor: budget.percentage > 90 ? 'var(--color-expense)' : budget.categoryColor
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[var(--color-text-muted)]">Remain</span>
                                                    <span className={cn(
                                                        budget.remaining < 0 ? "text-red-500" : "text-[var(--color-text)]"
                                                    )}>RM {budget.remaining.toFixed(1)}</span>
                                                </div>
                                                <div className="text-[var(--color-text-muted)]">
                                                    {budget.spent.toFixed(0)} <span className="opacity-40">/ {budget.amount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Add Budget Action Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="规划新预算"
            >
                <div className="p-6 pt-2 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">选择预算分类</label>
                            <div className="relative group">
                                <select
                                    value={selectedCategoryId}
                                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                                    className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-4 rounded-2xl outline-none appearance-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                                >
                                    <option value="">点击在此选择...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronLeft className="absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 text-[var(--color-text-muted)] pointer-events-none" size={16} strokeWidth={3} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">设定每月限额 (RM)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-black text-2xl px-4 py-5 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:opacity-20"
                            />
                        </div>
                    </div>

                    <Button
                        fullWidth
                        size="lg"
                        onClick={handleSaveBudget}
                        disabled={!selectedCategoryId || !amount}
                        className="h-16 rounded-2xl text-lg font-black uppercase tracking-[0.2em] shadow-xl shadow-[var(--color-primary)]/20"
                    >
                        COMMIT BUDGET
                    </Button>
                    <p className="text-center text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-widest px-4">
                        预算将自动应用于当前月份，并在月底进行结算
                    </p>
                </div>
            </Modal>
        </motion.div>
    );
}

