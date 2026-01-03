import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useTransactions, useCategories, useTransactionSummary } from '../hooks/useTransactions';

type ViewType = 'month' | 'year';
type ChartType = 'category' | 'trend';

export function ChartsPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewType, setViewType] = useState<ViewType>('month');
    const [chartType, setChartType] = useState<ChartType>('category');

    const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    const transactions = useTransactions({ startDate, endDate });
    const categories = useCategories('expense');
    const summary = useTransactionSummary(transactions);

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // 按分类汇总支出
    const categoryData = useMemo(() => {
        const expenseTransactions = transactions.filter(t => t.type === 'expense');
        const totals = expenseTransactions.reduce((acc, t) => {
            acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(totals)
            .map(([categoryId, amount]) => {
                const category = categoryMap.get(categoryId);
                return {
                    id: categoryId,
                    name: category?.name || '未知',
                    value: amount,
                    color: category?.color || '#888',
                    icon: category?.icon || 'HelpCircle',
                    percentage: summary.expense > 0 ? (amount / summary.expense * 100).toFixed(1) : '0'
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [transactions, categoryMap, summary.expense]);

    // 按日期汇总
    const dailyData = useMemo(() => {
        const daily = transactions.reduce((acc, t) => {
            const date = t.date;
            if (!acc[date]) {
                acc[date] = { date, income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                acc[date].income += t.amount;
            } else {
                acc[date].expense += t.amount;
            }
            return acc;
        }, {} as Record<string, { date: string; income: number; expense: number }>);

        return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
    }, [transactions]);

    const handlePrevMonth = () => {
        setCurrentDate(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + 1);
            if (next > new Date()) return prev;
            return next;
        });
    };

    return (
        <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4">
            {/* 月份选择器 */}
            <div className="flex items-center justify-between bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
                <button
                    onClick={handlePrevMonth}
                    className="p-2 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                    <ChevronLeft size={20} className="text-[var(--color-text)]" />
                </button>
                <span className="font-semibold text-lg text-[var(--color-text)]">
                    {format(currentDate, 'yyyy年M月', { locale: zhCN })}
                </span>
                <button
                    onClick={handleNextMonth}
                    className="p-2 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                    disabled={currentDate >= new Date()}
                >
                    <ChevronRight size={20} className={currentDate >= new Date() ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'} />
                </button>
            </div>

            {/* 收支汇总 */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 text-center shadow-[var(--shadow-sm)]">
                    <p className="text-xs text-[var(--color-text-secondary)]">支出</p>
                    <p className="text-lg font-bold text-[var(--color-expense)]">
                        RM{summary.expense.toFixed(2)}
                    </p>
                </div>
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 text-center shadow-[var(--shadow-sm)]">
                    <p className="text-xs text-[var(--color-text-secondary)]">收入</p>
                    <p className="text-lg font-bold text-[var(--color-income)]">
                        RM{summary.income.toFixed(2)}
                    </p>
                </div>
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 text-center shadow-[var(--shadow-sm)]">
                    <p className="text-xs text-[var(--color-text-secondary)]">结余</p>
                    <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'}`}>
                        RM{summary.balance.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* 图表类型切换 */}
            <div className="flex gap-2">
                <button
                    onClick={() => setChartType('category')}
                    className={`flex-1 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${chartType === 'category'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                        }`}
                >
                    分类占比
                </button>
                <button
                    onClick={() => setChartType('trend')}
                    className={`flex-1 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${chartType === 'trend'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                        }`}
                >
                    收支趋势
                </button>
            </div>

            {/* 图表区域 */}
            {chartType === 'category' ? (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
                    {categoryData.length === 0 ? (
                        <div className="text-center py-12 text-[var(--color-text-muted)]">
                            暂无支出数据
                        </div>
                    ) : (
                        <>
                            {/* 饼图 */}
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                        >
                                            {categoryData.map((entry) => (
                                                <Cell key={entry.id} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => [`RM${value.toFixed(2)}`, '金额']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* 分类列表 */}
                            <div className="mt-4 space-y-2">
                                {categoryData.map((item) => {
                                    const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>>)[item.icon] || LucideIcons.HelpCircle;

                                    return (
                                        <div key={item.id} className="flex items-center gap-3 p-2">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: item.color + '20' }}
                                            >
                                                <IconComponent size={16} style={{ color: item.color }} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-[var(--color-text)]">{item.name}</span>
                                                    <span className="text-[var(--color-text)]">RM{item.value.toFixed(2)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1.5 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${item.percentage}%`,
                                                                backgroundColor: item.color
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-[var(--color-text-secondary)] w-12 text-right">
                                                        {item.percentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
                    {dailyData.length === 0 ? (
                        <div className="text-center py-12 text-[var(--color-text-muted)]">
                            暂无数据
                        </div>
                    ) : (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyData}>
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => format(new Date(date), 'd日')}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(value) => `RM${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: number, name: string) => [
                                            `RM${value.toFixed(2)}`,
                                            name === 'expense' ? '支出' : '收入'
                                        ]}
                                        labelFormatter={(date) => format(new Date(date), 'M月d日')}
                                    />
                                    <Legend formatter={(value) => value === 'expense' ? '支出' : '收入'} />
                                    <Bar dataKey="expense" fill="var(--color-expense)" name="expense" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="income" fill="var(--color-income)" name="income" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
