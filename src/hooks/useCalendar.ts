import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import {
    db,
    transactionOperations,
    accountOperations,
} from '../db/database';
import type { Transaction } from '../types';
import { formatDate, getCalendarDays, isSameMonthDate } from '../utils/calendar';
import { startOfMonth, endOfMonth, format } from 'date-fns';

/**
 * 日历单元格数据
 */
export interface CalendarDay {
    date: Date;
    dateString: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    hasIncome: boolean;
    hasExpense: boolean;
    netAmount: number;
    transactionCount: number;
    incomeTotal: number;
    expenseTotal: number;
}

/**
 * 获取日历数据 Hook
 */
export function useCalendarData(month: Date) {
    const startDate = format(startOfMonth(month), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

    const transactions = useLiveQuery(async () => {
        return db.transactions
            .where('date')
            .between(startDate, endDate, true, true)
            .toArray();
    }, [startDate, endDate]);

    const calendarData = useMemo(() => {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const days = getCalendarDays(year, monthIndex);
        const today = new Date();

        // 按日期分组交易
        const transactionsByDate = new Map<string, Transaction[]>();
        (transactions ?? []).forEach((t) => {
            const existing = transactionsByDate.get(t.date) || [];
            existing.push(t);
            transactionsByDate.set(t.date, existing);
        });

        return days.map((date): CalendarDay => {
            const dateString = formatDate(date);
            const dayTransactions = transactionsByDate.get(dateString) || [];

            let incomeTotal = 0;
            let expenseTotal = 0;
            dayTransactions.forEach((t) => {
                if (t.type === 'income') {
                    incomeTotal += t.amount;
                } else {
                    expenseTotal += t.amount;
                }
            });

            return {
                date,
                dateString,
                isCurrentMonth: isSameMonthDate(date, month),
                isToday: formatDate(date) === formatDate(today),
                hasIncome: incomeTotal > 0,
                hasExpense: expenseTotal > 0,
                netAmount: incomeTotal - expenseTotal,
                transactionCount: dayTransactions.length,
                incomeTotal,
                expenseTotal,
            };
        });
    }, [month, transactions]);

    return calendarData;
}

/**
 * 更新交易 Hook
 */
export function useUpdateTransaction() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const updateTransaction = useCallback(async (
        id: string,
        updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            // 获取原交易
            const oldTransaction = await transactionOperations.getById(id);
            if (!oldTransaction) {
                throw new Error('交易记录不存在');
            }

            const oldAmount = oldTransaction.amount;
            const oldAccountId = oldTransaction.accountId;
            const oldType = oldTransaction.type;

            const newAmount = updates.amount ?? oldAmount;
            const newAccountId = updates.accountId ?? oldAccountId;
            const newType = updates.type ?? oldType;

            // 处理余额调整
            if (oldAccountId !== newAccountId || oldAmount !== newAmount || oldType !== newType) {
                // 恢复旧账户的余额
                await accountOperations.updateBalance(
                    oldAccountId,
                    oldAmount,
                    oldType !== 'income' // 反向操作
                );

                // 应用新账户的余额
                await accountOperations.updateBalance(
                    newAccountId,
                    newAmount,
                    newType === 'income'
                );
            }

            // 更新交易
            await transactionOperations.update(id, updates);

            return true;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('更新失败');
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { updateTransaction, isLoading, error };
}

/**
 * 批量删除交易 Hook
 */
export function useBulkDeleteTransactions() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const bulkDelete = useCallback(async (ids: string[]) => {
        setIsLoading(true);
        setError(null);

        try {
            for (const id of ids) {
                const transaction = await transactionOperations.getById(id);
                if (transaction) {
                    // 恢复账户余额
                    await accountOperations.updateBalance(
                        transaction.accountId,
                        transaction.amount,
                        transaction.type !== 'income' // 反向操作
                    );
                    // 删除交易
                    await transactionOperations.delete(id);
                }
            }
            return ids.length;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('批量删除失败');
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { bulkDelete, isLoading, error };
}
