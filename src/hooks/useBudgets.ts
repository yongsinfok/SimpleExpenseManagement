import { useLiveQuery } from 'dexie-react-hooks';
import { db, budgetOperations } from '../db/database';
import type { Budget } from '../types';

export function useBudgets(period?: string) {
    const budgets = useLiveQuery(
        () => period ? budgetOperations.getByPeriod(period) : budgetOperations.getAll(),
        [period]
    );

    return {
        budgets: budgets || [],
        isLoading: budgets === undefined,
        setBudget: (budget: Omit<Budget, 'id'>) => budgetOperations.setBudget(budget),
        updateBudget: (id: string, budget: Partial<Budget>) => budgetOperations.updateBudget(id, budget),
        deleteBudget: (id: string) => budgetOperations.deleteBudget(id),
    };
}
