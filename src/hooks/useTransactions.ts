import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    db,
    transactionOperations,
    categoryOperations,
    accountOperations,
    initializeDefaultData
} from '../db/database';
import type { Transaction, Category, Account, TransactionFormData, TransactionType } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

// 初始化Hook
export function useInitializeData() {
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        initializeDefaultData()
            .then(() => setIsInitialized(true))
            .catch((err) => {
                console.error('Failed to initialize data:', err);
                setError(err);
            });
    }, []);

    return { isInitialized, error };
}

// 账单列表Hook
export function useTransactions(filter?: {
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
    categoryId?: string;
}) {
    const transactions = useLiveQuery(async () => {
        let query = db.transactions.orderBy('date').reverse();

        const all = await query.toArray();

        return all.filter(t => {
            if (filter?.type && t.type !== filter.type) return false;
            if (filter?.categoryId && t.categoryId !== filter.categoryId) return false;
            if (filter?.startDate && t.date < filter.startDate) return false;
            if (filter?.endDate && t.date > filter.endDate) return false;
            return true;
        });
    }, [filter?.type, filter?.startDate, filter?.endDate, filter?.categoryId]);

    return transactions ?? [];
}

// 今日账单Hook
export function useTodayTransactions() {
    const today = format(new Date(), 'yyyy-MM-dd');
    return useTransactions({ startDate: today, endDate: today });
}

// 本月账单Hook
export function useMonthTransactions(date: Date = new Date()) {
    const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(date), 'yyyy-MM-dd');
    return useTransactions({ startDate, endDate });
}

// 账单汇总Hook
export function useTransactionSummary(transactions: Transaction[]) {
    const summary = {
        income: 0,
        expense: 0,
        balance: 0,
        count: transactions.length
    };

    transactions.forEach(t => {
        if (t.type === 'income') {
            summary.income += t.amount;
        } else {
            summary.expense += t.amount;
        }
    });

    summary.balance = summary.income - summary.expense;

    return summary;
}

// 分类列表Hook
export function useCategories(type?: TransactionType) {
    const categories = useLiveQuery(async () => {
        if (type) {
            return categoryOperations.getByType(type);
        }
        return categoryOperations.getAll();
    }, [type]);

    return categories ?? [];
}

// 账户列表Hook
export function useAccounts() {
    const accounts = useLiveQuery(() => accountOperations.getAll());
    return accounts ?? [];
}

// 添加账单Hook
export function useAddTransaction() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const addTransaction = useCallback(async (data: TransactionFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const id = await transactionOperations.add({
                type: data.type,
                amount: data.amount,
                categoryId: data.categoryId,
                accountId: data.accountId,
                date: data.date,
                note: data.note || undefined
            });

            // 更新账户余额
            await accountOperations.updateBalance(data.accountId, data.amount, data.type === 'income');

            return id;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('添加失败');
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { addTransaction, isLoading, error };
}

// 删除账单Hook
export function useDeleteTransaction() {
    const [isLoading, setIsLoading] = useState(false);

    const deleteTransaction = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const transaction = await transactionOperations.getById(id);
            if (transaction) {
                // 恢复账户余额
                await accountOperations.updateBalance(
                    transaction.accountId,
                    transaction.amount,
                    transaction.type !== 'income' // 反向操作
                );
                await transactionOperations.delete(id);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { deleteTransaction, isLoading };
}

// 按日期分组账单
export function useGroupedTransactions(transactions: Transaction[]) {
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        categoryOperations.getAll().then(setCategories);
    }, []);

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const grouped = transactions.reduce((acc, transaction) => {
        const date = transaction.date;
        if (!acc[date]) {
            acc[date] = {
                date,
                transactions: [],
                income: 0,
                expense: 0
            };
        }
        acc[date].transactions.push({
            ...transaction,
            category: categoryMap.get(transaction.categoryId)
        });
        if (transaction.type === 'income') {
            acc[date].income += transaction.amount;
        } else {
            acc[date].expense += transaction.amount;
        }
        return acc;
    }, {} as Record<string, {
        date: string;
        transactions: (Transaction & { category?: Category })[];
        income: number;
        expense: number
    }>);

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
}
