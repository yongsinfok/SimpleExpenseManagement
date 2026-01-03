import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfToday, subMonths, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, Filter, Trash2, Calendar, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTransactions, useCategories, useDeleteTransaction } from '../hooks/useTransactions';
import type { Transaction, Category, TransactionType } from '../types';

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

    // 过滤逻辑
    const filteredTransactions = useMemo(() => {
        let result = transactions;

        // 关键词过滤
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

        // 分类过滤
        if (selectedCategoryId) {
            result = result.filter(t => t.categoryId === selectedCategoryId);
        }

        // 时间过滤
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

    // 按日期分组
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
        if (confirm('确定要删除这笔账单吗？')) {
            await deleteTransaction(id);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto pb-24">
            {/* 顶部搜索和筛选管 */}
            <div className="sticky top-0 bg-[var(--color-bg)]/80 backdrop-blur-md px-4 py-3 space-y-3 z-30 border-b border-[var(--color-border)]/50">
                {/* 第一行：搜索框 */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)]/50 focus-within:border-[var(--color-primary)] transition-all">
                        <Search size={16} className="text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            placeholder="搜索备注或分类..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] border-none focus:ring-0 p-0"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-xl border transition-all ${showFilters ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                    >
                        <Filter size={18} />
                    </button>
                </div>

                {/* 展开的筛选器 */}
                {showFilters && (
                    <div className="space-y-4 py-2 animate-in slide-in-from-top-2 duration-200">
                        {/* 时间筛选 */}
                        <div className="flex flex-wrap gap-2">
                            {(['month', 'lastMonth', 'today', 'all'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${dateRange === range ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}
                                >
                                    {range === 'month' ? '本月' : range === 'lastMonth' ? '上月' : range === 'today' ? '今日' : '全部'}
                                </button>
                            ))}
                        </div>

                        {/* 类型和分类筛选 */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => { setFilterType(undefined); setSelectedCategoryId(undefined); }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${!filterType && !selectedCategoryId ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}
                            >
                                全部类型
                            </button>
                            <button
                                onClick={() => setFilterType('expense')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${filterType === 'expense' ? 'bg-[var(--color-expense)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}
                            >
                                仅支出
                            </button>
                            <button
                                onClick={() => setFilterType('income')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${filterType === 'income' ? 'bg-[var(--color-income)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}
                            >
                                仅收入
                            </button>
                        </div>

                        {/* 快捷分类选择 */}
                        <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                            {categories.filter(c => !filterType || c.type === filterType).map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? undefined : cat.id)}
                                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedCategoryId === cat.id ? 'bg-[var(--color-text)] text-[var(--color-bg)] border-[var(--color-text)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 账单列表 */}
            <div className="px-4 space-y-4">
                {groupedTransactions.length === 0 ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        <p>暂无账单记录</p>
                    </div>
                ) : (
                    groupedTransactions.map((group) => (
                        <div key={group.date}>
                            {/* 日期标题 */}
                            <div className="flex items-center justify-between py-2.5 px-1 sticky top-[57px] bg-[var(--color-bg)] z-10">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-[var(--color-text)]">
                                        {format(parseISO(group.date), 'M月d日 EEEE', { locale: zhCN })}
                                    </span>
                                </div>
                                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                                    {group.expense > 0 && (
                                        <span className="text-[var(--color-expense)] bg-[var(--color-expense)]/10 px-2 py-0.5 rounded-md">
                                            支出 RM{group.expense.toFixed(2)}
                                        </span>
                                    )}
                                    {group.income > 0 && (
                                        <span className="text-[var(--color-income)] bg-[var(--color-income)]/10 px-2 py-0.5 rounded-md">
                                            收入 RM{group.income.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 账单列表 */}
                            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
                                {group.transactions.map((transaction, index) => {
                                    const category = categoryMap.get(transaction.categoryId);
                                    const IconComponent = category
                                        ? (LucideIcons as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>>)[category.icon] || LucideIcons.HelpCircle
                                        : LucideIcons.HelpCircle;

                                    return (
                                        <div
                                            key={transaction.id}
                                            className={`
                        flex items-center gap-3 p-3
                        ${index < group.transactions.length - 1 ? 'border-b border-[var(--color-border)]' : ''}
                      `}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: (category?.color || '#888') + '20' }}
                                            >
                                                <IconComponent size={20} style={{ color: category?.color || '#888' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-[var(--color-text)] truncate">
                                                    {category?.name || '未分类'}
                                                </p>
                                                {transaction.note && (
                                                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                                                        {transaction.note}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`font-semibold shrink-0 ${transaction.type === 'income'
                                                ? 'text-[var(--color-income)]'
                                                : 'text-[var(--color-expense)]'
                                                }`}>
                                                {transaction.type === 'income' ? '+' : '-'}RM{transaction.amount.toFixed(2)}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(transaction.id)}
                                                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-expense)] transition-colors"
                                                aria-label="删除"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
