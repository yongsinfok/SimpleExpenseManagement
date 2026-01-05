import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, Trash2, Calendar, SlidersHorizontal, ArrowLeftRight, List, CalendarDays, X, Edit2, Check, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, BulkActionBar, FilterPresets, CalendarView, EmptyState, Button } from '../components/ui';
import { useTransactions, useCategories, useDeleteTransaction, useAccounts } from '../hooks/useTransactions';
import { useBulkDeleteTransactions, useUpdateTransaction } from '../hooks/useCalendar';
import { getIcon } from '../utils/icons';
import { cn } from '../utils/cn';
import { filterPresets, formatDate, formatDisplayDate } from '../utils/calendar';
import type { Transaction, TransactionType, Category } from '../types';
import { AddTransaction } from '../components/AddTransaction';

type ViewMode = 'list' | 'calendar';

// 存储视图偏好的 key
const VIEW_PREFERENCE_KEY = 'bills_view_preference';

export function BillsPage() {
    // ===== 基础状态 =====
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterType, setFilterType] = useState<TransactionType | undefined>();
    const [activePresetId, setActivePresetId] = useState('thisMonth');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = localStorage.getItem(VIEW_PREFERENCE_KEY);
        return (saved as ViewMode) || 'list';
    });

    // ===== 日历视图状态 =====
    const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [prefilledDate, setPrefilledDate] = useState<string | undefined>();

    // ===== 选择模式状态 =====
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ===== 编辑模式状态 =====
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // ===== Hooks =====
    const transactions = useTransactions({ type: filterType });
    const categories = useCategories();
    const accounts = useAccounts();
    const { deleteTransaction } = useDeleteTransaction();
    const { bulkDelete, isLoading: isBulkDeleting } = useBulkDeleteTransactions();
    const { updateTransaction } = useUpdateTransaction();

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

    // ===== 过滤交易 =====
    const filteredTransactions = useMemo(() => {
        let result = transactions;

        // 搜索过滤
        if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();
            result = result.filter(t => {
                const category = categoryMap.get(t.categoryId);
                const account = accountMap.get(t.accountId);
                return (
                    category?.name.toLowerCase().includes(keyword) ||
                    account?.name.toLowerCase().includes(keyword) ||
                    t.note?.toLowerCase().includes(keyword)
                );
            });
        }

        // 分类过滤
        if (selectedCategoryId) {
            result = result.filter(t => t.categoryId === selectedCategoryId);
        }

        // 日期范围过滤
        if (activePresetId !== 'all') {
            const preset = filterPresets.find(p => p.id === activePresetId);
            if (preset) {
                const range = preset.getDateRange();
                result = result.filter(t => {
                    const tDate = parseISO(t.date);
                    return isWithinInterval(tDate, {
                        start: parseISO(range.start),
                        end: parseISO(range.end)
                    });
                });
            }
        }

        return result;
    }, [transactions, searchKeyword, categoryMap, accountMap, activePresetId, selectedCategoryId]);

    // ===== 日历视图的选中日期交易 =====
    const selectedDateTransactions = useMemo(() => {
        return filteredTransactions.filter(t => t.date === selectedDate);
    }, [filteredTransactions, selectedDate]);

    // ===== 按日期分组 =====
    const groupedTransactions = useMemo(() => {
        const dataToGroup = viewMode === 'calendar' ? selectedDateTransactions : filteredTransactions;
        const grouped = dataToGroup.reduce((acc, transaction) => {
            const date = transaction.date;
            if (!acc[date]) {
                acc[date] = {
                    date,
                    transactions: [],
                    income: 0,
                    expense: 0
                };
            }
            acc[date].transactions.push(transaction);
            if (transaction.type === 'income') {
                acc[date].income += transaction.amount;
            } else {
                acc[date].expense += transaction.amount;
            }
            return acc;
        }, {} as Record<string, {
            date: string;
            transactions: Transaction[];
            income: number;
            expense: number
        }>);

        return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    }, [viewMode, filteredTransactions, selectedDateTransactions]);

    // ===== 处理函数 =====
    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode);
        localStorage.setItem(VIEW_PREFERENCE_KEY, mode);
        // 退出选择模式
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handlePresetChange = (presetId: string) => {
        setActivePresetId(presetId);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('此操作无法撤销。确定要永久删除这笔账目吗？')) {
            await deleteTransaction(id);
            toast.success('账目已删除');
        }
    };

    // ===== 选择模式处理 =====
    const handleLongPress = useCallback((id: string) => {
        if (!selectionMode) {
            setSelectionMode(true);
            setSelectedIds(new Set([id]));
        }
    }, [selectionMode]);

    const handleToggleSelect = useCallback((id: string) => {
        if (selectionMode) {
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
                // 如果没有选中任何项，退出选择模式
                if (newSet.size === 0) {
                    setSelectionMode(false);
                }
                return newSet;
            });
        }
    }, [selectionMode]);

    const handleSelectAll = useCallback(() => {
        const allIds = new Set(filteredTransactions.map(t => t.id));
        setSelectedIds(allIds);
    }, [filteredTransactions]);

    const handleDeselectAll = useCallback(() => {
        setSelectedIds(new Set());
        setSelectionMode(false);
    }, []);

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`确定删除选中的 ${selectedIds.size} 条交易吗？此操作无法撤销。`)) return;

        try {
            await bulkDelete(Array.from(selectedIds));
            toast.success(`已删除 ${selectedIds.size} 条交易`);
            setSelectedIds(new Set());
            setSelectionMode(false);
        } catch (error) {
            toast.error('批量删除失败');
        }
    };

    const handleCancelSelection = useCallback(() => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    // ===== 编辑处理 =====
    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setShowEditModal(true);
    };

    // ===== 日历快速添加 =====
    const handleQuickAdd = (date: string) => {
        setPrefilledDate(date);
        setShowAddTransaction(true);
    };

    const isAllSelected = selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0;

    return (
        <div className="flex-1 overflow-y-auto pb-28 flex flex-col bg-[var(--color-bg)] hide-scrollbar">
            {/* Nav Title */}
            <div className="px-6 pt-8 pb-4">
                <h2 className="text-2xl font-black text-[var(--color-text)] tracking-tighter italic">账目流水</h2>
                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-50">Transaction Ledger / Deep Feed</p>
            </div>

            {/* Premium Filter Control */}
            <div className="sticky top-0 z-30 px-4 py-4 backdrop-blur-3xl bg-[var(--color-bg)]/80">
                {/* 搜索和筛选按钮 */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none group-focus-within:text-[var(--color-primary)] transition-colors">
                            <Search size={16} className="text-[var(--color-text-muted)]" strokeWidth={3} />
                        </div>
                        <input
                            type="text"
                            placeholder="搜索备注、分类、账户..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            disabled={selectionMode}
                            className={cn(
                                "w-full bg-[var(--color-bg-secondary)] border-none rounded-2xl pl-12 pr-10 py-4 text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all outline-none",
                                selectionMode && "opacity-50 cursor-not-allowed"
                            )}
                        />
                        {searchKeyword && (
                            <button
                                onClick={() => setSearchKeyword('')}
                                className="absolute inset-y-0 right-3 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        disabled={selectionMode}
                        className={cn(
                            "w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-500",
                            showFilters
                                ? "bg-[var(--color-primary)] text-white shadow-xl shadow-[var(--color-primary)]/30 rotate-90"
                                : "bg-[var(--color-bg-card)] border border-[var(--color-border)]/50 text-[var(--color-text-secondary)] shadow-sm",
                            selectionMode && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <SlidersHorizontal size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* 视图切换 */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex p-1 bg-[var(--color-bg-secondary)] rounded-2xl">
                        <button
                            onClick={() => handleViewChange('list')}
                            disabled={selectionMode}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                viewMode === 'list'
                                    ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm"
                                    : "text-[var(--color-text-muted)]"
                            )}
                        >
                            <List size={14} strokeWidth={2.5} />
                            列表
                        </button>
                        <button
                            onClick={() => handleViewChange('calendar')}
                            disabled={selectionMode}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                viewMode === 'calendar'
                                    ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm"
                                    : "text-[var(--color-text-muted)]"
                            )}
                        >
                            <CalendarDays size={14} strokeWidth={2.5} />
                            日历
                        </button>
                    </div>

                    {/* 过滤器预设 */}
                    <FilterPresets
                        activePresetId={activePresetId}
                        onPresetChange={handlePresetChange}
                        disabled={selectionMode}
                    />
                </div>

                {/* 展开的筛选面板 */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, y: -10 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -10 }}
                            className="overflow-hidden mt-6 space-y-6"
                        >
                            <Card padding="lg" shadow="premium" className="bg-[var(--color-bg-card)]/50 border-[var(--color-primary)]/10">
                                {/* 收支类型 */}
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] px-1">收支类型 / Classification</p>
                                    <div className="flex gap-2">
                                        {[
                                            { id: undefined, label: 'ALL' },
                                            { id: 'expense', label: 'DEBIT', color: 'var(--color-expense)' },
                                            { id: 'income', label: 'CREDIT', color: 'var(--color-income)' }
                                        ].map(type => (
                                            <button
                                                key={type.id || 'all'}
                                                onClick={() => { setFilterType(type.id as TransactionType | undefined); setSelectedCategoryId(undefined); }}
                                                className={cn(
                                                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                    filterType === type.id
                                                        ? `bg-[${type.color || 'var(--color-primary)'}] text-white shadow-lg`
                                                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                                                )}
                                                style={filterType === type.id && type.color ? { backgroundColor: type.color } : {}}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 分类筛选 */}
                                <div className="space-y-3 mt-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] px-1">精细分类 / Granularity</p>
                                    <div className="flex overflow-x-auto gap-2 no-scrollbar pb-2">
                                        {categories.filter(c => !filterType || c.type === filterType).map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? undefined : cat.id)}
                                                className={cn(
                                                    "shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                    selectedCategoryId === cat.id
                                                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                                                        : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)]'
                                                )}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 px-4 mt-4">
                {/* 日历视图 */}
                {viewMode === 'calendar' && (
                    <div className="mb-6">
                        <CalendarView
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                        />
                        {/* 选中日期标题 */}
                        <div className="mt-6 mb-4">
                            <p className="text-sm font-black text-[var(--color-text)] tracking-tight">
                                {formatDisplayDate(parseISO(selectedDate))}
                            </p>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">
                                {selectedDateTransactions.length} 条交易记录
                            </p>
                        </div>
                    </div>
                )}

                {/* 交易列表 */}
                <AnimatePresence mode="popLayout">
                    {groupedTransactions.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="py-20 text-center"
                        >
                            <EmptyState
                                icon={ArrowLeftRight}
                                title={viewMode === 'calendar' ? '该日期没有交易' : '没有匹配的交易'}
                                description={searchKeyword ? '尝试其他关键词' : viewMode === 'calendar' ? '点击下方按钮添加' : '数据库空闲中'}
                            />
                            {viewMode === 'calendar' && (
                                <Button
                                    onClick={() => handleQuickAdd(selectedDate)}
                                    className="mt-6"
                                >
                                    添加交易
                                </Button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="space-y-10">
                            {groupedTransactions.map((group) => (
                                <motion.div
                                    key={group.date}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    {/* Glass Date Header - 列表视图显示 */}
                                    {viewMode === 'list' && (
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center shadow-sm">
                                                    <Calendar size={16} strokeWidth={3} className="text-[var(--color-text-secondary)]" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-black text-[var(--color-text)] tracking-tighter uppercase">
                                                        {format(parseISO(group.date), 'MMM dd, EEE', { locale: zhCN })}
                                                    </span>
                                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-40">Entry Date</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {group.expense > 0 && (
                                                    <span className="text-[9px] font-black text-[var(--color-expense)] bg-[var(--color-expense-bg)] px-2.5 py-1.5 rounded-xl border border-[var(--color-expense)]/10">
                                                        - {group.expense.toFixed(2)}
                                                    </span>
                                                )}
                                                {group.income > 0 && (
                                                    <span className="text-[9px] font-black text-[var(--color-income)] bg-[var(--color-income-bg)] px-2.5 py-1.5 rounded-xl border border-[var(--color-income)]/10">
                                                        + {group.income.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Transaction Group */}
                                    <Card shadow="none" padding="none" className="overflow-hidden border-[var(--color-border)]/50 bg-[var(--color-bg-card)]/30 backdrop-blur-sm">
                                        <div className="divide-y divide-[var(--color-border)]/30">
                                            {group.transactions.map((transaction, idx) => (
                                                <TransactionItem
                                                    key={transaction.id}
                                                    transaction={transaction}
                                                    category={categoryMap.get(transaction.categoryId)}
                                                    idx={idx}
                                                    selectionMode={selectionMode}
                                                    isSelected={selectedIds.has(transaction.id)}
                                                    onLongPress={handleLongPress}
                                                    onToggleSelect={handleToggleSelect}
                                                    onDelete={handleDelete}
                                                    onEdit={handleEdit}
                                                />
                                            ))}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* 批量操作栏 */}
            <BulkActionBar
                selectedCount={selectedIds.size}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onDelete={handleBulkDelete}
                onCancel={handleCancelSelection}
                isAllSelected={isAllSelected}
                isDeleting={isBulkDeleting}
            />

            {/* 添加交易弹窗 */}
            <AddTransaction
                isOpen={showAddTransaction}
                onClose={() => {
                    setShowAddTransaction(false);
                    setPrefilledDate(undefined);
                }}
                onSuccess={() => {
                    toast.success('交易已添加');
                }}
            />

            {/* 编辑交易弹窗 */}
            <EditTransactionModal
                transaction={editingTransaction}
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingTransaction(null);
                }}
                onSave={async (id, updates) => {
                    await updateTransaction(id, updates);
                    toast.success('交易已更新');
                    setShowEditModal(false);
                    setEditingTransaction(null);
                }}
                categories={categories}
                accounts={accounts}
            />
        </div>
    );
}

// ===== 交易项组件 =====
interface TransactionItemProps {
    transaction: Transaction;
    category?: Category;
    idx: number;
    selectionMode: boolean;
    isSelected: boolean;
    onLongPress: (id: string) => void;
    onToggleSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (transaction: Transaction) => void;
}

function TransactionItem({
    transaction,
    category,
    idx,
    selectionMode,
    isSelected,
    onLongPress,
    onToggleSelect,
    onDelete,
    onEdit,
}: TransactionItemProps) {
    const IconComponent = category ? getIcon(category.icon) : getIcon('HelpCircle');
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

    const handleTouchStart = () => {
        const timer = setTimeout(() => {
            onLongPress(transaction.id);
        }, 500);
        setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleClick = () => {
        if (selectionMode) {
            onToggleSelect(transaction.id);
        } else {
            onEdit(transaction);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
                "flex items-center gap-5 p-5 transition-all group cursor-pointer",
                selectionMode && isSelected && "bg-[var(--color-primary)]/10",
                !selectionMode && "hover:bg-[var(--color-bg-secondary)]/50"
            )}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onClick={handleClick}
        >
            {/* 选择框 */}
            {selectionMode && (
                <div className="shrink-0">
                    {isSelected ? (
                        <CheckSquare size={22} className="text-[var(--color-primary)]" strokeWidth={2.5} />
                    ) : (
                        <Square size={22} className="text-[var(--color-text-muted)]" strokeWidth={2.5} />
                    )}
                </div>
            )}

            {/* 分类图标 */}
            <div
                className="w-14 h-14 rounded-[1.75rem] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all shrink-0"
                style={{ backgroundColor: (category?.color || '#cbd5e1') + '15' }}
            >
                <IconComponent
                    size={24}
                    style={{ color: category?.color || '#94a3b8' }}
                    strokeWidth={2.5}
                />
            </div>

            {/* 交易信息 */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[var(--color-text)] truncate tracking-tight italic uppercase">
                    {category?.name || 'Unmapped'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 opacity-60">
                    <p className="text-[10px] font-bold text-[var(--color-text-secondary)] truncate uppercase tracking-widest">
                        {transaction.note || '. . .'}
                    </p>
                </div>
            </div>

            {/* 金额和操作 */}
            <div className="text-right flex items-center gap-4">
                <div>
                    <p className={cn(
                        "text-lg font-black tracking-tighter italic leading-none",
                        transaction.type === 'income' ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'
                    )}>
                        {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1 opacity-40">Value RM</p>
                </div>

                {!selectionMode && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all active:scale-90"
                        >
                            <Edit2 size={16} strokeWidth={3} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-white hover:bg-red-500 transition-all active:scale-90"
                        >
                            <Trash2 size={16} strokeWidth={3} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ===== 编辑交易弹窗组件 =====
interface EditTransactionModalProps {
    transaction: Transaction | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
    categories: Category[];
    accounts: { id: string; name: string }[];
}

function EditTransactionModal({
    transaction,
    isOpen,
    onClose,
    onSave,
    categories,
    accounts,
}: EditTransactionModalProps) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState('');
    const [note, setNote] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [isSaving, setIsSaving] = useState(false);

    // 当交易变化时初始化表单
    useMemo(() => {
        if (transaction) {
            setAmount(transaction.amount.toString());
            setCategoryId(transaction.categoryId);
            setAccountId(transaction.accountId);
            setDate(transaction.date);
            setNote(transaction.note || '');
            setType(transaction.type);
        }
    }, [transaction]);

    const filteredCategories = categories.filter(c => c.type === type);

    const handleSave = async () => {
        if (!transaction || !amount || parseFloat(amount) <= 0) {
            toast.error('请输入有效金额');
            return;
        }
        if (!categoryId) {
            toast.error('请选择分类');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(transaction.id, {
                amount: parseFloat(amount),
                categoryId,
                accountId,
                date,
                note: note || undefined,
                type,
            });
        } catch (error) {
            toast.error('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !transaction) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-t-3xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 标题栏 */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]/50">
                        <h3 className="text-lg font-black text-[var(--color-text)]">编辑交易</h3>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* 表单内容 */}
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                        {/* 类型切换 */}
                        <div className="flex p-1.5 bg-[var(--color-bg-secondary)] rounded-2xl">
                            <button
                                onClick={() => { setType('expense'); setCategoryId(''); }}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                                    type === 'expense'
                                        ? "bg-[var(--color-expense)] text-white shadow-lg"
                                        : "text-[var(--color-text-secondary)] opacity-50"
                                )}
                            >
                                支出
                            </button>
                            <button
                                onClick={() => { setType('income'); setCategoryId(''); }}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                                    type === 'income'
                                        ? "bg-[var(--color-income)] text-white shadow-lg"
                                        : "text-[var(--color-text-secondary)] opacity-50"
                                )}
                            >
                                收入
                            </button>
                        </div>

                        {/* 金额 */}
                        <div className="space-y-1.5">
                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">金额</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                placeholder="0.00"
                            />
                        </div>

                        {/* 分类 */}
                        <div className="space-y-1.5">
                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">分类</label>
                            <div className="flex flex-wrap gap-2">
                                {filteredCategories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategoryId(cat.id)}
                                        className={cn(
                                            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                                            categoryId === cat.id
                                                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                                                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border-transparent"
                                        )}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 账户 */}
                        <div className="space-y-1.5">
                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">账户</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none appearance-none"
                            >
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 日期 */}
                        <div className="space-y-1.5">
                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">日期</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none"
                            />
                        </div>

                        {/* 备注 */}
                        <div className="space-y-1.5">
                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">备注</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                maxLength={200}
                                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none resize-none"
                                placeholder="可选备注..."
                            />
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="p-6 pt-0 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] font-black uppercase tracking-widest text-sm"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 py-4 rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check size={18} strokeWidth={3} />
                                    保存
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
