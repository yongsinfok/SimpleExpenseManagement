import { useState } from 'react';
import { CreditCard, PieChart, Download, Shield, Wallet, ChevronRight, Settings, Sun, Moon, Monitor, Database, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAccounts } from '../hooks/useTransactions';
import { useSecurity } from '../contexts/SecurityContext';
import { Modal, NumberPad, Card } from '../components/ui';
import { db } from '../db/database';
import { AccountManagement } from './AccountManagement';
import { CategoryManagement } from './CategoryManagement';
import { BudgetManagement } from './BudgetManagement';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils/cn';

type ProfileView = 'main' | 'accounts' | 'categories' | 'budgets';

export function ProfilePage() {
    const accounts = useAccounts();
    const [view, setView] = useState<ProfileView>('main');
    const { hasPin, setPin, removePin } = useSecurity();
    const { theme, setTheme } = useTheme();

    const [showPinSetup, setShowPinSetup] = useState(false);
    const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
    const [firstPin, setFirstPin] = useState('');
    const [inputPin, setInputPin] = useState('');

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
            a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            toast.success('数据导出成功！建议妥善保管。');
        } catch (error) {
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
                    toast.error('清空失败');
                }
            }
        }
    };

    const handlePinAction = () => {
        if (hasPin) {
            if (confirm('确定要关闭应用锁吗？')) {
                removePin();
                toast.success('应用锁已关闭');
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
                    toast.error('输入的 PIN 码不一致');
                    setPinStep('create');
                    setFirstPin('');
                    setInputPin('');
                }
            }
        }
    };

    if (view === 'accounts') return <AccountManagement onBack={() => setView('main')} />;
    if (view === 'categories') return <CategoryManagement onBack={() => setView('main')} />;
    if (view === 'budgets') return <BudgetManagement onBack={() => setView('main')} />;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto pb-28 px-4 pt-6 space-y-6 hide-scrollbar"
        >
            {/* Wallet Card */}
            <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="relative h-56 rounded-[2.5rem] bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#818CF8] text-white p-7 shadow-2xl shadow-indigo-500/30 overflow-hidden"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-300/20 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

                <div className="relative h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Current Balance</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-black opacity-40">RM</span>
                                <span className="text-4xl font-black tracking-tighter">
                                    {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Wallet size={24} strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="flex items-end justify-between">
                        <div className="space-y-1">
                            <div className="flex -space-x-2">
                                {accounts.slice(0, 3).map((acc, idx) => (
                                    <div key={acc.id} className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-indigo-400 flex items-center justify-center text-[10px] font-bold" style={{ zIndex: 10 - idx }}>
                                        {acc.name[0]}
                                    </div>
                                ))}
                                {accounts.length > 3 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-white/20 flex items-center justify-center text-[10px] font-bold z-0">
                                        +{accounts.length - 3}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-white/50">{accounts.length} Active Accounts</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Savings Rate</p>
                            <p className="text-sm font-black text-indigo-100">+12.5%</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Appearance Settings */}
            <Card padding="lg" shadow="md">
                <div className="flex items-center gap-3 mb-5 px-1">
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <Settings size={18} className="text-[var(--color-primary)]" strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black text-[var(--color-text)] uppercase tracking-widest">外观设置</span>
                </div>
                <div className="flex p-1.5 bg-[var(--color-bg-secondary)] rounded-[1.25rem] border border-[var(--color-border)]/50">
                    {[
                        { id: 'light', icon: Sun, label: '浅色模式' },
                        { id: 'dark', icon: Moon, label: '深色模式' },
                        { id: 'system', icon: Monitor, label: '系统随动' }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTheme(item.id as any)}
                            className={cn(
                                "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all",
                                theme === item.id
                                    ? "bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm scale-105"
                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                            )}
                        >
                            <item.icon size={16} strokeWidth={2.5} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Menu Groups */}
            <div className="space-y-3">
                <p className="px-2 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">基础管理</p>
                <Card padding="none" shadow="md" className="overflow-hidden">
                    <div className="divide-y divide-[var(--color-border)]/30">
                        {[
                            { icon: CreditCard, label: '账户管理', desc: '现金、银行卡及电子钱包', onClick: () => setView('accounts') },
                            { icon: PieChart, label: '分类管理', desc: '图表及账单分类规则', onClick: () => setView('categories') },
                            { icon: Wallet, label: '预算管理', desc: '每月支出额度预警', onClick: () => setView('budgets') },
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={item.onClick}
                                className="w-full flex items-center gap-4 p-5 hover:bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-all group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center group-hover:bg-[var(--color-primary)]/[0.08] transition-colors">
                                    <item.icon size={20} className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-black text-[var(--color-text)] tracking-tight">{item.label}</p>
                                    <p className="text-[11px] font-medium text-[var(--color-text-muted)] opacity-60">{item.desc}</p>
                                </div>
                                <ChevronRight size={18} className="text-[var(--color-text-muted)] opacity-40" />
                            </button>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="space-y-3">
                <p className="px-2 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">高级与安全</p>
                <Card padding="none" shadow="md" className="overflow-hidden">
                    <div className="divide-y divide-[var(--color-border)]/30">
                        {[
                            { icon: Lock, label: '应用锁设置', desc: hasPin ? '已通过 PIN 码保护' : '未开启锁屏验证', onClick: handlePinAction },
                            { icon: Download, label: '导出备份', desc: '导出全量 JSON 备份数据', onClick: handleExportData },
                            { icon: Shield, label: '抹除所有数据', desc: '立即永久清除本地所有数据', onClick: handleClearData, danger: true },
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={item.onClick}
                                className="w-full flex items-center gap-4 p-5 hover:bg-[var(--color-bg-secondary)] active:scale-[0.98] transition-all group"
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center",
                                    item.danger ? "group-hover:bg-red-500/10" : "group-hover:bg-[var(--color-primary)]/[0.08]"
                                )}>
                                    <item.icon size={20} className={cn("text-[var(--color-text-secondary)]", item.danger ? "group-hover:text-red-500" : "group-hover:text-[var(--color-primary)]")} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className={cn("text-sm font-black tracking-tight", item.danger ? "text-red-500" : "text-[var(--color-text)]")}>{item.label}</p>
                                    <p className="text-[11px] font-medium text-[var(--color-text-muted)] opacity-60">{item.desc}</p>
                                </div>
                                <ChevronRight size={18} className="text-[var(--color-text-muted)] opacity-40" />
                            </button>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Version Footer */}
            <div className="py-8 flex flex-col items-center">
                <div className="w-14 h-14 rounded-3xl glass mb-4 flex items-center justify-center shadow-lg">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Database size={18} className="text-white" />
                    </div>
                </div>
                <h4 className="text-base font-black text-[var(--color-text)] tracking-tight">简记账 Pocket Ledger</h4>
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-3 py-1 rounded-full mt-2 uppercase tracking-widest">Version 1.0.0 Stable</p>
            </div>

            {/* PIN Setup Modal */}
            <AnimatePresence>
                {showPinSetup && (
                    <Modal
                        isOpen={true}
                        onClose={() => setShowPinSetup(false)}
                        title={pinStep === 'create' ? '设置新 PIN 码' : '请确认 PIN 码'}
                    >
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="p-6 pt-2"
                        >
                            <div className="flex justify-center gap-5 mb-10">
                                {[0, 1, 2, 3].map((i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            scale: inputPin.length === i ? 1.2 : 1,
                                            backgroundColor: inputPin.length > i ? 'var(--color-primary)' : 'transparent'
                                        }}
                                        className={cn(
                                            "w-4 h-4 rounded-full border-2 transition-colors",
                                            inputPin.length > i ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"
                                        )}
                                    />
                                ))}
                            </div>
                            <p className="text-center text-xs font-bold text-[var(--color-text-secondary)] opacity-60 mb-8 uppercase tracking-widest">
                                {pinStep === 'create' ? '请输入4位数字作为您的应用锁' : '请再次输入刚才的数字以防止错误'}
                            </p>
                            <NumberPad
                                value={inputPin}
                                onChange={handlePinInput}
                                maxLength={4}
                                hideDecimal
                            />
                        </motion.div>
                    </Modal>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

