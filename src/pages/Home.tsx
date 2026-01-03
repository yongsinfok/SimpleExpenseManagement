import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardHeader } from '../components/ui';
import { useMonthTransactions, useTransactionSummary, useTodayTransactions, useCategories, useGroupedTransactions } from '../hooks/useTransactions';
import type { Transaction, Category } from '../types';

interface HomePageProps {
    onViewAllBills: () => void;
}

export function HomePage({ onViewAllBills }: HomePageProps) {
    const monthTransactions = useMonthTransactions();
    const todayTransactions = useTodayTransactions();
    const monthSummary = useTransactionSummary(monthTransactions);
    const todaySummary = useTransactionSummary(todayTransactions);
    const categories = useCategories();

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // 获取今天的前5笔账单
    const recentTransactions = todayTransactions.slice(0, 5);

    return (
        <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4">
            {/* 月度统计卡片 */}
            <Card className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white overflow-hidden">
                <div className="p-5">
                    <p className="text-white/80 text-sm mb-1">
                        {format(new Date(), 'yyyy年M月', { locale: zhCN })}
                    </p>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                        {/* 支出 */}
                        <div>
                            <p className="text-white/70 text-xs mb-1">支出</p>
                            <p className="text-xl font-bold">
                                RM{monthSummary.expense.toFixed(2)}
                            </p>
                        </div>

                        {/* 收入 */}
                        <div>
                            <p className="text-white/70 text-xs mb-1">收入</p>
                            <p className="text-xl font-bold">
                                RM{monthSummary.income.toFixed(2)}
                            </p>
                        </div>

                        {/* 结余 */}
                        <div>
                            <p className="text-white/70 text-xs mb-1">结余</p>
                            <p className={`text-xl font-bold ${monthSummary.balance >= 0 ? '' : 'text-red-300'}`}>
                                RM{monthSummary.balance.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 今日统计 */}
            <div className="grid grid-cols-2 gap-3">
                <Card padding="sm">
                    <div className="flex items-center gap-3 p-2">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <TrendingDown size={20} className="text-[var(--color-expense)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">今日支出</p>
                            <p className="text-lg font-semibold text-[var(--color-expense)]">
                                RM{todaySummary.expense.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card padding="sm">
                    <div className="flex items-center gap-3 p-2">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <TrendingUp size={20} className="text-[var(--color-income)]" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">今日收入</p>
                            <p className="text-lg font-semibold text-[var(--color-income)]">
                                RM{todaySummary.income.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 今日账单 */}
            <Card>
                <CardHeader
                    title="今日账单"
                    subtitle={`共${todayTransactions.length}笔`}
                    action={
                        todayTransactions.length > 0 && (
                            <button
                                onClick={onViewAllBills}
                                className="text-sm text-[var(--color-primary)] flex items-center gap-1"
                            >
                                查看全部 <ArrowRight size={14} />
                            </button>
                        )
                    }
                />

                {recentTransactions.length === 0 ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                        <p>今天还没有记账哦</p>
                        <p className="text-sm mt-1">点击下方按钮开始记录</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentTransactions.map((transaction) => {
                            const category = categoryMap.get(transaction.categoryId);
                            const IconComponent = category
                                ? (LucideIcons as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>>)[category.icon] || LucideIcons.HelpCircle
                                : LucideIcons.HelpCircle;

                            return (
                                <div
                                    key={transaction.id}
                                    className="flex items-center gap-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
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
                                    <span className={`font-semibold ${transaction.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}`}>
                                        {transaction.type === 'income' ? '+' : '-'}RM{transaction.amount.toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}
