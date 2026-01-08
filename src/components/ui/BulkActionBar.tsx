import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, CheckSquare, Square } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BulkActionBarProps {
    selectedCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onDelete: () => void;
    onCancel: () => void;
    isAllSelected: boolean;
    isDeleting?: boolean;
}

export function BulkActionBar({
    selectedCount,
    onSelectAll,
    onDeselectAll,
    onDelete,
    onCancel,
    isAllSelected,
    isDeleting = false,
}: BulkActionBarProps) {
    return (
        <AnimatePresence>
            {selectedCount > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-24 left-4 right-4 z-50"
                >
                    <div className="bg-[var(--color-bg-card)] rounded-3xl shadow-2xl border border-[var(--color-border)]/50 backdrop-blur-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4">
                            {/* 左侧：选择信息 */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={isAllSelected ? onDeselectAll : onSelectAll}
                                    className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                                >
                                    {isAllSelected ? (
                                        <CheckSquare size={20} strokeWidth={2.5} className="text-[var(--color-primary)]" />
                                    ) : (
                                        <Square size={20} strokeWidth={2.5} />
                                    )}
                                    <span className="text-xs font-black uppercase tracking-widest">
                                        {isAllSelected ? '取消全选' : '全选'}
                                    </span>
                                </button>
                                <div className="h-6 w-px bg-[var(--color-border)]" />
                                <span className="text-sm font-black text-[var(--color-text)]">
                                    已选择 <span className="text-[var(--color-primary)]">{selectedCount}</span> 项
                                </span>
                            </div>

                            {/* 右侧：操作按钮 */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onDelete}
                                    disabled={isDeleting}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                        isDeleting
                                            ? "bg-red-500/50 text-white cursor-not-allowed"
                                            : "bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-lg shadow-red-500/20"
                                    )}
                                >
                                    {isDeleting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 size={16} strokeWidth={2.5} />
                                    )}
                                    删除
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all active:scale-95"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
