import Dexie, { type EntityTable } from 'dexie';
import type { Transaction, Category, Account, Budget, Settings } from '../types';

// 定义数据库类
class AccountingDatabase extends Dexie {
    transactions!: EntityTable<Transaction, 'id'>;
    categories!: EntityTable<Category, 'id'>;
    accounts!: EntityTable<Account, 'id'>;
    budgets!: EntityTable<Budget, 'id'>;

    constructor() {
        super('AccountingDB');

        this.version(1).stores({
            transactions: 'id, type, categoryId, accountId, date, createdAt',
            categories: 'id, type, order',
            accounts: 'id, type, order',
            budgets: 'id, categoryId, period'
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
let isInitializing = false;

// 初始化默认数据
export async function initializeDefaultData(): Promise<void> {
    if (isInitializing) return;
    isInitializing = true;

    try {
        const categoriesCount = await db.categories.count();
        const accountsCount = await db.accounts.count();

        // 如果数据库不为空，检查并清理之前错误生成的重复项
        if (categoriesCount > 0) {
            const presetIds = new Set([...defaultExpenseCategories, ...defaultIncomeCategories].map(c => c.id));
            const allCategories = await db.categories.toArray();
            const idsToDelete = allCategories
                .filter(cat => !presetIds.has(cat.id) && !cat.isCustom)
                .map(cat => cat.id);

            if (idsToDelete.length > 0) {
                await db.categories.bulkDelete(idsToDelete);
            }
        }

        // 无论如何，确保预设分类（带固定 ID）在位
        await db.categories.bulkPut([...defaultExpenseCategories, ...defaultIncomeCategories]);

        if (accountsCount === 0 || accountsCount < defaultAccounts.length) {
            await db.accounts.bulkPut(defaultAccounts);
            const settings = getSettings();
            if (!settings.defaultAccountId) {
                saveSettings({ ...settings, defaultAccountId: defaultAccounts[0].id });
            }
        }
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

    async updateBalance(id: string, amount: number, isIncome: boolean): Promise<void> {
        const account = await db.accounts.get(id);
        if (account) {
            const newBalance = isIncome ? account.balance + amount : account.balance - amount;
            await db.accounts.update(id, { balance: newBalance });
        }
    }
};
