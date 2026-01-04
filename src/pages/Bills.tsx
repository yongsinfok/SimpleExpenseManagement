import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfToday, subMonths, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, Trash2, Calendar, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card } from '../components/ui';
import { useTransactions, useCategories, useDeleteTransaction } from '../hooks/useTransactions';
import { getIcon } from '../utils/icons';
import { cn } from '../utils/cn';
import type { Transaction, TransactionType } from '../types';

type DateRange = 'today' | 'month' | 'lastMonth' | 'all';

export function BillsPage() {
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterType, setFilterType] = useState<TransactionType | undefined>();
    const [dateRange, setDateRange] = useState<DateRange>('month');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
    const [showFilters, setShowFilters] = useState(false);

    const transactions = useTransactions({ type: filterType });
    const categories = useCategories();
    const { deleteTransaction } = useDeleteTransaction();

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const filteredTransactions = useMemo(() => {
        let result = transactions;

        if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();
            result = result.filter(t => {
                const category = categoryMap.get(t.categoryId);
                return (
                    category?.name.toLowerCase().includes(keyword) ||
                    t.note?.toLowerCase().includes(keyword)
                );
            });
        }

        if (selectedCategoryId) {
            result = result.filter(t => t.categoryId === selectedCategoryId);
        }

        const now = new Date();
        if (dateRange !== 'all') {
            let start: Date;
            let end: Date = now;

            if (dateRange === 'today') {
                start = startOfToday();
            } else if (dateRange === 'month') {
                start = startOfMonth(now);
                end = endOfMonth(now);
            } else if (dateRange === 'lastMonth') {
                const lastMonth = subMonths(now, 1);
                start = startOfMonth(lastMonth);
                end = endOfMonth(lastMonth);
            } else {
                start = new Date(0);
            }

            result = result.filter(t => {
                const tDate = parseISO(t.date);
                return isWithinInterval(tDate, { start, end });
            });
        }

        return result;
    }, [transactions, searchKeyword, categoryMap, dateRange, selectedCategoryId]);

    const groupedTransactions = useMemo(() => {
        const grouped = filteredTransactions.reduce((acc, transaction) => {
            const date = transaction.date;
            if (!acc[date]) {
                acc[date] = {
                    date,
                    transactions: [],
                    income: 0,
                    expense: 0
                };
            }
            acc[date].transactions.push(transaction);
            if (transaction.type === 'income') {
                acc[date].income += transaction.amount;
            } else {
                acc[date].expense += transaction.amount;
            }
            return acc;
        }, {} as Record<string, {
            date: string;
            transactions: Transaction[];
            income: number;
            expense: number
        }>);

        return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    }, [filteredTransactions]);

    const handleDelete = async (id: string) => {
        if (window.confirm('此操作无法撤销。确定要永久删除这笔账目吗？')) {
            await deleteTransaction(id);
            toast.success('账目已抹除');
        }
    };

    return (
        <div className="flex-1 overflow-y-auto pb-28 flex flex-col bg-[var(--color-bg)] hide-scrollbar">
            {/* Nav Title */}
            <div className="px-6 pt-8 pb-4">
                <h2 className="text-2xl font-black text-[var(--color-text)] tracking-tighter italic">账目流水</h2>
                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-50">Transaction Ledger / Deep Feed</p>
            </div>

            {/* Premium Filter Control */}
            <div className="sticky top-0 z-30 px-4 py-4 backdrop-blur-3xl bg-[var(--color-bg)]/80">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none group-focus-within:text-[var(--color-primary)] transition-colors">
                            <Search size={16} className="text-[var(--color-text-muted)]" strokeWidth={3} />
                        </div>
                        <input
                            type="text"
                            placeholder="搜索元数据..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="w-full bg-[var(--color-bg-secondary)] border-none rounded-2xl pl-12 pr-4 py-4 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-500",
                            showFilters
                                ? "bg-[var(--color-primary)] text-white shadow-xl shadow-[var(--color-primary)]/30 rotate-90"
                                : "bg-[var(--color-bg-card)] border border-[var(--color-border)]/50 text-[var(--color-text-secondary)] shadow-sm"
                        )}
                    >
                        <SlidersHorizontal size={20} strokeWidth={3} />
                    </button>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, y: -10 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -10 }}
                            className="overflow-hidden mt-6 space-y-6"
                        >
                            <Card padding="lg" shadow="premium" className="bg-[var(--color-bg-card)]/50 border-[var(--color-primary)]/10">
                                {/* Range Selector */}
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] px-1">时间维度 / Timeline</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['month', 'lastMonth', 'today', 'all'] as const).map(range => (
                                            <button
                                                key={range}
                                                onClick={() => setDateRange(range)}
                                                className={cn(
                                                    "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                    dateRange === range
                                                        ? 'bg-[var(--color-text)] text-[var(--color-bg)] shadow-lg'
                                                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                                )}
                                            >
                                                {range === 'month' ? '本月' : range === 'lastMonth' ? '上月' : range === 'today' ? '今日' : '全部'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Class Selector */}
                                <div className="space-y-3 mt-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] px-1">收支类型 / Classification</p>
                                    <div className="flex gap-2">
                                        {[
                                            { id: undefined, label: 'ALL' },
                                            { id: 'expense', label: 'DEBIT', color: 'var(--color-expense)' },
                                            { id: 'income', label: 'CREDIT', color: 'var(--color-income)' }
                                        ].map(type => (
                                            <button
                                                key={type.id || 'all'}
                                                onClick={() => { setFilterType(type.id as any); setSelectedCategoryId(undefined); }}
                                                className={cn(
                                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                    filterType === type.id
                                                        ? `bg-[${type.color || 'var(--color-primary)'}] text-white shadow-lg`
                                                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                                                )}
                                                style={filterType === type.id && type.color ? { backgroundColor: type.color } : {}}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category Cloud */}
                                <div className="space-y-3 mt-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] px-1">精细分类 / Granularity</p>
                                    <div className="flex overflow-x-auto gap-2 no-scrollbar pb-2">
                                        {categories.filter(c => !filterType || c.type === filterType).map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? undefined : cat.id)}
                                                className={cn(
                                                    "shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                    selectedCategoryId === cat.id
                                                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                                                        : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'
                                                )}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 px-4 mt-4">
                <AnimatePresence mode="popLayout">
                    {groupedTransactions.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="py-20 text-center opacity-30"
                        >
                            <ArrowLeftRight size={48} className="mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.3em]">No matching transactions</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-2">{searchKeyword ? "Filter parameters too strict" : "Database idle"}</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-10">
                            {groupedTransactions.map((group) => (
                                <motion.div
                                    key={group.date}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    {/* Glass Date Header */}
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center shadow-sm">
                                                <Calendar size={16} strokeWidth={3} className="text-[var(--color-text-secondary)]" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-black text-[var(--color-text)] tracking-tighter uppercase">
                                                    {format(parseISO(group.date), 'MMM dd, EEE', { locale: zhCN })}
                                                </span>
                                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-40">Entry Date</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {group.expense > 0 && (
                                                <span className="text-[9px] font-black text-[var(--color-expense)] bg-[var(--color-expense-bg)] px-2.5 py-1.5 rounded-xl border border-[var(--color-expense)]/10">
                                                    - {group.expense.toFixed(2)}
                                                </span>
                                            )}
                                            {group.income > 0 && (
                                                <span className="text-[9px] font-black text-[var(--color-income)] bg-[var(--color-income-bg)] px-2.5 py-1.5 rounded-xl border border-[var(--color-income)]/10">
                                                    + {group.income.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* High-end Transaction Group */}
                                    <Card shadow="none" padding="none" className="overflow-hidden border-[var(--color-border)]/50 bg-[var(--color-bg-card)]/30 backdrop-blur-sm">
                                        <div className="divide-y divide-[var(--color-border)]/30">
                                            {group.transactions.map((transaction, idx) => {
                                                const category = categoryMap.get(transaction.categoryId);
                                                const IconComponent = category ? getIcon(category.icon) : getIcon('HelpCircle');

                                                return (
                                                    <motion.div
                                                        key={transaction.id}
                                                        layout
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="flex items-center gap-5 p-5 hover:bg-[var(--color-bg-secondary)]/50 transition-all group cursor-pointer"
                                                    >
                                                        <div
                                                            className="w-14 h-14 rounded-[1.75rem] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all shrink-0"
                                                            style={{ backgroundColor: (category?.color || '#cbd5e1') + '15' }}
                                                        >
                                                            <IconComponent
                                                                size={24}
                                                                style={{ color: category?.color || '#94a3b8' }}
                                                                strokeWidth={2.5}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-black text-[var(--color-text)] truncate tracking-tight italic uppercase">
                                                                {category?.name || 'Unmapped'}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5 opacity-60">
                                                                <p className="text-[10px] font-bold text-[var(--color-text-secondary)] truncate uppercase tracking-widest">
                                                                    {transaction.note || '. . .'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex items-center gap-4">
                                                            <div>
                                                                <p className={cn(
                                                                    "text-lg font-black tracking-tighter italic leading-none",
                                                                    transaction.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'
                                                                )}>
                                                                    {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}
                                                                </p>
                                                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1 opacity-40">Value RM</p>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(transaction.id); }}
                                                                className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-white hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                                                            >
                                                                <Trash2 size={16} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}


