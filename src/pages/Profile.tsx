import { useState } from 'react';
import {
    Wallet,
    CreditCard,
    PieChart,
    Settings,
    Download,
    Upload,
    Trash2,
    Moon,
    Sun,
    ChevronRight,
    Database
} from 'lucide-react';
import { useAccounts } from '../hooks/useTransactions';
import { db } from '../db/database';
import { AccountManagement } from './AccountManagement';
import { CategoryManagement } from './CategoryManagement';

type ProfileView = 'main' | 'accounts' | 'categories';

export function ProfilePage() {
    const accounts = useAccounts();
    const [view, setView] = useState<ProfileView>('main');

    // 计算总资产
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    const handleExportData = async () => {
        try {
            const transactions = await db.transactions.toArray();
            const categories = await db.categories.toArray();
            const accountsData = await db.accounts.toArray();

            const backup = {
                transactions,
                categories,
                accounts: accountsData,
                exportDate: new Date().toISOString()
            };

            const data = JSON.stringify(backup, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `accounting_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('数据导出成功！建议妥善保管。');
        } catch (error) {
            console.error('Export failed:', error);
            alert('导出失败');
        }
    };

    const handleClearData = async () => {
        if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
            if (confirm('再次确认：清空所有账单、分类、账户和设置？')) {
                try {
                    await Promise.all([
                        db.transactions.clear(),
                        db.categories.clear(),
                        db.accounts.clear(),
                        db.budgets.clear()
                    ]);
                    localStorage.clear();
                    alert('数据已清空');
                    window.location.reload();
                } catch (error) {
                    console.error('Clear failed:', error);
                    alert('清空失败');
                }
            }
        }
    };

    if (view === 'accounts') {
        return <AccountManagement onBack={() => setView('main')} />;
    }

    if (view === 'categories') {
        return <CategoryManagement onBack={() => setView('main')} />;
    }

    const menuItems = [
        {
            icon: CreditCard,
            label: '账户管理',
            description: '管理你的现金、银行卡等账户',
            onClick: () => setView('accounts'),
        },
        {
            icon: PieChart,
            label: '分类管理',
            description: '自定义收支分类和图标',
            onClick: () => setView('categories'),
        },
        {
            icon: Download,
            label: '数据备份',
            description: '导出全量数据 JSON 备份',
            onClick: handleExportData,
        },
        {
            icon: Trash2,
            label: '清空数据',
            description: '重置应用到初始状态',
            onClick: handleClearData,
            danger: true,
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4 animate-in fade-in duration-300">
            {/* 资产卡片 */}
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-[var(--radius-xl)] p-5 shadow-lg relative overflow-hidden">
                {/* 装饰圆圈 */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-3xl" />

                <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                        <Wallet size={20} className="text-white/80" />
                        <span className="text-white/80 font-medium tracking-wide">总资产</span>
                    </div>
                    <p className="text-4xl font-bold tracking-tight">
                        <span className="text-xl mr-1 font-normal opacity-80">RM</span>
                        {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                            <span className="uppercase tracking-widest">账户概览</span>
                            <span>{accounts.length}个账户</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {accounts.slice(0, 4).map((account) => (
                                <div key={account.id} className="flex items-center justify-between text-sm py-0.5">
                                    <span className="text-white/70 truncate mr-2">{account.name}</span>
                                    <span className="font-medium whitespace-nowrap">RM{account.balance.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 功能菜单 */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] border border-[var(--color-border)]/50">
                {menuItems.map((item, index) => (
                    <button
                        key={item.label}
                        onClick={item.onClick}
                        className={`
              w-full flex items-center gap-4 p-4 text-left
              hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-secondary)] transition-colors
              ${index < menuItems.length - 1 ? 'border-b border-[var(--color-border)]' : ''}
            `}
                    >
                        <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${item.danger ? 'bg-red-500/10' : 'bg-[var(--color-primary)]/10'}
            `}>
                            <item.icon
                                size={20}
                                className={item.danger ? 'text-[var(--color-expense)]' : 'text-[var(--color-primary)]'}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-bold ${item.danger ? 'text-[var(--color-expense)]' : 'text-[var(--color-text)]'}`}>
                                {item.label}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] truncate">{item.description}</p>
                        </div>
                        <ChevronRight size={18} className="text-[var(--color-text-muted)] shrink-0" />
                    </button>
                ))}
            </div>

            {/* 关于 */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]/50">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-2xl flex items-center justify-center shadow-md shadow-[var(--color-primary)]/20">
                        <Database size={32} className="text-white" />
                    </div>
                    <h3 className="font-extrabold text-xl text-[var(--color-text)] tracking-tight">简记账</h3>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] opacity-60 mt-1 uppercase tracking-widest">Version 1.0.0</p>
                    <div className="w-8 h-1 bg-[var(--color-primary)] opacity-20 mx-auto my-4 rounded-full" />
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                        简洁高效的个人记账应用<br />
                        <span className="text-[10px] mt-2 block opacity-50 italic">数据完全本地存储，隐私至上</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
