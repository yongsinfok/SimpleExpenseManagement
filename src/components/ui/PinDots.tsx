import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface PinDotsProps {
    length: number;
    filled: number;
    className?: string;
    error?: boolean;
}

export function PinDots({ length, filled, className, error = false }: PinDotsProps) {
    return (
        <div className={cn("flex gap-6", className)}>
            {Array.from({ length }).map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        scale: filled === i ? 1.2 : 1,
                        backgroundColor: filled > i ? 'var(--color-primary)' : 'transparent'
                    }}
                    className={cn(
                        "w-4 h-4 rounded-full border-2 transition-colors",
                        filled > i
                            ? error
                                ? "border-red-500 bg-red-500 scale-110 shadow-lg shadow-red-500/30"
                                : "border-[var(--color-primary)] bg-[var(--color-primary)] scale-110 shadow-lg shadow-[var(--color-primary)]/30"
                            : "border-[var(--color-border)] scale-100 opacity-30"
                    )}
                />
            ))}
        </div>
    );
}
