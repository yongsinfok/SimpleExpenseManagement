import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameDay,
    isSameMonth,
    isToday as dateFnsIsToday,
    subDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 获取月份中的所有天数（包括前后月份的填充天）
 */
export function getCalendarDays(year: number, month: number): Date[] {
    const date = new Date(year, month, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 周日开始
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let current = calendarStart;
    while (current <= calendarEnd) {
        days.push(current);
        current = addDays(current, 1);
    }
    return days;
}

/**
 * 获取月份中的实际天数
 */
export function getDaysInMonth(year: number, month: number): Date[] {
    const date = new Date(year, month, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const days: Date[] = [];
    let current = monthStart;
    while (current <= monthEnd) {
        days.push(current);
        current = addDays(current, 1);
    }
    return days;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/**
 * 格式化日期为显示格式
 */
export function formatDisplayDate(date: Date): string {
    return format(date, 'yyyy年M月d日 EEEE', { locale: zhCN });
}

/**
 * 检查是否是今天
 */
export function isToday(date: Date): boolean {
    return dateFnsIsToday(date);
}

/**
 * 检查两个日期是否在同一月份
 */
export function isSameMonthDate(date1: Date, date2: Date): boolean {
    return isSameMonth(date1, date2);
}

/**
 * 检查两个日期是否是同一天
 */
export function isSameDayDate(date1: Date, date2: Date): boolean {
    return isSameDay(date1, date2);
}

/**
 * 获取月份名称
 */
export function getMonthName(date: Date): string {
    return format(date, 'M月', { locale: zhCN });
}

/**
 * 获取完整月份名称
 */
export function getFullMonthName(date: Date): string {
    return format(date, 'yyyy年M月', { locale: zhCN });
}

/**
 * 获取年份
 */
export function getYear(date: Date): number {
    return date.getFullYear();
}

/**
 * 增加月份
 */
export function addMonthsToDate(date: Date, months: number): Date {
    return addMonths(date, months);
}

/**
 * 减少月份
 */
export function subMonthsFromDate(date: Date, months: number): Date {
    return subMonths(date, months);
}

/**
 * 获取过滤器预设的日期范围
 */
export interface DateRange {
    start: string;
    end: string;
}

export interface FilterPreset {
    id: string;
    label: string;
    getDateRange: () => DateRange;
}

export const filterPresets: FilterPreset[] = [
    {
        id: 'all',
        label: '全部',
        getDateRange: () => ({
            start: '1970-01-01',
            end: formatDate(addDays(new Date(), 365 * 10)),
        }),
    },
    {
        id: 'today',
        label: '今天',
        getDateRange: () => {
            const today = formatDate(new Date());
            return { start: today, end: today };
        },
    },
    {
        id: 'thisWeek',
        label: '本周',
        getDateRange: () => ({
            start: formatDate(startOfWeek(new Date(), { weekStartsOn: 1 })),
            end: formatDate(endOfWeek(new Date(), { weekStartsOn: 1 })),
        }),
    },
    {
        id: 'thisMonth',
        label: '本月',
        getDateRange: () => ({
            start: formatDate(startOfMonth(new Date())),
            end: formatDate(endOfMonth(new Date())),
        }),
    },
    {
        id: 'lastMonth',
        label: '上月',
        getDateRange: () => {
            const lastMonth = subMonths(new Date(), 1);
            return {
                start: formatDate(startOfMonth(lastMonth)),
                end: formatDate(endOfMonth(lastMonth)),
            };
        },
    },
    {
        id: 'last7Days',
        label: '近7天',
        getDateRange: () => ({
            start: formatDate(subDays(new Date(), 6)),
            end: formatDate(new Date()),
        }),
    },
    {
        id: 'last30Days',
        label: '近30天',
        getDateRange: () => ({
            start: formatDate(subDays(new Date(), 29)),
            end: formatDate(new Date()),
        }),
    },
];
