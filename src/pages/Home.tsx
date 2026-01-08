import { useMemo } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TrendingUp, TrendingDown, ArrowRight, Wallet, ArrowUpRight, ArrowDownLeft, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardHeader } from '../components/ui';
import { getIcon } from '../utils/icons';
import { useMonthTransactions, useTransactionSummary, useTodayTransactions, useCategories } from '../hooks/useTransactions';
import { useBudgets } from '../hooks/useBudgets';
import { useActiveSavingsGoals, useSavingsGoalsAutoUpdate } from '../hooks/useSavingsGoals';
import { cn } from '../utils/cn';

interface HomePageProps {
    onViewAllBills: () => void;
}

export function Home({ onViewAllBills }: HomePageProps) {
    const monthTransactions = useMonthTransactions();
    const todayTransactions = useTodayTransactions();
    const monthSummary = useTransactionSummary(monthTransactions);
    const todaySummary = useTransactionSummary(todayTransactions);
    const categories = useCategories();
    const { budgets } = useBudgets(format(new Date(), 'yyyy-MM'));

    // Auto-update savings goals progress
    useSavingsGoalsAutoUpdate();
    const activeGoals = useActiveSavingsGoals();
    const topGoals = activeGoals.slice(0, 2);

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const spendingByCategory = useMemo(() => {
        return monthTransactions.reduce((acc, t) => {
            if (t.type === 'expense') {
                acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [monthTransactions]);

    const budgetOverview = useMemo(() => {
        return budgets
            .map(b => {
                const spent = b.categoryId ? (spendingByCategory[b.categoryId] || 0) : 0;
                return {
                    ...b,
                    spent,
                    percentage: (spent / b.amount) * 100,
                    category: b.categoryId ? categoryMap.get(b.categoryId) : undefined
                };
            })
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 2);
    }, [budgets, spendingByCategory, categoryMap]);

    const recentTransactions = todayTransactions.slice(0, 5);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: 'spring' as const, damping: 25, stiffness: 120 }
        }
    };

    return (
        <motion.div
            className="flex-1 overflow-y-auto pb-24 px-5 pt-8 space-y-8 hide-scrollbar"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Main Asset Display */}
            <motion.div variants={itemVariants}>
                <Card
                    className="relative overflow-hidden border-0 bg-[#0a0a0b] text-white group"
                    shadow="premium"
                    padding="xl"
                >
                    {/* Animated High-end Gradient Background */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute inset-0 z-0"
                    >
                        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[120%] bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-30 blur-[80px]" />
                        <div className="absolute bottom-[-30%] left-[-20%] w-[100%] h-[120%] bg-[radial-gradient(circle_at_center,#4f46e5_0%,transparent_70%)] opacity-20 blur-[100px]" />
                    </motion.div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-xl">
                                    <Zap size={20} className="text-[var(--color-primary)] fill-[var(--color-primary)] opacity-80" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Current Period</p>
                                    <h2 className="text-sm font-black italic tracking-tight">{format(new Date(), 'yyyy / M', { locale: zhCN })}</h2>
                                </div>
                            </div>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                                <Wallet size={18} className="text-white/30" />
                            </div>
                        </div>

                        <div className="space-y-2 mb-10">
                            <div className="flex items-center gap-2 opacity-50">
                                <div className="w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Monthly Expenditure</p>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-white/20 italic tracking-tighter">RM</span>
                                <span className="text-5xl font-black tracking-tighter leading-none italic">
                                    {monthSummary.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-2">
                            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1.5">Incoming</p>
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={14} className="text-[var(--color-income)]" strokeWidth={3} />
                                    <p className="text-lg font-black tracking-tight italic">RM {monthSummary.income.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1.5">Net Flow</p>
                                <div className="flex items-center gap-2">
                                    <TrendingDown size={14} className="text-[var(--color-expense)]" strokeWidth={3} />
                                    <p className="text-lg font-black tracking-tight italic">RM {(monthSummary.income - monthSummary.expense).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {budgetOverview.length > 0 && (
                            <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                                {budgetOverview.map(budget => (
                                    <div key={budget.id} className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">
                                                {budget.category?.name || 'General'} Threshold
                                            </p>
                                            <p className="text-xs font-black italic tracking-tighter text-[var(--color-primary)]">{budget.percentage.toFixed(0)}%</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                                                className={cn(
                                                    "h-full rounded-full",
                                                    budget.percentage > 90 ? "bg-red-500" : "bg-[var(--color-primary)] shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.5)]"
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>

            {/* Savings Goals Preview */}
            {topGoals.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Card shadow="premium" padding="lg" className="border-[var(--color-border)]/40">
                        <CardHeader
                            title={<span className="font-black italic tracking-tighter uppercase text-sm">储蓄目标</span>}
                            subtitle={<span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">{activeGoals.length} 个进行中的目标</span>}
                        />
                        <div className="mt-4 space-y-4">
                            {topGoals.map(goal => {
                                const IconComponent = getIcon(goal.icon);
                                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                                return (
                                    <div key={goal.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-bg-secondary)]/30 hover:bg-[var(--color-bg-secondary)] transition-all">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                                            style={{ backgroundColor: goal.color + '15' }}
                                        >
                                            <IconComponent size={24} style={{ color: goal.color }} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-black text-[var(--color-text)] tracking-tight uppercase truncate">{goal.name}</span>
                                                <span className="text-sm font-black text-[var(--color-primary)] tracking-tighter">{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-[var(--color-bg)] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(progress, 100)}%` }}
                                                    transition={{ duration: 1, delay: 0.2 }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: goal.color }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">RM {goal.currentAmount.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)]">RM {goal.targetAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {activeGoals.length > 2 && (
                                <button
                                    onClick={() => document.dispatchEvent(new CustomEvent('navigate-to-savings'))}
                                    className="w-full py-3 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-primary)] hover:text-white transition-all"
                                >
                                    查看全部 {activeGoals.length} 个目标 <ArrowRight size={12} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Quick Metrics Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-5">
                <Card shadow="none" className="bg-[var(--color-bg-secondary)]/50 border-[var(--color-border)]/50 group active:scale-95 transition-all">
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-expense-bg)] flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm">
                            <ArrowDownLeft size={22} className="text-[var(--color-expense)]" strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em] mb-1">Today Spend</p>
                            <p className="text-2xl font-black text-[var(--color-expense)] tracking-tighter italic leading-none">
                                RM {todaySummary.expense.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card shadow="none" className="bg-[var(--color-bg-secondary)]/50 border-[var(--color-border)]/50 group active:scale-95 transition-all">
                    <div className="flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-income-bg)] flex items-center justify-center group-hover:-rotate-12 transition-transform shadow-sm">
                            <ArrowUpRight size={22} className="text-[var(--color-income)]" strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em] mb-1">Today Gain</p>
                            <p className="text-2xl font-black text-[var(--color-income)] tracking-tighter italic leading-none">
                                RM {todaySummary.income.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Recent Transaction Intelligence */}
            <motion.div variants={itemVariants} className="pb-10">
                <Card shadow="premium" padding="lg" className="border-[var(--color-border)]/40">
                    <CardHeader
                        title={<span className="font-black italic tracking-tighter uppercase text-sm">Real-time Feed</span>}
                        subtitle={<span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Verified {todayTransactions.length} items for today</span>}
                        action={
                            todayTransactions.length > 0 && (
                                <button
                                    onClick={onViewAllBills}
                                    className="px-4 py-2 rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-sm active:scale-90"
                                >
                                    View Logic <ArrowRight size={12} strokeWidth={3} />
                                </button>
                            )
                        }
                    />

                    <div className="mt-4">
                        {recentTransactions.length === 0 ? (
                            <div className="py-12 flex flex-col items-center text-center opacity-30">
                                <Wallet size={48} className="mb-4 text-[var(--color-text-muted)]" />
                                <p className="text-xs font-black uppercase tracking-widest">No activity reported</p>
                                <button
                                    onClick={() => document.dispatchEvent(new CustomEvent('open-add-transaction'))}
                                    className="mt-6 px-6 py-2 rounded-full border border-[var(--color-text)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] transition-all"
                                >
                                    Initialize Flow
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentTransactions.map((transaction, index) => {
                                    const category = categoryMap.get(transaction.categoryId);
                                    const IconComponent = category
                                        ? getIcon(category.icon)
                                        : getIcon('HelpCircle');

                                    return (
                                        <motion.div
                                            key={transaction.id}
                                            initial={{ opacity: 0, x: -15 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 + 0.3 }}
                                            className="flex items-center gap-5 p-4 rounded-3xl bg-[var(--color-bg-secondary)]/30 hover:bg-[var(--color-bg-secondary)] transition-all group cursor-pointer"
                                        >
                                            <div
                                                className="w-14 h-14 rounded-[2rem] flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-500"
                                                style={{ backgroundColor: (category?.color || '#cbd5e1') + '15', boxShadow: `0 8px 16px -4px ${(category?.color || '#cbd5e1')}20` }}
                                            >
                                                <IconComponent
                                                    size={24}
                                                    style={{ color: category?.color || '#94a3b8' }}
                                                    strokeWidth={2.5}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="font-black text-[var(--color-text)] tracking-tight italic">
                                                        {category?.name || 'Unclassified'}
                                                    </p>
                                                    <span className="text-[8px] font-black bg-white shadow-sm px-1.5 py-0.5 rounded-full uppercase tracking-tighter opacity-40">Verified</span>
                                                </div>
                                                <p className="text-[10px] text-[var(--color-text-secondary)] font-bold truncate opacity-50 uppercase tracking-widest">
                                                    {transaction.note || '( No Metadata )'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "text-lg font-black tracking-tighter italic",
                                                    transaction.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'
                                                )}>
                                                    {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
}


