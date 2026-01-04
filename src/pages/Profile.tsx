import { useState } from 'react';
import { CreditCard, PieChart, Download, Shield, Wallet, ChevronRight, Settings, Sun, Moon, Monitor, Database, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '../hooks/useTransactions';
import { useSecurity } from '../contexts/SecurityContext';
import { Modal, NumberPad } from '../components/ui';
import { db } from '../db/database';
import { AccountManagement } from './AccountManagement';
import { CategoryManagement } from './CategoryManagement';
import { BudgetManagement } from './BudgetManagement';
import { useTheme } from '../contexts/ThemeContext';

type ProfileView = 'main' | 'accounts' | 'categories' | 'budgets';

export function ProfilePage() {
    // 1. All Hooks First
    const accounts = useAccounts();
    const [view, setView] = useState<ProfileView>('main');
    const { hasPin, setPin, removePin } = useSecurity();
    const { theme, setTheme } = useTheme();

    const [showPinSetup, setShowPinSetup] = useState(false);
    const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
    const [firstPin, setFirstPin] = useState('');
    const [inputPin, setInputPin] = useState('');

    // 2. Calculations
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // 3. Handlers
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
            toast.success('数据导出成功！建议妥善保管。');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('导出失败');
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
                    toast.success('数据已清空');
                    setTimeout(() => window.location.reload(), 1000);
                } catch (error) {
                    console.error('Clear failed:', error);
                    toast.error('清空失败');
                }
            }
        }
    };

    const handlePinAction = () => {
        if (hasPin) {
            if (confirm('确定要关闭应用锁吗？')) {
                removePin();
            }
        } else {
            setPinStep('create');
            setFirstPin('');
            setInputPin('');
            setShowPinSetup(true);
        }
    };

    const handlePinInput = (value: string) => {
        if (value.length > 4) return;
        setInputPin(value);

        if (value.length === 4) {
            if (pinStep === 'create') {
                setFirstPin(value);
                setPinStep('confirm');
                setTimeout(() => setInputPin(''), 300);
            } else {
                if (value === firstPin) {
                    setPin(value);
                    setShowPinSetup(false);
                    toast.success('应用锁已开启');
                } else {
                    toast.error('两次输入的密码不一致，请重试');
                    setPinStep('create');
                    setFirstPin('');
                    setInputPin('');
                }
            }
        }
    };

    // 4. Constants
    interface MenuItem {
        icon: any;
        label: string;
        description: string;
        onClick: () => void;
        danger?: boolean;
    }

    const menuItems: MenuItem[] = [
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
            icon: Wallet,
            label: '预算管理',
            description: '设置每月消费限额',
            onClick: () => setView('budgets'),
        },
        {
            icon: Lock,
            label: '应用锁',
            description: hasPin ? '已开启' : '未开启',
            onClick: handlePinAction,
        },
        {
            icon: Download,
            label: '导出数据',
            description: '导出 CSV 格式的账单数据',
            onClick: handleExportData,
        },
        {
            icon: Shield,
            label: '数据安全',
            description: '备份或清除本地所有数据',
            onClick: handleClearData,
            danger: true,
        },
    ];

    // 5. Conditional Returns (AFTER hooks)
    if (view === 'accounts') {
        return <AccountManagement onBack={() => setView('main')} />;
    }

    if (view === 'categories') {
        return <CategoryManagement onBack={() => setView('main')} />;
    }

    if (view === 'budgets') {
        return <BudgetManagement onBack={() => setView('main')} />;
    }

    if (showPinSetup) {
        return (
            <Modal
                isOpen={true}
                onClose={() => setShowPinSetup(false)}
                title={pinStep === 'create' ? '设置 PIN 码' : '确认 PIN 码'}
            >
                <div className="p-4">
                    <div className="flex justify-center gap-4 mb-8">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`
                                    w-4 h-4 rounded-full border-2 transition-all duration-200
                                    ${inputPin.length > i
                                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                        : 'border-[var(--color-border)] bg-transparent'
                                    }
                                `}
                            />
                        ))}
                    </div>
                    <p className="text-center text-[var(--color-text-secondary)] mb-6">
                        {pinStep === 'create' ? '请输入4位数字密码' : '请再次输入以确认'}
                    </p>
                    <NumberPad
                        value={inputPin}
                        onChange={handlePinInput}
                        maxLength={4}
                        hideDecimal
                    />
                </div>
            </Modal>
        );
    }

    // 6. Main Render
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

            {/* 主题切换 */}
            <div className="bg-[var(--color-bg-card)] rounded-3xl p-4 shadow-sm border border-[var(--color-border)]/50">
                <div className="flex items-center gap-3 mb-4 px-1">
                    <Settings size={18} className="text-[var(--color-primary)]" />
                    <span className="text-sm font-black text-[var(--color-text)] uppercase tracking-widest">外观设置</span>
                </div>
                <div className="flex p-1 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]/50">
                    {[
                        { id: 'light', icon: Sun, label: '浅色' },
                        { id: 'dark', icon: Moon, label: '深色' },
                        { id: 'system', icon: Monitor, label: '系统' }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTheme(item.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${theme === item.id
                                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm'
                                : 'text-[var(--color-text-muted)]'
                                }`}
                        >
                            <item.icon size={14} />
                            {item.label}
                        </button>
                    ))}
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
