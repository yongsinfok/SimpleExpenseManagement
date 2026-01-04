import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit2, Trash2, Check, X, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategories } from '../hooks/useTransactions';
import { categoryOperations } from '../db/database';
import type { Category, TransactionType } from '../types';
import { getIcon } from '../utils/icons';
import { Card, Button } from '../components/ui';
import { cn } from '../utils/cn';

interface CategoryManagementProps {
    onBack: () => void;
}

const ICON_LIST = [
    'Utensils', 'Car', 'ShoppingBag', 'Gamepad2', 'Heart', 'Home', 'GraduationCap',
    'Wallet', 'Briefcase', 'TrendingUp', 'Gift', 'Coffee', 'Music', 'Camera',
    'Smartphone', 'Monitor', 'Plane', 'Shirt', 'Trash', 'Zap', 'Bell', 'MoreHorizontal'
];

export function CategoryManagement({ onBack }: CategoryManagementProps) {
    const [activeTab, setActiveTab] = useState<TransactionType>('expense');
    const categories = useCategories(activeTab);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Category>>({
        name: '',
        type: 'expense',
        icon: 'MoreHorizontal',
        color: '#6B7280',
        order: 0
    });

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('请输入分类名称');
            return;
        }

        try {
            if (editingId) {
                await categoryOperations.update(editingId, formData);
                setEditingId(null);
                toast.success('分类已更新');
            } else {
                await categoryOperations.add({
                    name: formData.name!,
                    type: activeTab,
                    icon: formData.icon || 'MoreHorizontal',
                    color: formData.color || '#6B7280',
                    order: categories.length,
                    isCustom: true
                });
                setIsAdding(false);
                toast.success('新分类已创建');
            }
            setFormData({ name: '', icon: 'MoreHorizontal', color: '#6B7280' });
        } catch (error: any) {
            toast.error('操作失败: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('确定要删除这个分类吗？相关账单分类将被标记为未知。')) {
            try {
                await categoryOperations.delete(id);
                toast.success('分类已删除');
            } catch (error: any) {
                toast.error('删除失败: ' + error.message);
            }
        }
    };

    const handleEdit = (category: Category) => {
        setEditingId(category.id);
        setFormData(category);
        setIsAdding(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-full bg-[var(--color-bg)]"
        >
            {/* Nav Header */}
            <div className="flex items-center gap-4 px-6 py-5 glass sticky top-0 z-50 border-b border-[var(--color-border)]/50">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] shadow-sm active:scale-95 transition-all"
                >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-[var(--color-text)] tracking-tight italic">分类管理</h2>
                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Bill Categories</p>
                </div>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: '', type: activeTab, icon: 'MoreHorizontal', color: '#6B7280' });
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 active:scale-95 transition-all"
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
            </div>

            {/* Type Switch Tabs */}
            <div className="px-4 pt-6">
                <div className="flex p-1.5 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]/50">
                    <button
                        onClick={() => setActiveTab('expense')}
                        className={cn(
                            "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                            activeTab === 'expense'
                                ? "bg-[var(--color-bg-card)] text-[var(--color-expense)] shadow-sm scale-102"
                                : "text-[var(--color-text-muted)] opacity-60"
                        )}
                    >
                        支出类
                    </button>
                    <button
                        onClick={() => setActiveTab('income')}
                        className={cn(
                            "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                            activeTab === 'income'
                                ? "bg-[var(--color-bg-card)] text-[var(--color-income)] shadow-sm scale-102"
                                : "text-[var(--color-text-muted)] opacity-60"
                        )}
                    >
                        收入类
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
                {/* Dynamic Form */}
                <AnimatePresence>
                    {(isAdding || editingId) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <Card padding="lg" shadow="premium" className="mb-4">
                                <h3 className="text-xs font-black text-[var(--color-primary)] uppercase tracking-widest mb-6">
                                    {editingId ? '优化分类详情' : '定影新类别'}
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">分类名称</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none"
                                                placeholder="输入名称"
                                            />
                                        </div>
                                        <div className="w-20 space-y-1.5">
                                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">色彩</label>
                                            <input
                                                type="color"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                className="w-full h-[52px] bg-[var(--color-bg-secondary)] rounded-2xl border-none p-1.5"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-3 block">视觉图标识别</label>
                                        <div className="grid grid-cols-6 gap-3 p-1.5 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]/30">
                                            {ICON_LIST.map(iconName => {
                                                const Icon = getIcon(iconName);
                                                return (
                                                    <button
                                                        key={iconName}
                                                        onClick={() => setFormData({ ...formData, icon: iconName })}
                                                        className={cn(
                                                            "aspect-square flex items-center justify-center rounded-xl transition-all active:scale-90",
                                                            formData.icon === iconName
                                                                ? "bg-[var(--color-primary)] text-white shadow-lg"
                                                                : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50"
                                                        )}
                                                    >
                                                        <Icon size={18} strokeWidth={2.5} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={handleSave}
                                            className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest"
                                        >
                                            <Check size={18} strokeWidth={3} className="mr-2" /> 确认操作
                                        </Button>
                                        <button
                                            onClick={() => {
                                                setIsAdding(false);
                                                setEditingId(null);
                                            }}
                                            className="px-6 h-12 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] rounded-2xl font-black uppercase tracking-widest text-[10px]"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Category List */}
                <div className="space-y-3 pb-20">
                    <AnimatePresence mode="popLayout">
                        {categories.map((category, index) => {
                            const IconComponent = getIcon(category.icon);
                            return (
                                <motion.div
                                    key={category.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    <div className="group flex items-center gap-4 p-4 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/30 transition-all hover:shadow-md active:scale-[0.99]">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                                            style={{ backgroundColor: category.color + '15' }}
                                        >
                                            <IconComponent size={24} style={{ color: category.color }} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-[var(--color-text)] tracking-tight truncate">{category.name}</h4>
                                                {!category.isCustom && (
                                                    <span className="text-[8px] font-black bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-full uppercase tracking-widest opacity-60">System</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-40 uppercase tracking-widest">
                                                {category.type === 'expense' ? 'Debit Structure' : 'Credit Structure'}
                                            </p>
                                        </div>
                                        {category.isCustom && (
                                            <div className="flex gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => handleEdit(category)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
                                                >
                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {categories.length === 0 && (
                        <div className="text-center py-20 opacity-30">
                            <Layers size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest">此分类下暂无项目</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

