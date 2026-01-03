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

export function ProfilePage() {
    const accounts = useAccounts();
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

    // 计算总资产
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    const handleExportData = async () => {
        try {
            const transactions = await db.transactions.toArray();
            const data = JSON.stringify(transactions, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `accounting_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('导出成功！');
        } catch (error) {
            console.error('Export failed:', error);
            alert('导出失败');
        }
    };

    const handleClearData = async () => {
        if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
            if (confirm('再次确认：清空所有账单、分类和账户数据？')) {
                try {
                    await db.transactions.clear();
                    alert('数据已清空');
                    window.location.reload();
                } catch (error) {
                    console.error('Clear failed:', error);
                    alert('清空失败');
                }
            }
        }
    };

    const menuItems = [
        {
            icon: CreditCard,
            label: '账户管理',
            description: '管理你的账户',
            onClick: () => alert('功能开发中...'),
        },
        {
            icon: PieChart,
            label: '分类管理',
            description: '自定义收支分类',
            onClick: () => alert('功能开发中...'),
        },
        {
            icon: Download,
            label: '导出数据',
            description: '备份你的账单数据',
            onClick: handleExportData,
        },
        {
            icon: Trash2,
            label: '清空数据',
            description: '删除所有记录',
            onClick: handleClearData,
            danger: true,
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4">
            {/* 资产卡片 */}
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-[var(--radius-xl)] p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                    <Wallet size={20} />
                    <span className="text-white/80">总资产</span>
                </div>
                <p className="text-3xl font-bold">
                    RM{totalBalance.toFixed(2)}
                </p>
                <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-xs text-white/60 mb-2">账户概览</p>
                    <div className="grid grid-cols-2 gap-2">
                        {accounts.slice(0, 4).map((account) => (
                            <div key={account.id} className="flex items-center justify-between text-sm">
                                <span className="text-white/80">{account.name}</span>
                                <span className="font-medium">RM{account.balance.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 功能菜单 */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
                {menuItems.map((item, index) => (
                    <button
                        key={item.label}
                        onClick={item.onClick}
                        className={`
              w-full flex items-center gap-4 p-4 text-left
              hover:bg-[var(--color-bg-secondary)] transition-colors
              ${index < menuItems.length - 1 ? 'border-b border-[var(--color-border)]' : ''}
            `}
                    >
                        <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${item.danger ? 'bg-red-100' : 'bg-[var(--color-bg-secondary)]'}
            `}>
                            <item.icon
                                size={20}
                                className={item.danger ? 'text-[var(--color-expense)]' : 'text-[var(--color-primary)]'}
                            />
                        </div>
                        <div className="flex-1">
                            <p className={`font-medium ${item.danger ? 'text-[var(--color-expense)]' : 'text-[var(--color-text)]'}`}>
                                {item.label}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">{item.description}</p>
                        </div>
                        <ChevronRight size={20} className="text-[var(--color-text-muted)]" />
                    </button>
                ))}
            </div>

            {/* 关于 */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-2xl flex items-center justify-center">
                        <Database size={32} className="text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-[var(--color-text)]">简记账</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">版本 1.0.0</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        简洁高效的个人记账应用<br />
                        数据存储在本地，保护你的隐私
                    </p>
                </div>
            </div>
        </div>
    );
}
