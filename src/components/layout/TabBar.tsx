import { Home, List, PieChart, User, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export type TabId = 'home' | 'bills' | 'add' | 'charts' | 'profile';

interface TabBarProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    onAddClick: () => void;
}

const tabs = [
    { id: 'home' as const, label: '首页', icon: Home },
    { id: 'bills' as const, label: '账单', icon: List },
    { id: 'add' as const, label: '记账', icon: Plus },
    { id: 'charts' as const, label: '图表', icon: PieChart },
    { id: 'profile' as const, label: '我的', icon: User },
];

export function TabBar({ activeTab, onTabChange, onAddClick }: TabBarProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 glass safe-area-bottom z-40 px-2 pb-1 border-t-0 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isAdd = tab.id === 'add';

                    if (isAdd) {
                        return (
                            <button
                                key={tab.id}
                                onClick={onAddClick}
                                className="relative -mt-10 z-50 group"
                                aria-label={tab.label}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(99,102,241,0.6)] group-hover:shadow-[0_12px_24px_-8px_rgba(99,102,241,0.8)] transition-shadow duration-300"
                                >
                                    <Plus size={32} className="text-white" strokeWidth={2.5} />
                                </motion.div>
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                relative flex flex-col items-center justify-center gap-1.5 py-1 px-4 min-w-[64px]
                                transition-all duration-300
                                ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}
                                hover:text-[var(--color-primary-light)]
                            `}
                            aria-label={tab.label}
                        >
                            <motion.div
                                animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            </motion.div>

                            <span className={`text-[11px] font-bold tracking-tight transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}`}>
                                {tab.label}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
