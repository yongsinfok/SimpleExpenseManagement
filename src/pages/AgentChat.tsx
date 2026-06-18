import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, BarChart3, Wallet, Target, Search, Repeat, SquarePen, MoreVertical, Archive, Trash2, MessageSquare, Plus, X, PanelLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../hooks/useAgent';
import { getApiKey } from '../agent/chatService';
import { cn } from '../utils/cn';
import type { AIMessage, AIToolCall, AIToolResult } from '../types';

interface AgentChatProps {
    onOpenSettings: () => void;
}

// 工具名 → 友好标签 + 图标
const TOOL_META: Record<string, { label: string; icon: typeof BarChart3 }> = {
    get_period_summary: { label: '汇总收支', icon: BarChart3 },
    get_account_balances: { label: '查询账户余额', icon: Wallet },
    get_budget_status: { label: '查询预算', icon: Target },
    get_savings_goals: { label: '查询储蓄目标', icon: Target },
    query_transactions: { label: '查询交易明细', icon: Search },
    get_user_preferences: { label: '读取偏好', icon: Sparkles },
};

const SUGGESTIONS = [
    '我这个月还能拿出多少钱投资？',
    '对比我本月收入和支出',
    '我的预算执行得怎么样？',
    '按分类看看我这月花了多少',
];

// 助手头像
function AssistantAvatar({ size = 28 }: { size?: number }) {
    return (
        <div
            style={{ width: size, height: size }}
            className="flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center shadow-sm self-end"
        >
            <Sparkles size={size * 0.55} className="text-white" />
        </div>
    );
}

function ToolBadge({ toolCall, result }: { toolCall: AIToolCall; result?: AIToolResult }) {
    const meta = TOOL_META[toolCall.name] || { label: toolCall.name, icon: Repeat };
    const Icon = meta.icon;
    const done = !!result;
    return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-secondary)]">
            <Icon size={12} className={done ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] animate-pulse'} />
            <span>{done ? `${meta.label} ✓` : `${meta.label}…`}</span>
        </div>
    );
}

// Claude-Code 风格的折叠压缩指示器
function CompactionIndicator({ message }: { message: AIMessage }) {
    const [expanded, setExpanded] = useState(false);
    const count = message.summaryCount;
    return (
        <div className="flex justify-start">
            <div className="max-w-[90%] w-full">
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="w-full flex items-center gap-2 pl-1 pr-3 py-2 text-left group"
                >
                    <span className="text-[var(--color-text-muted)] text-base leading-none select-none">⎿</span>
                    <Archive size={13} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    <span className="text-xs font-medium text-[var(--color-text-muted)] flex-1 truncate">
                        {count ? `已压缩 ${count} 条对话` : '已压缩历史对话'}
                        <span className="opacity-60"> · 点击展开</span>
                    </span>
                    <ChevronRight
                        size={14}
                        className={cn('text-[var(--color-text-muted)] transition-transform', expanded && 'rotate-90')}
                    />
                </button>
                <AnimatePresence initial={false}>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden ml-5"
                        >
                            <div className="mt-1 pl-3 border-l-2 border-[var(--color-border)] text-[11px] leading-relaxed text-[var(--color-text-muted)] whitespace-pre-wrap">
                                {message.content}
                            </div>
                            <p className="mt-1.5 ml-3 text-[10px] text-[var(--color-text-muted)] opacity-50">
                                之前的对话已折叠以节省 token（模型仍记得要点）
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function MessageBubble({ message }: { message: AIMessage }) {
    const isUser = message.role === 'user';
    if (message.role === 'tool') return null;
    if (message.isSummary) return <CompactionIndicator message={message} />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-2.5 items-end', isUser ? 'justify-end' : 'justify-start')}
        >
            {!isUser && <AssistantAvatar />}
            <div className={cn('max-w-[80%]', isUser && 'flex flex-col items-end')}>
                {/* 工具调用 pill */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {message.toolCalls.map((tc) => {
                            const result = message.toolResults?.find(r => r.toolCallId === tc.id);
                            return <ToolBadge key={tc.id} toolCall={tc} result={result} />;
                        })}
                    </div>
                )}
                <div
                    className={cn(
                        'px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
                        isUser
                            ? 'bg-[var(--color-primary)] text-white rounded-2xl rounded-br-md'
                            : message.error
                                ? 'bg-[var(--color-expense-bg)] text-[var(--color-expense)] rounded-2xl rounded-bl-md'
                                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-2xl rounded-bl-md'
                    )}
                >
                    {message.content}
                </div>
            </div>
        </motion.div>
    );
}

// 流式中的 assistant 占位
function StreamingBubble({ streaming }: { streaming: { content: string; toolCalls: AIToolCall[]; toolResults: AIToolResult[] } }) {
    const thinking = !streaming.content && streaming.toolCalls.length === 0;
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 items-end justify-start">
            <AssistantAvatar />
            <div className="max-w-[80%]">
                {streaming.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {streaming.toolCalls.map((tc) => (
                            <ToolBadge
                                key={tc.id}
                                toolCall={tc}
                                result={streaming.toolResults.find(r => r.toolCallId === tc.id)}
                            />
                        ))}
                    </div>
                )}
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-[var(--color-bg-secondary)] text-[var(--color-text)] text-sm leading-relaxed min-w-[60px]">
                    {streaming.content ? (
                        <span className="whitespace-pre-wrap break-words">{streaming.content}<span className="inline-block w-1.5 h-4 bg-[var(--color-primary)] align-middle ml-0.5 animate-pulse" /></span>
                    ) : thinking ? (
                        <span className="inline-flex items-center gap-1.5 text-[var(--color-text-muted)]">
                            <Loader2 size={13} className="animate-spin" /> 正在思考…
                        </span>
                    ) : null}
                </div>
            </div>
        </motion.div>
    );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mb-4 shadow-lg">
                <Sparkles size={30} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">你好，我是小记</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-8">基于你的真实账本数据，随时帮你算账、做规划</p>
            <div className="w-full max-w-sm space-y-2.5">
                {SUGGESTIONS.map((s) => (
                    <button
                        key={s}
                        onClick={() => onPick(s)}
                        className="w-full text-left px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}

function NoKeyCard({ onOpenSettings }: { onOpenSettings: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[var(--color-bg-secondary)] flex items-center justify-center mb-4">
                <Sparkles size={30} className="text-[var(--color-text-muted)]" />
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">还没有配置 AI 助手</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-xs">
                请先填写你的 OpenRouter API Key，才能开始对话。
            </p>
            <button
                onClick={onOpenSettings}
                className="px-6 py-2.5 rounded-2xl bg-[var(--color-primary)] text-white text-sm font-medium"
            >
                前往设置填写 API Key
            </button>
        </div>
    );
}

// 会话列表抽屉
function SessionDrawer({
    open,
    onClose,
    sessions,
    activeSessionId,
    onSelect,
    onNew,
    onDelete,
}: {
    open: boolean;
    onClose: () => void;
    sessions: { id: string; title: string; updatedAt: string }[];
    activeSessionId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
}) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/40"
                    />
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className="fixed top-0 left-0 bottom-0 z-50 w-[80%] max-w-xs bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col safe-area-top"
                    >
                        <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)]">
                            <span className="font-bold text-[var(--color-text)]">对话列表</span>
                            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--color-bg-secondary)]" aria-label="关闭">
                                <X size={18} className="text-[var(--color-text-secondary)]" />
                            </button>
                        </div>

                        <div className="p-3">
                            <button
                                onClick={() => { onNew(); onClose(); }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium"
                            >
                                <Plus size={16} /> 新建对话
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto hide-scrollbar px-2 pb-4 space-y-1">
                            {sessions.length === 0 && (
                                <p className="text-center text-xs text-[var(--color-text-muted)] mt-8">还没有对话</p>
                            )}
                            {sessions.map((s) => (
                                <div
                                    key={s.id}
                                    className={cn(
                                        'group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                                        s.id === activeSessionId
                                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-text)]'
                                            : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                                    )}
                                    onClick={() => { onSelect(s.id); onClose(); }}
                                >
                                    <MessageSquare size={15} className="flex-shrink-0 opacity-60" />
                                    <span className="flex-1 text-sm truncate">{s.title || '新对话'}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--color-bg)] transition-opacity"
                                        aria-label="删除会话"
                                    >
                                        <Trash2 size={14} className="text-[var(--color-text-muted)] hover:text-[var(--color-expense)]" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export function AgentChat({ onOpenSettings }: AgentChatProps) {
    const {
        messages, streaming, isSending, send, stop,
        sessions, activeSessionId, selectSession, startNewSession, deleteSession, clearCurrent,
        compressHistory, isCompressing,
    } = useAgent();
    const [input, setInput] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const hasKey = !!getApiKey();
    const scrollRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, streaming]);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const handleSend = (text?: string) => {
        const content = (text ?? input).trim();
        if (!content) return;
        setInput('');
        send(content);
    };

    const handleDeleteSession = (id: string) => {
        if (!confirm('确定删除这个会话吗？该会话的所有消息将一并删除。')) return;
        deleteSession(id);
    };

    const handleCompress = () => {
        setMenuOpen(false);
        compressHistory();
    };

    const handleClearCurrent = () => {
        setMenuOpen(false);
        if (!confirm('确定清空当前会话的所有消息吗？')) return;
        clearCurrent();
    };

    // 当前会话标题
    const activeTitle = sessions.find(s => s.id === activeSessionId)?.title || 'AI 助手';

    return (
        <div className="flex-1 flex flex-col min-h-0 pb-24">
            {/* 顶栏 */}
            <header className="flex items-center gap-1 px-3 h-14 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-lg">
                <button
                    onClick={() => setDrawerOpen(true)}
                    className="p-2 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                    aria-label="对话列表"
                >
                    <PanelLeft size={20} className="text-[var(--color-text)]" />
                </button>
                <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-2 flex-1 min-w-0 px-1 py-1 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                    <span className="font-bold text-[var(--color-text)] truncate">{activeTitle}</span>
                </button>
                <button
                    onClick={() => startNewSession()}
                    className="p-2 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                    aria-label="新建对话"
                >
                    <SquarePen size={19} className="text-[var(--color-text)]" />
                </button>
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        className="p-2 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                        aria-label="更多"
                    >
                        <MoreVertical size={19} className="text-[var(--color-text)]" />
                    </button>
                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                transition={{ duration: 0.12 }}
                                className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-lg overflow-hidden z-10"
                            >
                                <button
                                    onClick={handleCompress}
                                    disabled={isCompressing || isSending}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 transition-colors text-left"
                                >
                                    <Archive size={15} className="text-[var(--color-text-secondary)]" />
                                    {isCompressing ? '压缩中…' : '压缩历史'}
                                </button>
                                <button
                                    onClick={handleClearCurrent}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors text-left border-t border-[var(--color-border)]/50"
                                >
                                    <Trash2 size={15} className="text-[var(--color-text-secondary)]" />
                                    清空当前会话
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* 内容 */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar min-h-0">
                {!hasKey ? (
                    <NoKeyCard onOpenSettings={onOpenSettings} />
                ) : messages.length === 0 && !streaming ? (
                    <EmptyState onPick={(t) => handleSend(t)} />
                ) : (
                    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto w-full">
                        <AnimatePresence initial={false}>
                            {messages.map((m) => (
                                <MessageBubble key={m.id} message={m} />
                            ))}
                        </AnimatePresence>
                        {streaming && <StreamingBubble streaming={streaming} />}
                    </div>
                )}
            </div>

            {/* 输入栏 */}
            {hasKey && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-lg px-3 py-2.5">
                    <div className="flex items-end gap-2 max-w-2xl mx-auto">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="给小记发消息…（Enter 发送，Shift+Enter 换行）"
                            rows={1}
                            className="flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)]"
                        />
                        {isSending ? (
                            <button
                                onClick={stop}
                                className="w-11 h-11 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0"
                                aria-label="停止"
                            >
                                <div className="w-3.5 h-3.5 rounded-sm bg-[var(--color-expense)]" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim()}
                                className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity shadow-md"
                                aria-label="发送"
                            >
                                <Send size={18} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <SessionDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelect={selectSession}
                onNew={startNewSession}
                onDelete={handleDeleteSession}
            />
        </div>
    );
}
