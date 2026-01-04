import { getIcon } from '../../utils/icons';
import type { Category } from '../../types';

interface CategoryPickerProps {
    categories: Category[];
    selectedId?: string;
    onSelect: (category: Category) => void;
}

export function CategoryPicker({
    categories,
    selectedId,
    onSelect
}: CategoryPickerProps) {
    return (
        <div className="grid grid-cols-4 gap-3 p-4">
            {categories.map((category) => {
                const IconComponent = getIcon(category.icon);
                const isSelected = category.id === selectedId;

                return (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => onSelect(category)}
                        className={`
              flex flex-col items-center gap-2 p-3
              rounded-[var(--radius-lg)]
              transition-all duration-200
              ${isSelected
                                ? 'bg-[var(--color-primary)] text-white scale-105'
                                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
                            }
            `}
                    >
                        <div
                            className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${isSelected ? 'bg-white/20' : ''}
              `}
                            style={{
                                backgroundColor: isSelected ? undefined : category.color + '20',
                            }}
                        >
                            <IconComponent
                                size={22}
                                className={isSelected ? '' : ''}
                                style={{ color: isSelected ? 'white' : category.color }}
                            />
                        </div>
                        <span className="text-xs font-medium truncate w-full text-center">
                            {category.name}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// 紧凑版分类选择器 - 用于显示已选分类
interface CategoryBadgeProps {
    category: Category;
    onClick?: () => void;
}

export function CategoryBadge({ category, onClick }: CategoryBadgeProps) {
    const IconComponent = getIcon(category.icon);

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
        inline-flex items-center gap-2 px-3 py-1.5
        rounded-[var(--radius-full)]
        bg-[var(--color-bg-secondary)]
        text-[var(--color-text)]
        text-sm font-medium
        transition-colors hover:bg-[var(--color-border)]
      `}
        >
            <IconComponent size={16} style={{ color: category.color }} />
            {category.name}
        </button>
    );
}
