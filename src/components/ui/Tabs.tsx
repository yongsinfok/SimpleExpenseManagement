import type { ReactNode } from 'react';

interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
    className?: string;
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
    return (
        <div className={`flex p-1 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)]/50 ${className}`}>
            {Array.isArray(children) ? children.map((child: any) => {
                return {
                    ...child,
                    props: {
                        ...child.props,
                        isSelected: child.props.value === value,
                        onClick: () => onValueChange(child.props.value)
                    }
                };
            }) : children}
        </div>
    );
}

interface TabsListProps {
    children: ReactNode;
    className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
    return (
        <div className={`flex w-full ${className}`}>
            {children}
        </div>
    );
}

interface TabsTriggerProps {
    value: string;
    children: ReactNode;
    isSelected?: boolean;
    onClick?: () => void;
    className?: string;
}

export function TabsTrigger({ children, isSelected, onClick, className = '' }: TabsTriggerProps) {
    return (
        <button
            className={`
                flex-1 py-1.5 text-xs font-bold rounded-lg transition-all
                ${isSelected
                    ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }
                ${className}
            `}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

interface TabsContentProps {
    value: string;
    currentValue?: string; // Passed from parent if needed, but usually handled by conditional rendering in parent
    children: ReactNode;
}

export function TabsContent({ children }: TabsContentProps) {
    // Note: In many implementations (like Radix UI), TabsContent is conditionally rendered by Tabs.
    // Here, for simplicity, we might assume the parent handles rendering or we check context.
    // Given the previous usage in CategoryManagement, it likely just renders content.
    // But checking usage pattern in CategoryManagement is better.
    // If usage is: <Tabs value={tab} onValueChange={setTab}> <TabsList>...</TabsList> <TabsContent value="a">...</TabsContent> </Tabs>
    return <div>{children}</div>;
}
