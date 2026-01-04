import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    showClose?: boolean;
    fullScreen?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    showClose = true,
    fullScreen = false
}: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0.5 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`
                            relative bg-[var(--color-bg-card)] w-full
                            ${fullScreen
                                ? 'h-full rounded-none'
                                : 'max-h-[92vh] rounded-t-[2.5rem] sm:rounded-[2rem] sm:max-w-lg sm:mx-4 shadow-2xl'
                            }
                            safe-area-inset-bottom
                            overflow-hidden flex flex-col
                        `}
                    >
                        {/* Header */}
                        {(title || showClose) && (
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]/50">
                                <h2 className="text-xl font-black text-[var(--color-text)] tracking-tight italic">
                                    {title}
                                </h2>
                                {showClose && (
                                    <button
                                        onClick={onClose}
                                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-all active:scale-90"
                                        aria-label="关闭"
                                    >
                                        <X size={20} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto hide-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    height?: 'auto' | 'half' | 'full';
}

export function BottomSheet({
    isOpen,
    onClose,
    children,
    height = 'auto'
}: BottomSheetProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const heightStyles = {
        auto: 'max-h-[85vh]',
        half: 'h-[50vh]',
        full: 'h-[90vh]'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                        className={`
                            absolute bottom-0 left-0 right-0
                            bg-[var(--color-bg-card)]
                            rounded-t-[2.5rem]
                            safe-area-inset-bottom
                            overflow-hidden flex flex-col
                            shadow-2xl shadow-black/20
                            ${heightStyles[height]}
                        `}
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center py-4">
                            <div className="w-12 h-1.5 bg-[var(--color-border)] rounded-full opacity-40" />
                        </div>
                        <div className="flex-1 overflow-y-auto hide-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

