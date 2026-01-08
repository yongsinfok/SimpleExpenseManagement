import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Target, Plus, Edit3, Trash2, TrendingUp, Calendar, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card } from '../components/ui';
import { useSavingsGoals, useAddSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal, useGoalPrediction } from '../hooks/useSavingsGoals';
import { getIcon } from '../utils/icons';
import { cn } from '../utils/cn';
import type { SavingsGoal } from '../types';
import { SAVINGS_GOAL_ICONS } from '../types';

export function SavingsGoalsPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

    const allGoals = useSavingsGoals();
    const { addGoal, isLoading: isAdding } = useAddSavingsGoal();
    const { updateGoal, isLoading: isUpdating } = useUpdateSavingsGoal();
    const { deleteGoal } = useDeleteSavingsGoal();

    // 计算总览数据
    const totalTargetAmount = allGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrentAmount = allGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
    const achievedCount = allGoals.filter(g => g.achieved).length;

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`确定要删除储蓄目标"${name}"吗？此操作无法撤销。`)) {
            await deleteGoal(id);
            toast.success('目标已删除');
        }
    };

    const handleEdit = (goal: SavingsGoal) => {
        setEditingGoal(goal);
        setShowAddModal(true);
    };

    return (
        <div className="flex-1 overflow-y-auto pb-28 px-4 pt-6 space-y-6 hide-scrollbar">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-[var(--color-text)] tracking-tighter italic">储蓄目标</h2>
                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-50">Savings Goals / Future Planning</p>
                    </div>
                    <button
                        onClick={() => { setEditingGoal(null); setShowAddModal(true); }}
                        className="w-14 h-14 rounded-2xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 flex items-center justify-center active:scale-90 transition-all"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>
            </motion.div>

            {/* Overview Card */}
            <Card shadow="premium" padding="xl" className="relative overflow-hidden border-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Target size={20} className="text-[var(--color-primary)]" strokeWidth={2.5} />
                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">总览 / Overview</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">目标金额</p>
                            <p className="text-lg font-black text-[var(--color-text)] tracking-tighter">RM {totalTargetAmount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">已累计</p>
                            <p className="text-lg font-black text-[var(--color-primary)] tracking-tighter">RM {totalCurrentAmount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">已完成</p>
                            <p className="text-lg font-black text-[var(--color-text)] tracking-tighter">{achievedCount}/{allGoals.length}</p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between items-end">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">总体进度</p>
                            <p className="text-sm font-black text-[var(--color-primary)] tracking-tighter">{overallProgress.toFixed(1)}%</p>
                        </div>
                        <div className="h-2 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(overallProgress, 100)}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full rounded-full bg-[var(--color-primary)] shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.5)]"
                            />
                        </div>
                    </div>
                </motion.div>
            </Card>

            {/* Goals List */}
            <AnimatePresence mode="popLayout">
                {allGoals.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="py-20 text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center mx-auto mb-4">
                            <Target size={32} className="text-[var(--color-text-muted)] opacity-50" strokeWidth={2} />
                        </div>
                        <p className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider mb-2">还没有储蓄目标</p>
                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-6">设定你的第一个财务目标</p>
                        <button
                            onClick={() => { setEditingGoal(null); setShowAddModal(true); }}
                            className="px-6 py-3 rounded-2xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/30"
                        >
                            创建目标
                        </button>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {allGoals.map((goal, index) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                index={index}
                                onEdit={() => handleEdit(goal)}
                                onDelete={() => handleDelete(goal.id, goal.name)}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <AddGoalModal
                    goal={editingGoal}
                    onClose={() => { setShowAddModal(false); setEditingGoal(null); }}
                    onSave={async (data) => {
                        if (editingGoal) {
                            await updateGoal(editingGoal.id, data);
                            toast.success('目标已更新');
                        } else {
                            await addGoal(data);
                            toast.success('目标已创建');
                        }
                        setShowAddModal(false);
                        setEditingGoal(null);
                    }}
                    isLoading={isAdding || isUpdating}
                />
            )}
        </div>
    );
}

// Goal Card Component
function GoalCard({ goal, index, onEdit, onDelete }: { goal: SavingsGoal; index: number; onEdit: () => void; onDelete: () => void }) {
    const prediction = useGoalPrediction(goal);
    const IconComponent = getIcon(goal.icon);
    const progress = (goal.currentAmount / goal.targetAmount) * 100;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card shadow="premium" padding="lg" className={cn(
                "relative overflow-hidden transition-all",
                goal.achieved && "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5"
            )}>
                {/* Achieved Badge */}
                {goal.achieved && (
                    <div className="absolute top-4 right-4 z-10">
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white shadow-lg">
                            <Award size={12} strokeWidth={3} fill="currentColor" />
                            <span className="text-[10px] font-black uppercase tracking-wider">已达成</span>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                        <div
                            className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: goal.color + '15' }}
                        >
                            <IconComponent size={28} style={{ color: goal.color }} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-[var(--color-text)] tracking-tight uppercase italic">{goal.name}</h3>
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">
                                {goal.achieved && goal.achievedAt
                                    ? `达成于 ${format(parseISO(goal.achievedAt), 'yyyy年MM月dd日', { locale: zhCN })}`
                                    : `始于 ${format(parseISO(goal.startDate), 'yyyy年MM月dd日', { locale: zhCN })}`
                                }
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onEdit}
                                className="w-10 h-10 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex items-center justify-center transition-all active:scale-90"
                            >
                                <Edit3 size={16} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={onDelete}
                                className="w-10 h-10 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-red-500 flex items-center justify-center transition-all active:scale-90"
                            >
                                <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-3">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">当前进度</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-[var(--color-text)] tracking-tighter">RM {goal.currentAmount.toLocaleString()}</span>
                                    <span className="text-sm font-black text-[var(--color-text-muted)]">/ {goal.targetAmount.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-[var(--color-primary)] tracking-tighter">{progress.toFixed(1)}%</p>
                            </div>
                        </div>

                        <div className="h-3 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(progress, 100)}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className={cn(
                                    "h-full rounded-full",
                                    progress >= 100 ? "bg-[var(--color-primary)]" : goal.achieved ? "bg-[var(--color-income)]" : `bg-[${goal.color}]`
                                )}
                                style={progress < 100 && !goal.achieved ? { backgroundColor: goal.color } : {}}
                            />
                        </div>
                    </div>

                    {/* Prediction Info */}
                    {!goal.achieved && prediction.monthlySavingsNeeded !== null && (
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-border)]/50">
                            <div className="p-3 rounded-2xl bg-[var(--color-bg-secondary)]/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar size={14} className="text-[var(--color-text-muted)]" strokeWidth={2.5} />
                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">预计达成</p>
                                </div>
                                <p className="text-sm font-black text-[var(--color-text)] tracking-tight">
                                    {prediction.monthsRemaining !== null
                                        ? `${prediction.monthsRemaining} 个月后`
                                        : '无法预测'
                                    }
                                </p>
                            </div>
                            <div className="p-3 rounded-2xl bg-[var(--color-bg-secondary)]/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp size={14} className="text-[var(--color-text-muted)]" strokeWidth={2.5} />
                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">月均储蓄</p>
                                </div>
                                <p className="text-sm font-black text-[var(--color-text)] tracking-tight">
                                    RM {prediction.monthlySavingsNeeded?.toFixed(0) || '-'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Target Date Warning */}
                    {!goal.achieved && goal.targetDate && prediction.isOnTrack !== null && (
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider",
                            prediction.isOnTrack
                                ? "bg-[var(--color-income-bg)] text-[var(--color-income)]"
                                : "bg-[var(--color-expense-bg)] text-[var(--color-expense)]"
                        )}>
                            {prediction.isOnTrack ? (
                                <TrendingUp size={14} strokeWidth={3} />
                            ) : (
                                <Calendar size={14} strokeWidth={3} />
                            )}
                            <span>
                                {prediction.isOnTrack
                                    ? `按计划可在 ${format(parseISO(goal.targetDate), 'MM月dd日')} 前达成`
                                    : `需加快进度才能在 ${format(parseISO(goal.targetDate), 'MM月dd日')} 达成`
                                }
                            </span>
                        </div>
                    )}

                    {/* Negative Savings Warning */}
                    {!goal.achieved && prediction.monthlySavingsNeeded !== null && prediction.monthlySavingsNeeded <= 0 && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-expense-bg)] text-[var(--color-expense)]">
                            <TrendingUp size={14} strokeWidth={3} />
                            <span className="text-[10px] font-black uppercase tracking-wider">近期支出大于收入，建议调整消费习惯</span>
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
}

// Add/Edit Modal Component
function AddGoalModal({ goal, onClose, onSave, isLoading }: {
    goal: SavingsGoal | null;
    onClose: () => void;
    onSave: (data: Omit<SavingsGoal, 'id' | 'currentAmount' | 'achieved' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    isLoading: boolean;
}) {
    const [name, setName] = useState(goal?.name || '');
    const [targetAmount, setTargetAmount] = useState(goal?.targetAmount.toString() || '');
    const [selectedIcon, setSelectedIcon] = useState(goal?.icon || 'PiggyBank');
    const [selectedColor, setSelectedColor] = useState(goal?.color || '#3B82F6');
    const [targetDate, setTargetDate] = useState(goal?.targetDate || '');

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !targetAmount) return;

        await onSave({
            name: name.trim(),
            targetAmount: parseFloat(targetAmount),
            startDate: format(new Date(), 'yyyy-MM-dd'),
            targetDate: targetDate || undefined,
            icon: selectedIcon,
            color: selectedColor
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-[var(--color-bg-card)] rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-[var(--color-text)] tracking-tight uppercase italic">
                            {goal ? '编辑目标' : '新目标'}
                        </h3>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] flex items-center justify-center">
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Input */}
                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">目标名称</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例如：旅行基金"
                                maxLength={20}
                                className="w-full px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border-none text-sm font-black text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                            />
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">目标金额 (RM)</label>
                            <input
                                type="number"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                placeholder="10000"
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border-none text-sm font-black text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                            />
                        </div>

                        {/* Icon Selection */}
                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">选择图标</label>
                            <div className="grid grid-cols-6 gap-2">
                                {SAVINGS_GOAL_ICONS.map(icon => {
                                    const IconComp = getIcon(icon);
                                    return (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setSelectedIcon(icon)}
                                            className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                                selectedIcon === icon
                                                    ? "bg-[var(--color-primary)] text-white shadow-lg"
                                                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]"
                                            )}
                                        >
                                            <IconComp size={20} strokeWidth={2.5} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">选择颜色</label>
                            <div className="flex gap-2 flex-wrap">
                                {colors.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        className={cn(
                                            "w-10 h-10 rounded-xl transition-all",
                                            selectedColor === color
                                                ? "ring-2 ring-offset-2 ring-offset-[var(--color-bg-card)] ring-[var(--color-text)] scale-110"
                                                : "opacity-60 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Target Date (Optional) */}
                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">期望达成日期 (可选)</label>
                            <input
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                min={format(new Date(), 'yyyy-MM-dd')}
                                className="w-full px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border-none text-sm font-black text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 py-4 rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text)] text-[12px] font-black uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !name.trim() || !targetAmount}
                                className="flex-1 py-4 rounded-2xl bg-[var(--color-primary)] text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/30 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? '保存中...' : goal ? '更新' : '创建'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
