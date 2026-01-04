import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit2, Trash2, Check, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccounts } from '../hooks/useTransactions';
import { accountOperations } from '../db/database';
import type { Account } from '../types';
import { getIcon } from '../utils/icons';
import { Card, Button } from '../components/ui';

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
        color: '#4F46E5',
        order: 0
    });

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('请输入账户名称');
            return;
        }

        try {
            if (editingId) {
                await accountOperations.update(editingId, formData);
                setEditingId(null);
                toast.success('账户已更新');
            } else {
                await accountOperations.add({
                    name: formData.name!,
                    type: formData.type as any,
                    initialBalance: formData.initialBalance || 0,
                    icon: formData.icon || 'CreditCard',
                    color: formData.color || '#4F46E5',
                    order: accounts.length
                });
                setIsAdding(false);
                toast.success('新账户已添加');
            }
            setFormData({ name: '', type: 'cash', initialBalance: 0, icon: 'CreditCard', color: '#4F46E5' });
        } catch (error: any) {
            toast.error('操作失败: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('确定要永久删除这个账户吗？')) {
            try {
                await accountOperations.delete(id);
                toast.success('账户已移除');
            } catch (error: any) {
                toast.error('删除失败: ' + error.message);
            }
        }
    };

    const handleEdit = (account: Account) => {
        setEditingId(account.id);
        setFormData(account);
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
                    <h2 className="text-xl font-black text-[var(--color-text)] tracking-tight italic">账户管理</h2>
                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Manage Assets</p>
                </div>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: '', type: 'cash', initialBalance: 0, icon: 'CreditCard', color: '#4F46E5' });
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
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
                            <Card padding="lg" shadow="premium" className="mb-4 border-2 border-[var(--color-primary)]/10">
                                <h3 className="text-xs font-black text-[var(--color-primary)] uppercase tracking-widest mb-6 px-1">
                                    {editingId ? '编辑现有账户' : '建立全新账户'}
                                </h3>
                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">账户名称</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                                            placeholder="例如: 现金额度、招商信用卡"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">初始余额</label>
                                            <input
                                                type="number"
                                                value={formData.initialBalance}
                                                onChange={e => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
                                                className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text)] font-bold px-4 py-3.5 rounded-2xl outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="px-1 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">视觉色彩</label>
                                            <input
                                                type="color"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                className="w-full h-[52px] bg-[var(--color-bg-secondary)] rounded-2xl border-none p-1.5"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={handleSave}
                                            className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest"
                                        >
                                            <Check size={18} strokeWidth={3} className="mr-2" /> 确认保存
                                        </Button>
                                        <button
                                            onClick={() => {
                                                setIsAdding(false);
                                                setEditingId(null);
                                            }}
                                            className="px-6 h-12 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[var(--color-border)] transition-colors"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Account Cards */}
                <div className="space-y-4 pb-20">
                    <AnimatePresence mode="popLayout">
                        {accounts.map((account, index) => {
                            const IconComponent = getIcon(account.icon);
                            return (
                                <motion.div
                                    key={account.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card padding="lg" shadow="md" className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                                        <div
                                            className="absolute top-0 right-0 w-24 h-24 blur-3xl rounded-full -mr-12 -mt-12 opacity-10"
                                            style={{ backgroundColor: account.color }}
                                        />
                                        <div className="flex items-center gap-4 relative">
                                            <div
                                                className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-lg shadow-black/5"
                                                style={{ backgroundColor: account.color + '15' }}
                                            >
                                                <IconComponent size={28} style={{ color: account.color }} strokeWidth={2.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h4 className="font-black text-[var(--color-text)] tracking-tight truncate">{account.name}</h4>
                                                    <p className="text-lg font-black text-[var(--color-primary)] tracking-tighter">
                                                        <span className="text-[10px] opacity-40 mr-1 italic">RM</span>
                                                        {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.1em] opacity-60">
                                                        Opening: RM{account.initialBalance.toFixed(2)}
                                                    </p>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                        <button
                                                            onClick={() => handleEdit(account)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all"
                                                        >
                                                            <Edit2 size={14} strokeWidth={2.5} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(account.id)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                        >
                                                            <Trash2 size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {accounts.length === 0 && (
                        <div className="text-center py-20 opacity-30">
                            <Banknote size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest">暂无账户信息</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

