import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useTransactions, useCategories, useTransactionSummary } from '../hooks/useTransactions';
import type { TransactionType } from '../types';

type ViewType = 'month' | 'year';
type ChartType = 'category' | 'trend';

export function ChartsPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewType, setViewType] = useState<ViewType>('month');
    const [chartType, setChartType] = useState<ChartType>('category');
    const [activeType, setActiveType] = useState<TransactionType>('expense');

    const startDate = format(viewType === 'month' ? startOfMonth(currentDate) : startOfYear(currentDate), 'yyyy-MM-dd');
    const endDate = format(viewType === 'month' ? endOfMonth(currentDate) : endOfYear(currentDate), 'yyyy-MM-dd');

    const transactions = useTransactions({ startDate, endDate });
    const categories = useCategories();
    const summary = useTransactionSummary(transactions);

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // 按分类汇总
    const categoryData = useMemo(() => {
        const filtered = transactions.filter(t => t.type === activeType);
        const totals = filtered.reduce((acc, t) => {
            acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        const totalAmount = activeType === 'expense' ? summary.expense : summary.income;

        return Object.entries(totals)
            .map(([categoryId, amount]) => {
                const category = categoryMap.get(categoryId);
                return {
                    id: categoryId,
                    name: category?.name || '未知',
                    value: amount,
                    color: category?.color || '#888',
                    icon: category?.icon || 'HelpCircle',
                    percentage: totalAmount > 0 ? (amount / totalAmount * 100).toFixed(1) : '0'
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [transactions, categoryMap, summary.expense, summary.income, activeType]);

    // 按日期/月份汇总
    const trendData = useMemo(() => {
        if (viewType === 'month') {
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
        } else {
            // 年视图按月汇总
            const monthly = transactions.reduce((acc, t) => {
                const monthStr = format(new Date(t.date), 'yyyy-MM');
                if (!acc[monthStr]) {
                    acc[monthStr] = { date: monthStr, income: 0, expense: 0 };
                }
                if (t.type === 'income') {
                    acc[monthStr].income += t.amount;
                } else {
                    acc[monthStr].expense += t.amount;
                }
                return acc;
            }, {} as Record<string, { date: string; income: number; expense: number }>);
            return Object.values(monthly).sort((a, b) => a.date.localeCompare(b.date));
        }
    }, [transactions, viewType]);

    const handlePrev = () => {
        setCurrentDate(prev => viewType === 'month' ? subMonths(prev, 1) : subYears(prev, 1));
    };

    const handleNext = () => {
        setCurrentDate(prev => {
            const next = new Date(prev);
            if (viewType === 'month') next.setMonth(next.getMonth() + 1);
            else next.setFullYear(next.getFullYear() + 1);

            if (next > new Date()) return prev;
            return next;
        });
    };

    const exportToCSV = () => {
        const headers = ['日期', '类型', '分类', '金额', '备注'];
        const rows = transactions.map(t => [
            t.date,
            t.type === 'income' ? '收入' : '支出',
            categoryMap.get(t.categoryId)?.name || '未知',
            t.amount.toString(),
            t.note || ''
        ]);

        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `账单报表_${format(currentDate, viewType === 'month' ? 'yyyy-MM' : 'yyyy')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4 animate-in fade-in duration-300">
            {/* 时间视图切换 */}
            <div className="flex p-1 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)]/50">
                <button
                    onClick={() => setViewType('month')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewType === 'month' ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                >
                    月视图
                </button>
                <button
                    onClick={() => setViewType('year')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewType === 'year' ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                >
                    年视图
                </button>
            </div>

            {/* 时间选择和导出 */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 flex items-center justify-between bg-[var(--color-bg-card)] rounded-2xl p-2 shadow-sm border border-[var(--color-border)]/50">
                    <button onClick={handlePrev} className="p-2 rounded-xl hover:bg-[var(--color-bg-secondary)]"><ChevronLeft size={18} /></button>
                    <span className="font-extrabold text-[var(--color-text)]">
                        {format(currentDate, viewType === 'month' ? 'yyyy年M月' : 'yyyy年', { locale: zhCN })}
                    </span>
                    <button onClick={handleNext} disabled={currentDate >= new Date()} className="p-2 rounded-xl hover:bg-[var(--color-bg-secondary)] disabled:opacity-20"><ChevronRight size={18} /></button>
                </div>
                <button
                    onClick={exportToCSV}
                    className="p-3.5 bg-[var(--color-bg-card)] text-[var(--color-primary)] rounded-2xl shadow-sm border border-[var(--color-border)]/50 active:scale-95 transition-all">
                    <Download size={20} />
                </button>
            </div>

            {/* 高级汇总卡片 */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]/50 relative overflow-hidden group">
                    <div className="absolute -right-2 -top-2 text-[var(--color-expense)]/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrendingDown size={64} />
                    </div>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">总支出</p>
                    <p className="text-xl font-black text-[var(--color-expense)]">RM {summary.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]/50 relative overflow-hidden group">
                    <div className="absolute -right-2 -bottom-2 text-[var(--color-income)]/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrendingUp size={64} />
                    </div>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">总收入</p>
                    <p className="text-xl font-black text-[var(--color-income)]">RM {summary.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* 功能切换 */}
            <div className="flex gap-2">
                <button
                    onClick={() => setChartType('category')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${chartType === 'category' ? 'bg-[var(--color-text)] text-[var(--color-bg)]' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'}`}
                >
                    分类
                </button>
                <button
                    onClick={() => setChartType('trend')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${chartType === 'trend' ? 'bg-[var(--color-text)] text-[var(--color-bg)]' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'}`}
                >
                    趋势
                </button>
            </div>

            {/* 图表内容 */}
            <div className="bg-[var(--color-bg-card)] rounded-3xl p-5 shadow-sm border border-[var(--color-border)]/50 min-h-[400px]">
                {chartType === 'category' ? (
                    <>
                        <div className="flex justify-center gap-4 mb-6">
                            <button
                                onClick={() => setActiveType('expense')}
                                className={`text-xs font-bold pb-1 border-b-2 transition-all ${activeType === 'expense' ? 'border-[var(--color-expense)] text-[var(--color-expense)]' : 'border-transparent text-[var(--color-text-muted)]'}`}
                            >支出</button>
                            <button
                                onClick={() => setActiveType('income')}
                                className={`text-xs font-bold pb-1 border-b-2 transition-all ${activeType === 'income' ? 'border-[var(--color-income)] text-[var(--color-income)]' : 'border-transparent text-[var(--color-text-muted)]'}`}
                            >收入</button>
                        </div>
                        {categoryData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] opacity-50">
                                <Calendar size={48} className="mb-2" />
                                <p className="text-sm font-medium">暂无{activeType === 'income' ? '收入' : '支出'}记录</p>
                            </div>
                        ) : (
                            <>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={4}
                                            >
                                                {categoryData.map((entry) => (
                                                    <Cell key={entry.id} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', borderColor: 'var(--color-border)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                formatter={(value: number) => [`RM${value.toFixed(2)}`, '金额']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-8 space-y-4">
                                    {categoryData.map((item) => {
                                        const Icon = (LucideIcons as any)[item.icon] || LucideIcons.HelpCircle;
                                        return (
                                            <div key={item.id} className="group">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + '15' }}>
                                                        <Icon size={16} style={{ color: item.color }} />
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-between">
                                                        <span className="text-sm font-bold text-[var(--color-text)]">{item.name}</span>
                                                        <span className="text-sm font-black text-[var(--color-text)]">RM {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-right text-[var(--color-text-muted)] mt-1 font-bold">{item.percentage}%</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="h-80 w-full">
                        {trendData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] opacity-50">
                                <Calendar size={48} className="mb-2" />
                                <p className="text-sm font-medium">暂无趋势记录</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--color-text-muted)' }}
                                        tickFormatter={(val) => viewType === 'month' ? format(parseISO(val), 'd') : format(new Date(val), 'M月')}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ fill: 'var(--color-bg-secondary)', opacity: 0.4 }}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                                        labelFormatter={(val) => viewType === 'month' ? format(parseISO(val), 'M月d日') : format(new Date(val), 'yyyy年M月')}
                                    />
                                    <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} barSize={viewType === 'month' ? 8 : 20} />
                                    <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} barSize={viewType === 'month' ? 8 : 20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
