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

// 默认支出分类
export const defaultExpenseCategories: Omit<Category, 'id'>[] = [
    { name: '餐饮', type: 'expense', icon: 'Utensils', color: '#F59E0B', order: 0, isCustom: false },
    { name: '交通', type: 'expense', icon: 'Car', color: '#3B82F6', order: 1, isCustom: false },
    { name: '购物', type: 'expense', icon: 'ShoppingBag', color: '#EC4899', order: 2, isCustom: false },
    { name: '娱乐', type: 'expense', icon: 'Gamepad2', color: '#8B5CF6', order: 3, isCustom: false },
    { name: '医疗', type: 'expense', icon: 'Heart', color: '#EF4444', order: 4, isCustom: false },
    { name: '住房', type: 'expense', icon: 'Home', color: '#10B981', order: 5, isCustom: false },
    { name: '教育', type: 'expense', icon: 'GraduationCap', color: '#06B6D4', order: 6, isCustom: false },
    { name: '其他', type: 'expense', icon: 'MoreHorizontal', color: '#6B7280', order: 7, isCustom: false },
];

// 默认收入分类
export const defaultIncomeCategories: Omit<Category, 'id'>[] = [
    { name: '工资', type: 'income', icon: 'Wallet', color: '#10B981', order: 0, isCustom: false },
    { name: '兼职', type: 'income', icon: 'Briefcase', color: '#3B82F6', order: 1, isCustom: false },
    { name: '投资', type: 'income', icon: 'TrendingUp', color: '#8B5CF6', order: 2, isCustom: false },
    { name: '其他', type: 'income', icon: 'MoreHorizontal', color: '#6B7280', order: 3, isCustom: false },
];

// 默认账户
export const defaultAccounts: Omit<Account, 'id'>[] = [
    { name: '现金', type: 'cash', balance: 0, initialBalance: 0, icon: 'Banknote', color: '#10B981', order: 0 },
    { name: '银行卡', type: 'bank', balance: 0, initialBalance: 0, icon: 'CreditCard', color: '#3B82F6', order: 1 },
    { name: '支付宝', type: 'alipay', balance: 0, initialBalance: 0, icon: 'Smartphone', color: '#1677FF', order: 2 },
    { name: '微信', type: 'wechat', balance: 0, initialBalance: 0, icon: 'MessageCircle', color: '#07C160', order: 3 },
];

// 默认设置
export const defaultSettings: Settings = {
    defaultAccountId: '',
    theme: 'system',
    currency: 'MYR',
    currencySymbol: 'RM',
    showDecimal: true,
};

// 生成唯一ID
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 初始化默认数据
export async function initializeDefaultData(): Promise<void> {
    const categoriesCount = await db.categories.count();
    const accountsCount = await db.accounts.count();

    if (categoriesCount === 0) {
        const allCategories = [...defaultExpenseCategories, ...defaultIncomeCategories].map(cat => ({
            ...cat,
            id: generateId()
        }));
        await db.categories.bulkAdd(allCategories);
    }

    if (accountsCount === 0) {
        const allAccounts = defaultAccounts.map(acc => ({
            ...acc,
            id: generateId()
        }));
        await db.accounts.bulkAdd(allAccounts);

        // 设置默认账户
        const settings = getSettings();
        if (!settings.defaultAccountId && allAccounts.length > 0) {
            saveSettings({ ...settings, defaultAccountId: allAccounts[0].id });
        }
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
