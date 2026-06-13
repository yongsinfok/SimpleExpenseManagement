import { db, aiPreferenceOperations, getSettings } from '../db/database';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';

// OpenRouter / OpenAI 兼容的工具定义
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

// 安全金额求和：累加后四舍五入到 2 位小数，规避浮点误差
function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function resolveDateRange(period: 'month' | 'year', refDate?: string): { start: string; end: string } {
    const ref = refDate ? parseISO(refDate) : new Date();
    if (period === 'year') {
        return {
            start: format(startOfYear(ref), 'yyyy-MM-dd'),
            end: format(endOfYear(ref), 'yyyy-MM-dd')
        };
    }
    return {
        start: format(startOfMonth(ref), 'yyyy-MM-dd'),
        end: format(endOfMonth(ref), 'yyyy-MM-dd')
    };
}

async function buildCategoryMaps() {
    const categories = await db.categories.toArray();
    const byId = new Map(categories.map(c => [c.id, c]));
    return { byId };
}

// ---- 工具执行函数 ----

async function getPeriodSummary(args: { period: 'month' | 'year'; refDate?: string }) {
    const { start, end } = resolveDateRange(args.period, args.refDate);
    const { byId } = await buildCategoryMaps();
    const txs = await db.transactions.where('date').between(start, end, true, true).toArray();

    let income = 0;
    let expense = 0;
    const byCategory = new Map<string, number>();

    for (const t of txs) {
        if (t.type === 'income') {
            income += t.amount;
        } else {
            expense += t.amount;
            byCategory.set(t.categoryId, (byCategory.get(t.categoryId) || 0) + t.amount);
        }
    }

    const currencySymbol = getSettings().currencySymbol;
    const categoryBreakdown = Array.from(byCategory.entries())
        .map(([categoryId, amount]) => ({
            category: byId.get(categoryId)?.name || '未分类',
            amount: round2(amount)
        }))
        .sort((a, b) => b.amount - a.amount);

    return {
        period: args.period,
        rangeStart: start,
        rangeEnd: end,
        currency: currencySymbol,
        income: round2(income),
        expense: round2(expense),
        net: round2(income - expense),
        transactionCount: txs.length,
        topExpenseCategories: categoryBreakdown.slice(0, 8)
    };
}

async function getAccountBalances() {
    const accounts = await db.accounts.orderBy('order').toArray();
    const currencySymbol = getSettings().currencySymbol;
    const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);
    return {
        currency: currencySymbol,
        totalAssets: round2(totalAssets),
        accounts: accounts.map(a => ({
            name: a.name,
            type: a.type,
            balance: round2(a.balance)
        }))
    };
}

async function getBudgetStatus(args: { period: 'month' | 'year'; refDate?: string }) {
    const { start, end } = resolveDateRange(args.period, args.refDate);
    const periodKey = args.period === 'month' ? start.slice(0, 7) : start.slice(0, 4);
    const { byId } = await buildCategoryMaps();
    const budgets = await db.budgets.where('period').equals(args.period).toArray();
    const txs = await db.transactions.where('date').between(start, end, true, true).toArray();

    const spentByCategory = new Map<string, number>();
    let totalSpent = 0;
    for (const t of txs) {
        if (t.type === 'expense') {
            spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) || 0) + t.amount);
            totalSpent += t.amount;
        }
    }

    const currencySymbol = getSettings().currencySymbol;
    return {
        currency: currencySymbol,
        periodKey,
        budgets: budgets.map(b => {
            const limit = b.amount;
            const spent = b.categoryId ? (spentByCategory.get(b.categoryId) || 0) : totalSpent;
            const remaining = round2(limit - spent);
            return {
                scope: b.categoryId ? (byId.get(b.categoryId)?.name || '分类预算') : '总预算',
                limit: round2(limit),
                spent: round2(spent),
                remaining,
                percentage: limit > 0 ? Math.round((spent / limit) * 100) : 0
            };
        })
    };
}

async function getSavingsGoals() {
    const goals = await db.savingsGoals.orderBy('createdAt').reverse().toArray();
    const currencySymbol = getSettings().currencySymbol;
    return {
        currency: currencySymbol,
        goals: goals.map(g => ({
            name: g.name,
            target: round2(g.targetAmount),
            current: round2(g.currentAmount),
            progress: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
            achieved: g.achieved,
            targetDate: g.targetDate || null
        }))
    };
}

async function queryTransactions(args: {
    type?: 'income' | 'expense';
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
    limit?: number;
}) {
    const { byId } = await buildCategoryMaps();
    const accounts = await db.accounts.toArray();
    const accById = new Map(accounts.map(a => [a.id, a]));
    const limit = Math.min(args.limit ?? 20, 50);

    let txs = await db.transactions.orderBy('date').reverse().toArray();
    if (args.type) txs = txs.filter(t => t.type === args.type);
    if (args.categoryId) txs = txs.filter(t => t.categoryId === args.categoryId);
    if (args.startDate) txs = txs.filter(t => t.date >= args.startDate!);
    if (args.endDate) txs = txs.filter(t => t.date <= args.endDate!);
    if (args.keyword) {
        const kw = args.keyword.toLowerCase();
        txs = txs.filter(t => (t.note || '').toLowerCase().includes(kw));
    }
    txs = txs.slice(0, limit);

    const currencySymbol = getSettings().currencySymbol;
    return {
        currency: currencySymbol,
        count: txs.length,
        transactions: txs.map(t => ({
            date: t.date,
            type: t.type,
            amount: round2(t.amount),
            category: byId.get(t.categoryId)?.name || '未分类',
            account: accById.get(t.accountId)?.name || '-',
            note: t.note || ''
        }))
    };
}

async function getUserPreferences() {
    const prefs = await aiPreferenceOperations.getAll();
    return {
        preferences: prefs.map(p => ({ key: p.key, value: p.value }))
    };
}

// 工具注册表
export type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>;
export const toolExecutors: Record<string, ToolExecutor> = {
    get_period_summary: (args) => getPeriodSummary(args as { period: 'month' | 'year'; refDate?: string }),
    get_account_balances: () => getAccountBalances(),
    get_budget_status: (args) => getBudgetStatus(args as { period: 'month' | 'year'; refDate?: string }),
    get_savings_goals: () => getSavingsGoals(),
    query_transactions: (args) => queryTransactions(args as Parameters<typeof queryTransactions>[0]),
    get_user_preferences: () => getUserPreferences(),
};

// 供模型读取的工具描述
export const toolDefinitions: ToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'get_period_summary',
            description: '获取某个月或某一年的收入、支出、净额、交易笔数和支出分类汇总。回答"这个月花了多少/赚了多少/还能存多少"类问题时用。',
            parameters: {
                type: 'object',
                properties: {
                    period: { type: 'string', enum: ['month', 'year'], description: '按月还是按年' },
                    refDate: { type: 'string', description: '参考日期 YYYY-MM-DD，默认今天' }
                },
                required: ['period']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_account_balances',
            description: '获取所有账户的当前余额和总资产。回答"我现在有多少钱/总资产"类问题时用。',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_budget_status',
            description: '获取预算执行情况：每个预算的额度、已花、剩余、占比。回答"预算还剩多少/有没有超支"类问题时用。',
            parameters: {
                type: 'object',
                properties: {
                    period: { type: 'string', enum: ['month', 'year'], description: '按月还是按年，默认 month' },
                    refDate: { type: 'string', description: '参考日期 YYYY-MM-DD' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_savings_goals',
            description: '获取所有储蓄目标的进度、目标金额、当前金额、是否达成。回答"存钱目标进展"类问题时用。',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'query_transactions',
            description: '按条件查询具体的交易明细（按类型、分类、日期范围、关键词）。需要看具体哪几笔账时用。最多返回 50 条。',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['income', 'expense'] },
                    categoryId: { type: 'string' },
                    startDate: { type: 'string', description: 'YYYY-MM-DD' },
                    endDate: { type: 'string', description: 'YYYY-MM-DD' },
                    keyword: { type: 'string', description: '备注关键词' },
                    limit: { type: 'number', description: '返回条数，默认 20' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_user_preferences',
            description: '读取已记录的用户偏好和事实（如目标储蓄额、风险偏好）。回答前先看一眼用户是谁。',
            parameters: { type: 'object', properties: {} }
        }
    },
];
