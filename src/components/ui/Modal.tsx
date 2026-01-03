import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

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
    const modalRef = useRef<HTMLDivElement>(null);

    // 阻止背景滚动
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

    // ESC关闭
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* 遮罩层 */}
            <div
                className="absolute inset-0 bg-black/50 animate-fade-in"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div
                ref={modalRef}
                className={`
          relative bg-[var(--color-bg-card)] w-full
          animate-slide-up
          ${fullScreen
                        ? 'h-full rounded-none'
                        : 'max-h-[90vh] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] sm:max-w-lg sm:mx-4'
                    }
          safe-area-inset-bottom
          overflow-hidden flex flex-col
        `}
            >
                {/* 标题栏 */}
                {(title || showClose) && (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                        <h2 className="text-lg font-semibold text-[var(--color-text)]">
                            {title}
                        </h2>
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                                aria-label="关闭"
                            >
                                <X size={24} className="text-[var(--color-text-secondary)]" />
                            </button>
                        )}
                    </div>
                )}

                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

// 底部弹出Sheet
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

    if (!isOpen) return null;

    const heightStyles = {
        auto: 'max-h-[90vh]',
        half: 'h-[50vh]',
        full: 'h-[90vh]'
    };

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/50 animate-fade-in"
                onClick={onClose}
            />
            <div
                className={`
          absolute bottom-0 left-0 right-0
          bg-[var(--color-bg-card)]
          rounded-t-[var(--radius-xl)]
          animate-slide-up
          safe-area-inset-bottom
          overflow-hidden flex flex-col
          ${heightStyles[height]}
        `}
            >
                {/* 拖拽条 */}
                <div className="flex justify-center py-2">
                    <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
