// 账单记录类型
export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    categoryId: string;
    accountId: string;
    date: string; // ISO date string YYYY-MM-DD
    note?: string;
    image?: string; // base64 encoded image
    createdAt: string;
    updatedAt: string;
}

// 分类类型
export interface Category {
    id: string;
    name: string;
    type: TransactionType;
    icon: string; // Lucide icon name
    color: string;
    order: number;
    isCustom: boolean;
}

// 账户类型
export type AccountType = 'cash' | 'bank' | 'alipay' | 'wechat' | 'credit' | 'other';

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    initialBalance: number;
    icon: string;
    color: string;
    order: number;
}

// 预算类型
export type BudgetPeriod = 'monthly' | 'yearly';

export interface Budget {
    id: string;
    categoryId?: string; // 如果为空，则为总预算
    amount: number;
    period: BudgetPeriod;
    startDate: string;
}

// 统计数据类型
export interface DailySummary {
    date: string;
    income: number;
    expense: number;
}

export interface CategorySummary {
    categoryId: string;
    category: Category;
    amount: number;
    count: number;
    percentage: number;
}

export interface MonthSummary {
    month: string; // YYYY-MM
    income: number;
    expense: number;
    balance: number;
    dailySummaries: DailySummary[];
    categorySummaries: CategorySummary[];
}

// 表单数据类型
export interface TransactionFormData {
    type: TransactionType;
    amount: number;
    categoryId: string;
    accountId: string;
    date: string;
    note: string;
}

// 筛选器类型
export interface TransactionFilter {
    type?: TransactionType;
    categoryId?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    keyword?: string;
}

// 设置类型
export interface Settings {
    defaultAccountId: string;
    theme: 'light' | 'dark' | 'system';
    currency: string;
    currencySymbol: string;
    reminderTime?: string;
    showDecimal: boolean;
    savingsGoalsLastUpdate?: string; // 上次更新储蓄目标进度的时间
}

// 储蓄目标类型
export interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    startDate: string;
    targetDate?: string;
    icon: string;
    color: string;
    achieved: boolean;
    achievedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// 储蓄目标图标选项
export const SAVINGS_GOAL_ICONS = [
    'PiggyBank',
    'Target',
    'TrendingUp',
    'Plane',
    'Home',
    'GraduationCap',
    'Car',
    'Umbrella',
    'Gift',
    'Heart',
    'Star',
    'Award'
] as const;

export type SavingsGoalIcon = typeof SAVINGS_GOAL_ICONS[number];
