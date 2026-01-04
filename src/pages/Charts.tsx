import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, Calendar, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactions, useCategories, useTransactionSummary } from '../hooks/useTransactions';
import { getIcon } from '../utils/icons';
import { Card, Button } from '../components/ui';
import { cn } from '../utils/cn';
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

    const categoryData = useMemo(() => {
        const filtered = transactions.filter(t => t.type === activeType);
        const totals = filtered.reduce((acc, t) => {
            if (t.categoryId) {
                acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
            }
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
        link.setAttribute("download", `报表_${format(currentDate, viewType === 'month' ? 'yyyy-MM' : 'yyyy')}.csv`);
        link.click();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto pb-28 px-4 pt-6 space-y-6 hide-scrollbar"
        >
            {/* Nav Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center justify-between glass rounded-2xl p-1.5 px-3">
                    <button onClick={handlePrev} className="p-2.5 rounded-xl hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest leading-none mb-1">
                            {viewType === 'month' ? '月度报表' : '年度报表'}
                        </span>
                        <span className="text-base font-black text-[var(--color-text)] tracking-tight">
                            {format(currentDate, viewType === 'month' ? 'yyyy年 M月' : 'yyyy年', { locale: zhCN })}
                        </span>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={currentDate >= new Date()}
                        className="p-2.5 rounded-xl hover:bg-[var(--color-bg-secondary)] disabled:opacity-0 transition-opacity"
                    >
                        <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <Button variant="glass" size="md" className="w-12 h-12 p-0 rounded-2xl" onClick={exportToCSV}>
                    <Download size={20} strokeWidth={2.5} />
                </Button>
            </div>

            {/* View Selectors */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex p-1 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]/50">
                    <button
                        onClick={() => setViewType('month')}
                        className={cn(
                            "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all",
                            viewType === 'month' ? "bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)]"
                        )}
                    >月</button>
                    <button
                        onClick={() => setViewType('year')}
                        className={cn(
                            "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all",
                            viewType === 'year' ? "bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)]"
                        )}
                    >年</button>
                </div>

                <div className="flex p-1 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]/50">
                    <button
                        onClick={() => setChartType('category')}
                        className={cn(
                            "flex-1 flex items-center justify-center py-2 rounded-xl transition-all",
                            chartType === 'category' ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)]"
                        )}
                    >
                        <PieChartIcon size={16} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setChartType('trend')}
                        className={cn(
                            "flex-1 flex items-center justify-center py-2 rounded-xl transition-all",
                            chartType === 'trend' ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)]"
                        )}
                    >
                        <BarChart3 size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Summaries */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="hover:border-[var(--color-expense)] border-transparent" shadow="md">
                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-2">统计支出</p>
                    <p className="text-xl font-black text-[var(--color-expense)] tracking-tighter">
                        <span className="text-xs opacity-50 mr-1">RM</span>
                        {summary.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </Card>
                <Card className="hover:border-[var(--color-income)] border-transparent" shadow="md">
                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-2">统计收入</p>
                    <p className="text-xl font-black text-[var(--color-income)] tracking-tighter">
                        <span className="text-xs opacity-50 mr-1">RM</span>
                        {summary.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </Card>
            </div>

            {/* Main Chart Container */}
            <Card shadow="premium" padding="lg" className="min-h-[420px] relative overflow-hidden">
                <AnimatePresence mode="wait">
                    {chartType === 'category' ? (
                        <motion.div
                            key="category"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex p-1 bg-[var(--color-bg-secondary)] rounded-xl w-32 mx-auto">
                                <button
                                    onClick={() => setActiveType('expense')}
                                    className={cn(
                                        "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all",
                                        activeType === 'expense' ? "bg-[var(--color-expense)] text-white shadow-md shadow-[var(--color-expense)]/20" : "text-[var(--color-text-muted)]"
                                    )}
                                >支出</button>
                                <button
                                    onClick={() => setActiveType('income')}
                                    className={cn(
                                        "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all",
                                        activeType === 'income' ? "bg-[var(--color-income)] text-white shadow-md shadow-[var(--color-income)]/20" : "text-[var(--color-text-muted)]"
                                    )}
                                >收入</button>
                            </div>

                            {categoryData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)] opacity-50">
                                    <Calendar size={48} strokeWidth={1.5} className="mb-4" />
                                    <p className="text-sm font-bold">本时段暂无相关记录</p>
                                </div>
                            ) : (
                                <>
                                    <div className="h-64 relative">
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">总额</p>
                                                <p className="text-xl font-black text-[var(--color-text)] tracking-tighter">
                                                    RM {(activeType === 'expense' ? summary.expense : summary.income).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryData}
                                                    dataKey="value"
                                                    innerRadius={75}
                                                    outerRadius={95}
                                                    paddingAngle={6}
                                                    stroke="none"
                                                >
                                                    {categoryData.map((entry) => (
                                                        <Cell key={entry.id} fill={entry.color} fillOpacity={0.8} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                                                    itemStyle={{ fontSize: '11px', fontWeight: '900' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-[var(--color-border)]/50">
                                        {categoryData.map((item, index) => {
                                            const Icon = getIcon(item.icon);
                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="space-y-2"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: item.color + '15' }}>
                                                            <Icon size={18} style={{ color: item.color }} strokeWidth={2.5} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-sm font-bold text-[var(--color-text)] tracking-tight">{item.name}</span>
                                                                <span className="text-sm font-black text-[var(--color-text)] tracking-tighter">RM {item.value.toLocaleString()}</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${item.percentage}%` }}
                                                                    transition={{ duration: 1, delay: 0.2 }}
                                                                    className="h-full rounded-full"
                                                                    style={{ backgroundColor: item.color }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="w-10 text-right">
                                                            <span className="text-[10px] font-black text-[var(--color-text-muted)] tracking-tighter">{item.percentage}%</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="trend"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-96 w-full pt-10"
                        >
                            {trendData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] opacity-50">
                                    <Calendar size={48} strokeWidth={1.5} className="mb-4" />
                                    <p className="text-sm font-bold">尚无数据趋势</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trendData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: '900', fill: 'var(--color-text-muted)' }}
                                            tickFormatter={(val) => viewType === 'month' ? format(parseISO(val), 'd') : format(new Date(val), 'M月')}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={false} />
                                        <Tooltip
                                            cursor={{ fill: 'var(--color-bg-secondary)', radius: 8 }}
                                            contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="expense" fill="var(--color-expense)" radius={[6, 6, 0, 0]} barSize={viewType === 'month' ? 10 : 24} fillOpacity={0.8} />
                                        <Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 0, 0]} barSize={viewType === 'month' ? 10 : 24} fillOpacity={0.8} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}

