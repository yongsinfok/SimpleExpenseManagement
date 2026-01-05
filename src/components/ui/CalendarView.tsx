import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useCalendarData } from '../../hooks/useCalendar';
import type { CalendarDay } from '../../hooks/useCalendar';
import {
    getFullMonthName,
    addMonthsToDate,
    subMonthsFromDate,
    formatDate
} from '../../utils/calendar';
import { Card } from './Card';

interface CalendarViewProps {
    selectedDate: string;
    onDateSelect: (dateString: string) => void;
    onMonthChange?: (month: Date) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function CalendarView({ selectedDate, onDateSelect, onMonthChange }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const calendarData = useCalendarData(currentMonth);

    const handlePrevMonth = () => {
        const newMonth = subMonthsFromDate(currentMonth, 1);
        setCurrentMonth(newMonth);
        onMonthChange?.(newMonth);
    };

    const handleNextMonth = () => {
        const newMonth = addMonthsToDate(currentMonth, 1);
        setCurrentMonth(newMonth);
        onMonthChange?.(newMonth);
    };

    const handleToday = () => {
        const today = new Date();
        setCurrentMonth(today);
        onDateSelect(formatDate(today));
        onMonthChange?.(today);
    };

    return (
        <Card padding="lg" shadow="premium" className="overflow-hidden">
            {/* 月份导航 */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrevMonth}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all active:scale-95"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <h3 className="text-lg font-black text-[var(--color-text)] tracking-tight">
                        {getFullMonthName(currentMonth)}
                    </h3>
                    <button
                        onClick={handleNextMonth}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all active:scale-95"
                    >
                        <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                </div>
                <button
                    onClick={handleToday}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-black uppercase tracking-widest hover:bg-[var(--color-primary)]/20 transition-all active:scale-95"
                >
                    <CalendarDays size={14} strokeWidth={2.5} />
                    今天
                </button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day, i) => (
                    <div
                        key={day}
                        className={cn(
                            "text-center text-[10px] font-black uppercase tracking-widest py-2",
                            i === 0 || i === 6 ? "text-[var(--color-expense)]" : "text-[var(--color-text-muted)]"
                        )}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* 日历格子 */}
            <div className="grid grid-cols-7 gap-1">
                {calendarData.map((day) => (
                    <CalendarDayCell
                        key={day.dateString}
                        day={day}
                        isSelected={day.dateString === selectedDate}
                        onClick={() => onDateSelect(day.dateString)}
                    />
                ))}
            </div>
        </Card>
    );
}

interface CalendarDayCellProps {
    day: CalendarDay;
    isSelected: boolean;
    onClick: () => void;
}

function CalendarDayCell({ day, isSelected, onClick }: CalendarDayCellProps) {
    const dayOfMonth = day.date.getDate();

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all p-1",
                !day.isCurrentMonth && "opacity-30",
                day.isToday && !isSelected && "bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/30",
                isSelected && "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30",
                !isSelected && day.isCurrentMonth && "hover:bg-[var(--color-bg-secondary)]",
                day.transactionCount > 0 && !isSelected && "bg-[var(--color-bg-secondary)]/50"
            )}
        >
            {/* 日期数字 */}
            <span className={cn(
                "text-sm font-black",
                isSelected ? "text-white" : day.isToday ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"
            )}>
                {dayOfMonth}
            </span>

            {/* 收支指示点 */}
            {day.transactionCount > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                    {day.hasIncome && (
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSelected ? "bg-white/70" : "bg-[var(--color-income)]"
                        )} />
                    )}
                    {day.hasExpense && (
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSelected ? "bg-white/70" : "bg-[var(--color-expense)]"
                        )} />
                    )}
                </div>
            )}

            {/* 净金额（只在有交易且空间足够时显示） */}
            {day.transactionCount > 0 && day.isCurrentMonth && (
                <span className={cn(
                    "text-[8px] font-bold truncate max-w-full",
                    isSelected
                        ? "text-white/70"
                        : day.netAmount >= 0
                            ? "text-[var(--color-income)]"
                            : "text-[var(--color-expense)]"
                )}>
                    {day.netAmount >= 0 ? '+' : ''}{day.netAmount.toFixed(0)}
                </span>
            )}
        </motion.button>
    );
}
