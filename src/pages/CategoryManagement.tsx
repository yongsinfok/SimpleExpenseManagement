import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useCategories } from '../hooks/useTransactions';
import { categoryOperations } from '../db/database';
import type { Category, TransactionType } from '../types';
import { getIcon } from '../utils/icons';

interface CategoryManagementProps {
    onBack: () => void;
}

// 可选图标列表
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
                toast.success('分类更新成功');
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
                toast.success('分类添加成功');
            }
            setFormData({ name: '', icon: 'MoreHorizontal', color: '#6B7280' });
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('确定要删除这个分类吗？')) {
            try {
                await categoryOperations.delete(id);
                toast.success('分类已删除');
            } catch (error: any) {
                toast.error(error.message);
            }
        }
    };

    const handleEdit = (category: Category) => {
        setEditingId(category.id);
        setFormData(category);
        setIsAdding(false);
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg)]">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-3 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] sticky top-0 z-10">
                <button onClick={onBack} className="p-1 -ml-1 text-[var(--color-text)]">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="flex-1 text-lg font-bold text-[var(--color-text)]">分类管理</h2>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: '', type: activeTab, icon: 'MoreHorizontal', color: '#6B7280' });
                    }}
                    className="p-1 text-[var(--color-primary)]"
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 m-4 bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)]">
                <button
                    onClick={() => setActiveTab('expense')}
                    className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${activeTab === 'expense' ? 'bg-[var(--color-bg-card)] text-[var(--color-expense)] shadow-sm' : 'text-[var(--color-text-muted)]'
                        }`}
                >
                    支出分类
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${activeTab === 'income' ? 'bg-[var(--color-bg-card)] text-[var(--color-income)] shadow-sm' : 'text-[var(--color-text-muted)]'
                        }`}
                >
                    收入分类
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Add/Edit Form */}
                {(isAdding || editingId) && (
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 shadow-md border border-[var(--color-primary)]/20 animate-in fade-in slide-in-from-top-4 duration-300">
                        <h3 className="font-bold mb-4 text-[var(--color-text)]">{editingId ? '编辑分类' : '添加分类'}</h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">分类名称</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] px-3 py-2 rounded-[var(--radius-md)] border-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                        placeholder="分类名称"
                                    />
                                </div>
                                <div className="w-16">
                                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">颜色</label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full h-10 bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] border-none p-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-[var(--color-text-muted)] mb-2">选择图标</label>
                                <div className="grid grid-cols-7 gap-2">
                                    {ICON_LIST.map(iconName => {
                                        const Icon = getIcon(iconName);
                                        return (
                                            <button
                                                key={iconName}
                                                onClick={() => setFormData({ ...formData, icon: iconName })}
                                                className={`p-2 rounded-[var(--radius-md)] flex items-center justify-center transition-all ${formData.icon === iconName ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                                    }`}
                                            >
                                                <Icon size={18} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-[var(--color-primary)] text-white py-2 rounded-[var(--radius-md)] font-bold flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> 保存
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAdding(false);
                                        setEditingId(null);
                                    }}
                                    className="flex-1 bg-[var(--color-bg-secondary)] text-[var(--color-text)] py-2 rounded-[var(--radius-md)] flex items-center justify-center gap-2"
                                >
                                    <X size={18} /> 取消
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category List */}
                <div className="grid grid-cols-1 gap-3">
                    {categories.map(category => {
                        const IconComponent = getIcon(category.icon);
                        return (
                            <div
                                key={category.id}
                                className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-3 flex items-center gap-4 shadow-sm group border border-transparent hover:border-[var(--color-primary)]/30 transition-all"
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: category.color + '20' }}
                                >
                                    <IconComponent size={20} style={{ color: category.color }} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-[var(--color-text)]">{category.name}</h4>
                                    {!category.isCustom && (
                                        <span className="text-[10px] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded">系统</span>
                                    )}
                                </div>
                                {category.isCustom && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-expense)]"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
