import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useCallback, useEffect } from 'react';
import { savingsGoalOperations, db, getSettings, saveSettings } from '../db/database';
import type { SavingsGoal } from '../types';
import { format, subMonths, parseISO, addMonths } from 'date-fns';

// 获取所有储蓄目标
export function useSavingsGoals() {
    const goals = useLiveQuery(() => savingsGoalOperations.getAll());
    return goals ?? [];
}

// 获取活跃（未达成）的储蓄目标
export function useActiveSavingsGoals() {
    const goals = useLiveQuery(() => savingsGoalOperations.getActive());
    return goals ?? [];
}

// 添加储蓄目标
export function useAddSavingsGoal() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const addGoal = useCallback(async (data: Omit<SavingsGoal, 'id' | 'currentAmount' | 'achieved' | 'createdAt' | 'updatedAt'>) => {
        setIsLoading(true);
        setError(null);

        try {
            // 验证
            if (!data.name || data.name.trim() === '') {
                throw new Error('目标名称不能为空');
            }
            if (data.targetAmount <= 0) {
                throw new Error('目标金额必须大于 0');
            }
            if (data.name.length > 20) {
                throw new Error('目标名称不能超过 20 个字符');
            }

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

// 更新储蓄目标
export function useUpdateSavingsGoal() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const updateGoal = useCallback(async (id: string, data: Partial<SavingsGoal>) => {
        setIsLoading(true);
        setError(null);

        try {
            // 验证
            if (data.name !== undefined && data.name.trim() === '') {
                throw new Error('目标名称不能为空');
            }
            if (data.targetAmount !== undefined && data.targetAmount <= 0) {
                throw new Error('目标金额必须大于 0');
            }
            if (data.name !== undefined && data.name.length > 20) {
                throw new Error('目标名称不能超过 20 个字符');
            }

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

// 删除储蓄目标
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

// 更新所有储蓄目标的进度
export function useUpdateSavingsProgress() {
    const [isUpdating, setIsUpdating] = useState(false);

    const updateProgress = useCallback(async () => {
        setIsUpdating(true);

        try {
            const settings = getSettings();
            const today = format(new Date(), 'yyyy-MM-dd');
            const lastUpdate = settings.savingsGoalsLastUpdate;

            // 如果今天已经更新过，跳过
            if (lastUpdate === today) {
                setIsUpdating(false);
                return;
            }

            const goals = await savingsGoalOperations.getActive();

            // 计算所有交易的总收入和总支出
            const allTransactions = await db.transactions.toArray();

            for (const goal of goals) {
                // 计算从目标开始日期到现在的净储蓄
                let netSavings = 0;
                for (const t of allTransactions) {
                    if (t.date >= goal.startDate) {
                        if (t.type === 'income') {
                            netSavings += t.amount;
                        } else {
                            netSavings -= t.amount;
                        }
                    }
                }

                // 更新目标进度
                await savingsGoalOperations.updateProgress(goal.id, netSavings);
            }

            // 更新最后更新时间
            saveSettings({ ...settings, savingsGoalsLastUpdate: today });
        } finally {
            setIsUpdating(false);
        }
    }, []);

    return { updateProgress, isUpdating };
}

// 计算目标达成预测
export interface GoalPrediction {
    monthsRemaining: number | null;
    predictedDate: Date | null;
    monthlySavingsNeeded: number | null;
    isOnTrack: boolean | null;
}

export function useGoalPrediction(goal: SavingsGoal): GoalPrediction {
    const [prediction, setPrediction] = useState<GoalPrediction>({
        monthsRemaining: null,
        predictedDate: null,
        monthlySavingsNeeded: null,
        isOnTrack: null
    });

    useEffect(() => {
        async function calculatePrediction() {
            // 计算最近 3 个月的平均净储蓄
            const threeMonthsAgo = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
            const recentTransactions = await db.transactions
                .where('date')
                .between(threeMonthsAgo, format(new Date(), 'yyyy-MM-dd'), true, true)
                .toArray();

            let totalNetSavings = 0;
            recentTransactions.forEach(t => {
                if (t.type === 'income') {
                    totalNetSavings += t.amount;
                } else {
                    totalNetSavings -= t.amount;
                }
            });

            const avgMonthlySavings = totalNetSavings / 3;
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

            // 检查是否在计划内
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

// 应用启动时自动更新进度
export function useSavingsGoalsAutoUpdate() {
    const { updateProgress } = useUpdateSavingsProgress();

    useEffect(() => {
        updateProgress();
    }, [updateProgress]);
}
