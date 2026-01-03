import { useState } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAccounts } from '../hooks/useTransactions';
import { accountOperations, type Account } from '../db/database';

interface AccountManagementProps {
    onBack: () => void;
}

export function AccountManagement({ onBack }: AccountManagementProps) {
    const accounts = useAccounts();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Account>>({
        name: '',
        type: 'cash',
        initialBalance: 0,
        icon: 'CreditCard',
        color: '#3B82F6',
        order: 0
    });

    const handleSave = async () => {
        if (!formData.name) {
            alert('请输入账户名称');
            return;
        }

        try {
            if (editingId) {
                await accountOperations.update(editingId, formData);
                setEditingId(null);
            } else {
                await accountOperations.add({
                    name: formData.name!,
                    type: formData.type as any,
                    initialBalance: formData.initialBalance || 0,
                    icon: formData.icon || 'CreditCard',
                    color: formData.color || '#3B82F6',
                    order: accounts.length
                });
                setIsAdding(false);
            }
            setFormData({ name: '', type: 'cash', initialBalance: 0, icon: 'CreditCard', color: '#3B82F6' });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('确定要删除这个账户吗？')) {
            try {
                await accountOperations.delete(id);
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const handleEdit = (account: Account) => {
        setEditingId(account.id);
        setFormData(account);
        setIsAdding(false);
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg)]">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-3 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] sticky top-0 z-10">
                <button onClick={onBack} className="p-1 -ml-1 text-[var(--color-text)]">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="flex-1 text-lg font-bold text-[var(--color-text)]">账户管理</h2>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: '', type: 'cash', initialBalance: 0, icon: 'CreditCard', color: '#3B82F6' });
                    }}
                    className="p-1 text-[var(--color-primary)]"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Add/Edit Form */}
                {(isAdding || editingId) && (
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 shadow-md border border-[var(--color-primary)]/20 animate-in fade-in slide-in-from-top-4 duration-300">
                        <h3 className="font-bold mb-4 text-[var(--color-text)]">{editingId ? '编辑账户' : '添加账户'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-[var(--color-text-muted)] mb-1">账户名称</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] px-3 py-2 rounded-[var(--radius-md)] border-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="例如：招商银行"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">初始余额</label>
                                    <input
                                        type="number"
                                        value={formData.initialBalance}
                                        onChange={e => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
                                        className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] px-3 py-2 rounded-[var(--radius-md)] border-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">颜色</label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full h-10 bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] border-none p-1"
                                    />
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

                {/* Account List */}
                <div className="space-y-3">
                    {accounts.map(account => {
                        const IconComponent = (LucideIcons as any)[account.icon] || LucideIcons.CreditCard;
                        return (
                            <div
                                key={account.id}
                                className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 flex items-center gap-4 shadow-sm group border border-transparent hover:border-[var(--color-primary)]/30 transition-all"
                            >
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: account.color + '20' }}
                                >
                                    <IconComponent size={24} style={{ color: account.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-[var(--color-text)] truncate">{account.name}</h4>
                                        <span className="font-semibold text-[var(--color-primary)]">
                                            RM{account.balance.toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        初始: RM{account.initialBalance.toFixed(2)}
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(account)}
                                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(account.id)}
                                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-expense)]"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
