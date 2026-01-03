import { Home, List, PieChart, User, Plus } from 'lucide-react';

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
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] safe-area-inset-bottom z-40">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isAdd = tab.id === 'add';

                    if (isAdd) {
                        return (
                            <button
                                key={tab.id}
                                onClick={onAddClick}
                                className="relative -mt-6"
                                aria-label={tab.label}
                            >
                                <div className="w-14 h-14 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg transition-transform active:scale-95">
                                    <Plus size={28} className="text-white" />
                                </div>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                flex flex-col items-center justify-center gap-1 py-2 px-4
                transition-colors
                ${isActive
                                    ? 'text-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)]'
                                }
              `}
                            aria-label={tab.label}
                        >
                            <Icon size={24} />
                            <span className="text-xs font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
