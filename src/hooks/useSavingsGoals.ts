import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useCallback, useEffect } from 'react';
import { savingsGoalOperations, db, getSettings, saveSettings } from '../db/database';
import type { SavingsGoal } from '../types';
import { format, subMonths, parseISO, addMonths } from 'date-fns';

const MAX_NAME_LENGTH = 20;

function validateGoalName(name: string | undefined): void {
    if (name !== undefined && name.trim() === '') {
        throw new Error('目标名称不能为空');
    }
    if (name !== undefined && name.length > MAX_NAME_LENGTH) {
        throw new Error(`目标名称不能超过 ${MAX_NAME_LENGTH} 个字符`);
    }
}

function validateTargetAmount(amount: number | undefined): void {
    if (amount !== undefined && amount <= 0) {
        throw new Error('目标金额必须大于 0');
    }
}

async function calculateNetSavings(startDate: string): Promise<number> {
    const allTransactions = await db.transactions.toArray();
    let netSavings = 0;

    for (const transaction of allTransactions) {
        if (transaction.date >= startDate) {
            if (transaction.type === 'income') {
                netSavings += transaction.amount;
            } else {
                netSavings -= transaction.amount;
            }
        }
    }

    return netSavings;
}

async function updateAllGoalsProgress(): Promise<void> {
    const settings = getSettings();
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastUpdate = settings.savingsGoalsLastUpdate;

    if (lastUpdate === today) {
        return;
    }

    const goals = await savingsGoalOperations.getActive();

    for (const goal of goals) {
        const netSavings = await calculateNetSavings(goal.startDate);
        await savingsGoalOperations.updateProgress(goal.id, netSavings);
    }

    saveSettings({ ...settings, savingsGoalsLastUpdate: today });
}

export function useSavingsGoals() {
    const goals = useLiveQuery(() => savingsGoalOperations.getAll());
    return goals ?? [];
}

export function useActiveSavingsGoals() {
    const goals = useLiveQuery(() => savingsGoalOperations.getActive());
    return goals ?? [];
}

export function useAddSavingsGoal() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const addGoal = useCallback(async (data: Omit<SavingsGoal, 'id' | 'currentAmount' | 'achieved' | 'createdAt' | 'updatedAt'>) => {
        setIsLoading(true);
        setError(null);

        try {
            validateGoalName(data.name);
            validateTargetAmount(data.targetAmount);

            const id = await savingsGoalOperations.add(data);
            return id;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('添加失败');
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { addGoal, isLoading, error };
}

export function useUpdateSavingsGoal() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const updateGoal = useCallback(async (id: string, data: Partial<SavingsGoal>) => {
        setIsLoading(true);
        setError(null);

        try {
            validateGoalName(data.name);
            validateTargetAmount(data.targetAmount);

            await savingsGoalOperations.update(id, data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('更新失败');
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { updateGoal, isLoading, error };
}

export function useDeleteSavingsGoal() {
    const [isLoading, setIsLoading] = useState(false);

    const deleteGoal = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            await savingsGoalOperations.delete(id);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { deleteGoal, isLoading };
}

export function useUpdateSavingsProgress() {
    const [isUpdating, setIsUpdating] = useState(false);

    const updateProgress = useCallback(async () => {
        setIsUpdating(true);
        try {
            await updateAllGoalsProgress();
        } finally {
            setIsUpdating(false);
        }
    }, []);

    return { updateProgress, isUpdating };
}

export interface GoalPrediction {
    monthsRemaining: number | null;
    predictedDate: Date | null;
    monthlySavingsNeeded: number | null;
    isOnTrack: boolean | null;
}

const RECENT_MONTHS_COUNT = 3;

export function useGoalPrediction(goal: SavingsGoal): GoalPrediction {
    const [prediction, setPrediction] = useState<GoalPrediction>({
        monthsRemaining: null,
        predictedDate: null,
        monthlySavingsNeeded: null,
        isOnTrack: null
    });

    useEffect(() => {
        async function calculatePrediction() {
            const threeMonthsAgo = format(subMonths(new Date(), RECENT_MONTHS_COUNT), 'yyyy-MM-dd');
            const recentTransactions = await db.transactions
                .where('date')
                .between(threeMonthsAgo, format(new Date(), 'yyyy-MM-dd'), true, true)
                .toArray();

            let totalNetSavings = 0;
            for (const transaction of recentTransactions) {
                if (transaction.type === 'income') {
                    totalNetSavings += transaction.amount;
                } else {
                    totalNetSavings -= transaction.amount;
                }
            }

            const avgMonthlySavings = totalNetSavings / RECENT_MONTHS_COUNT;
            const remaining = goal.targetAmount - goal.currentAmount;

            if (avgMonthlySavings <= 0) {
                setPrediction({
                    monthsRemaining: null,
                    predictedDate: null,
                    monthlySavingsNeeded: null,
                    isOnTrack: false
                });
                return;
            }

            const monthsNeeded = remaining / avgMonthlySavings;
            const predictedDate = addMonths(new Date(), Math.ceil(monthsNeeded));

            let isOnTrack = null;
            if (goal.targetDate) {
                const targetDateObj = parseISO(goal.targetDate);
                isOnTrack = predictedDate <= targetDateObj;
            }

            setPrediction({
                monthsRemaining: Math.ceil(monthsNeeded),
                predictedDate,
                monthlySavingsNeeded: avgMonthlySavings,
                isOnTrack
            });
        }

        calculatePrediction();
    }, [goal]);

    return prediction;
}

export function useSavingsGoalsAutoUpdate() {
    useEffect(() => {
        updateAllGoalsProgress().catch((error) => {
            console.error('Failed to update savings progress:', error);
        });
    }, []);
}
