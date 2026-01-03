import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, Filter, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTransactions, useCategories, useDeleteTransaction } from '../hooks/useTransactions';
import type { Transaction, Category, TransactionType } from '../types';

export function BillsPage() {
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterType, setFilterType] = useState<TransactionType | undefined>();
    const transactions = useTransactions({ type: filterType });
    const categories = useCategories();
    const { deleteTransaction } = useDeleteTransaction();

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // 按日期分组
    const groupedTransactions = useMemo(() => {
        // 先过滤
        let filtered = transactions;
        if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();
            filtered = transactions.filter(t => {
                const category = categoryMap.get(t.categoryId);
                return (
                    category?.name.toLowerCase().includes(keyword) ||
                    t.note?.toLowerCase().includes(keyword)
                );
            });
        }

        // 按日期分组
        const grouped = filtered.reduce((acc, transaction) => {
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
    }, [transactions, searchKeyword, categoryMap]);

    const handleDelete = async (id: string) => {
        if (confirm('确定要删除这笔账单吗？')) {
            await deleteTransaction(id);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto pb-24">
            {/* 搜索和筛选 */}
            <div className="sticky top-0 bg-[var(--color-bg)] px-4 py-3 space-y-3 z-10">
                {/* 搜索框 */}
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)]">
                    <Search size={18} className="text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        placeholder="搜索分类或备注..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="flex-1 bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                    />
                </div>

                {/* 类型筛选 */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType(undefined)}
                        className={`px-4 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-colors ${!filterType
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                            }`}
                    >
                        全部
                    </button>
                    <button
                        onClick={() => setFilterType('expense')}
                        className={`px-4 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-colors ${filterType === 'expense'
                            ? 'bg-[var(--color-expense)] text-white'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                            }`}
                    >
                        支出
                    </button>
                    <button
                        onClick={() => setFilterType('income')}
                        className={`px-4 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-colors ${filterType === 'income'
                            ? 'bg-[var(--color-income)] text-white'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                            }`}
                    >
                        收入
                    </button>
                </div>
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
                            <div className="flex items-center justify-between py-2 sticky top-24 bg-[var(--color-bg)] z-5">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[var(--color-text)]">
                                        {format(parseISO(group.date), 'M月d日 EEEE', { locale: zhCN })}
                                    </span>
                                </div>
                                <div className="flex gap-3 text-sm">
                                    {group.expense > 0 && (
                                        <span className="text-[var(--color-expense)]">
                                            支出 RM{group.expense.toFixed(2)}
                                        </span>
                                    )}
                                    {group.income > 0 && (
                                        <span className="text-[var(--color-income)]">
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
