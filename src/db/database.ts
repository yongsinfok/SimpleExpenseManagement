import Dexie, { type EntityTable } from 'dexie';
import type { Transaction, Category, Account, Budget, Settings, SavingsGoal } from '../types';

// 定义数据库类
class AccountingDatabase extends Dexie {
    transactions!: EntityTable<Transaction, 'id'>;
    categories!: EntityTable<Category, 'id'>;
    accounts!: EntityTable<Account, 'id'>;
    budgets!: EntityTable<Budget, 'id'>;
    savingsGoals!: EntityTable<SavingsGoal, 'id'>;

    constructor() {
        super('AccountingDB');

        this.version(1).stores({
            transactions: 'id, type, categoryId, accountId, date, createdAt',
            categories: 'id, type, order',
            accounts: 'id, type, order',
            budgets: 'id, categoryId, period'
        });

        this.version(2).stores({
            transactions: 'id, type, categoryId, accountId, date, createdAt',
            categories: 'id, type, order',
            accounts: 'id, type, order',
            budgets: 'id, categoryId, period',
            savingsGoals: 'id, achieved, createdAt'
        });
    }
}

// 创建数据库实例
export const db = new AccountingDatabase();

// 默认支出分类 (带固定 ID 防止重复)
export const defaultExpenseCategories: Category[] = [
    { id: 'exp_food', name: '餐饮', type: 'expense', icon: 'Utensils', color: '#F59E0B', order: 0, isCustom: false },
    { id: 'exp_trans', name: '交通', type: 'expense', icon: 'Car', color: '#3B82F6', order: 1, isCustom: false },
    { id: 'exp_shop', name: '购物', type: 'expense', icon: 'ShoppingBag', color: '#EC4899', order: 2, isCustom: false },
    { id: 'exp_ent', name: '娱乐', type: 'expense', icon: 'Gamepad2', color: '#8B5CF6', order: 3, isCustom: false },
    { id: 'exp_med', name: '医疗', type: 'expense', icon: 'Heart', color: '#EF4444', order: 4, isCustom: false },
    { id: 'exp_home', name: '住房', type: 'expense', icon: 'Home', color: '#10B981', order: 5, isCustom: false },
    { id: 'exp_edu', name: '教育', type: 'expense', icon: 'GraduationCap', color: '#06B6D4', order: 6, isCustom: false },
    { id: 'exp_other', name: '其他', type: 'expense', icon: 'MoreHorizontal', color: '#6B7280', order: 7, isCustom: false },
];

// 默认收入分类 (带固定 ID 防止重复)
export const defaultIncomeCategories: Category[] = [
    { id: 'inc_salary', name: '工资', type: 'income', icon: 'Wallet', color: '#10B981', order: 0, isCustom: false },
    { id: 'inc_part', name: '兼职', type: 'income', icon: 'Briefcase', color: '#3B82F6', order: 1, isCustom: false },
    { id: 'inc_inv', name: '投资', type: 'income', icon: 'TrendingUp', color: '#8B5CF6', order: 2, isCustom: false },
    { id: 'inc_other', name: '其他', type: 'income', icon: 'MoreHorizontal', color: '#6B7280', order: 3, isCustom: false },
];

// 默认账户
export const defaultAccounts: Account[] = [
    { id: 'acc_cash', name: '现金', type: 'cash', balance: 0, initialBalance: 0, icon: 'Banknote', color: '#10B981', order: 0 },
    { id: 'acc_bank', name: '银行卡', type: 'bank', balance: 0, initialBalance: 0, icon: 'CreditCard', color: '#3B82F6', order: 1 },
];

// 默认设置
export const defaultSettings: Settings = {
    defaultAccountId: 'acc_cash',
    theme: 'system',
    currency: 'MYR',
    currencySymbol: 'RM',
    showDecimal: true,
};

// 生成唯一ID
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 正在初始化的标记
const INIT_KEY = 'simple_expense_init_done';
let isInitializing = false;

export async function initializeDefaultData(): Promise<void> {
    if (isInitializing) return;
    isInitializing = true;

    try {
        // 1. 如果已有初始化标记，直接返回
        if (localStorage.getItem(INIT_KEY)) {
            return;
        }

        // 2. 检查数据库是否已有数据（针对旧用户）
        const hasAccounts = (await db.accounts.count()) > 0;
        const hasCategories = (await db.categories.count()) > 0;

        if (hasAccounts || hasCategories) {
            // 如果已有数据，标记为已初始化，不再尝试恢复默认数据
            localStorage.setItem(INIT_KEY, 'true');

            // 确保 defaultAccountId 有效
            const settings = getSettings();
            const currentAccounts = await db.accounts.toArray();
            if (!settings.defaultAccountId || !currentAccounts.find(a => a.id === settings.defaultAccountId)) {
                if (currentAccounts.length > 0) {
                    saveSettings({ ...settings, defaultAccountId: currentAccounts[0].id });
                }
            }
            return;
        }

        // 3. 全新初始化
        // 添加预设分类
        const allDefaultCategories = [...defaultExpenseCategories, ...defaultIncomeCategories];
        await db.categories.bulkAdd(allDefaultCategories);

        // 添加预设账户
        await db.accounts.bulkAdd(defaultAccounts);

        // 设置默认账户
        const settings = getSettings();
        if (defaultAccounts.length > 0) {
            saveSettings({ ...settings, defaultAccountId: defaultAccounts[0].id });
        }

        // 标记完成
        localStorage.setItem(INIT_KEY, 'true');

    } catch (error) {
        console.error('Failed to initialize default data:', error);
    } finally {
        isInitializing = false;
    }
}

// 设置存储（使用localStorage）
const SETTINGS_KEY = 'accounting_settings';

export function getSettings(): Settings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return defaultSettings;
}

export function saveSettings(settings: Settings): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
}

// 账单操作
export const transactionOperations = {
    async add(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const now = new Date().toISOString();
        const transaction: Transaction = {
            ...data,
            id: generateId(),
            createdAt: now,
            updatedAt: now
        };
        await db.transactions.add(transaction);
        return transaction.id;
    },

    async update(id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
        await db.transactions.update(id, {
            ...data,
            updatedAt: new Date().toISOString()
        });
    },

    async delete(id: string): Promise<void> {
        await db.transactions.delete(id);
    },

    async getById(id: string): Promise<Transaction | undefined> {
        return db.transactions.get(id);
    },

    async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
        return db.transactions
            .where('date')
            .between(startDate, endDate, true, true)
            .reverse()
            .sortBy('date');
    },

    async getAll(): Promise<Transaction[]> {
        return db.transactions.orderBy('date').reverse().toArray();
    },

    async getRecent(limit: number): Promise<Transaction[]> {
        return db.transactions.orderBy('createdAt').reverse().limit(limit).toArray();
    }
};

// 分类操作
export const categoryOperations = {
    async getAll(): Promise<Category[]> {
        return db.categories.orderBy('order').toArray();
    },

    async getByType(type: 'income' | 'expense'): Promise<Category[]> {
        return db.categories.where('type').equals(type).sortBy('order');
    },

    async getById(id: string): Promise<Category | undefined> {
        return db.categories.get(id);
    },

    async add(data: Omit<Category, 'id'>): Promise<string> {
        const id = generateId();
        await db.categories.add({
            ...data,
            id,
            isCustom: true
        });
        return id;
    },

    async update(id: string, data: Partial<Category>): Promise<void> {
        await db.categories.update(id, data);
    },

    async delete(id: string): Promise<void> {
        // 检查是否有账单使用了该分类
        const count = await db.transactions.where('categoryId').equals(id).count();
        if (count > 0) {
            throw new Error('无法删除：该分类下已有账单记录');
        }
        const category = await db.categories.get(id);
        if (category && !category.isCustom) {
            throw new Error('无法删除：系统预设分类不能删除');
        }
        await db.categories.delete(id);
    }
};

// 账户操作
export const accountOperations = {
    async getAll(): Promise<Account[]> {
        return db.accounts.orderBy('order').toArray();
    },

    async getById(id: string): Promise<Account | undefined> {
        return db.accounts.get(id);
    },

    async add(data: Omit<Account, 'id' | 'balance'>): Promise<string> {
        const id = generateId();
        await db.accounts.add({
            ...data,
            id,
            balance: data.initialBalance,
        });
        return id;
    },

    async update(id: string, data: Partial<Account>): Promise<void> {
        const account = await db.accounts.get(id);
        if (!account) return;

        // 如果修改了初始余额，需要相应调整当前余额
        if (data.initialBalance !== undefined && data.initialBalance !== account.initialBalance) {
            const diff = data.initialBalance - account.initialBalance;
            const newBalance = account.balance + diff;
            await db.accounts.update(id, { ...data, balance: newBalance });
        } else {
            await db.accounts.update(id, data);
        }
    },

    async delete(id: string): Promise<void> {
        // 检查是否有账单使用了该分类
        const count = await db.transactions.where('accountId').equals(id).count();
        if (count > 0) {
            throw new Error('无法删除：该账户下已有账单记录');
        }

        // 不能删除最后一个账户
        const total = await db.accounts.count();
        if (total <= 1) {
            throw new Error('无法删除：至少需要保留一个账户');
        }

        await db.accounts.delete(id);
    },

    async updateBalance(id: string, amount: number, isIncome: boolean): Promise<void> {
        const account = await db.accounts.get(id);
        if (account) {
            const newBalance = isIncome ? account.balance + amount : account.balance - amount;
            await db.accounts.update(id, { balance: newBalance });
        }
    }
};
// 预算操作
export const budgetOperations = {
    async getAll(): Promise<Budget[]> {
        return await db.budgets.toArray();
    },

    async getByPeriod(period: string): Promise<Budget[]> {
        return await db.budgets.where('period').equals(period).toArray();
    },

    async add(budget: Omit<Budget, 'id'>): Promise<string> {
        const id = generateId();
        await db.budgets.add({ ...budget, id });
        return id;
    },

    async update(id: string, budget: Partial<Budget>): Promise<void> {
        await db.budgets.update(id, budget);
    },

    async delete(id: string): Promise<void> {
        await db.budgets.delete(id);
    },

    async setBudget(budget: Omit<Budget, 'id'>): Promise<string> {
        // 如果已存在该分类该周期的预算，则更新，否则新增
        const existing = await db.budgets
            .where({ categoryId: budget.categoryId, period: budget.period })
            .first();

        if (existing) {
            await this.update(existing.id, budget);
            return existing.id;
        } else {
            return await this.add(budget);
        }
    }
};

// 储蓄目标操作
export const savingsGoalOperations = {
    async getAll(): Promise<SavingsGoal[]> {
        return await db.savingsGoals.orderBy('createdAt').reverse().toArray();
    },

    async getActive(): Promise<SavingsGoal[]> {
        const all = await db.savingsGoals.orderBy('createdAt').reverse().toArray();
        return all.filter(goal => !goal.achieved);
    },

    async getById(id: string): Promise<SavingsGoal | undefined> {
        return await db.savingsGoals.get(id);
    },

    async add(data: Omit<SavingsGoal, 'id' | 'currentAmount' | 'achieved' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = generateId();
        const now = new Date().toISOString();
        await db.savingsGoals.add({
            ...data,
            id,
            currentAmount: 0,
            achieved: false,
            createdAt: now,
            updatedAt: now
        });
        return id;
    },

    async update(id: string, data: Partial<SavingsGoal>): Promise<void> {
        await db.savingsGoals.update(id, {
            ...data,
            updatedAt: new Date().toISOString()
        });
    },

    async delete(id: string): Promise<void> {
        await db.savingsGoals.delete(id);
    },

    async markAsAchieved(id: string): Promise<void> {
        await db.savingsGoals.update(id, {
            achieved: true,
            achievedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    },

    async updateProgress(id: string, currentAmount: number): Promise<void> {
        const goal = await db.savingsGoals.get(id);
        if (!goal) return;

        const wasAchieved = goal.achieved;
        const isAchieved = currentAmount >= goal.targetAmount;

        await db.savingsGoals.update(id, {
            currentAmount,
            achieved: isAchieved,
            achievedAt: isAchieved && !wasAchieved ? new Date().toISOString() : goal.achievedAt,
            updatedAt: new Date().toISOString()
        });
    }
};
