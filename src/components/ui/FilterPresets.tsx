import { filterPresets } from '../../utils/calendar';
import { cn } from '../../utils/cn';

interface FilterPresetsProps {
    activePresetId: string;
    onPresetChange: (presetId: string) => void;
    disabled?: boolean;
}

export function FilterPresets({ activePresetId, onPresetChange, disabled = false }: FilterPresetsProps) {
    return (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filterPresets.map((preset) => (
                <button
                    key={preset.id}
                    onClick={() => onPresetChange(preset.id)}
                    disabled={disabled}
                    className={cn(
                        "shrink-0 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        activePresetId === preset.id
                            ? "bg-[var(--color-text)] text-[var(--color-bg)] border-[var(--color-text)] shadow-lg"
                            : "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)]",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {preset.label}
                </button>
            ))}
        </div>
    );
}
