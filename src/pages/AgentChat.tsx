import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Send, BarChart3, Wallet, Target, Search, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../hooks/useAgent';
import { getApiKey } from '../agent/chatService';
import { cn } from '../utils/cn';
import type { AIMessage, AIToolCall, AIToolResult } from '../types';

interface AgentChatProps {
    onBack: () => void;
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

function MessageBubble({ message }: { message: AIMessage }) {
    const isUser = message.role === 'user';
    if (message.role === 'tool') return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
        >
            <div className={cn('max-w-[85%]', isUser && 'flex flex-col items-end')}>
                {/* 工具调用气泡 */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5 justify-start">
                        {message.toolCalls.map((tc) => {
                            const result = message.toolResults?.find(r => r.toolCallId === tc.id);
                            return <ToolBadge key={tc.id} toolCall={tc} result={result} />;
                        })}
                    </div>
                )}
                <div
                    className={cn(
                        'px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                        isUser
                            ? 'bg-[var(--color-primary)] text-white rounded-br-md'
                            : message.error
                                ? 'bg-[var(--color-expense-bg)] text-[var(--color-expense)] rounded-bl-md'
                                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-bl-md border border-[var(--color-border)]'
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
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="max-w-[85%]">
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
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)] text-sm leading-relaxed min-w-[60px]">
                    {streaming.content ? (
                        <span className="whitespace-pre-wrap break-words">{streaming.content}<span className="inline-block w-1.5 h-4 bg-[var(--color-primary)] align-middle ml-0.5 animate-pulse" /></span>
                    ) : thinking ? (
                        <span className="text-[var(--color-text-muted)]">正在思考…</span>
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

function NoKeyCard({ onBack }: { onBack: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[var(--color-bg-secondary)] flex items-center justify-center mb-4">
                <Sparkles size={30} className="text-[var(--color-text-muted)]" />
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">还没有配置 AI 助手</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-xs">
                请先到「我的 → AI 助手」填写你的 OpenRouter API Key，才能开始对话。
            </p>
            <button
                onClick={onBack}
                className="px-6 py-2.5 rounded-2xl bg-[var(--color-primary)] text-white text-sm font-medium"
            >
                返回首页
            </button>
        </div>
    );
}

export function AgentChat({ onBack }: AgentChatProps) {
    const { messages, streaming, isSending, send, stop } = useAgent();
    const [input, setInput] = useState('');
    const hasKey = !!getApiKey();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, streaming]);

    const handleSend = (text?: string) => {
        const content = (text ?? input).trim();
        if (!content) return;
        setInput('');
        send(content);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] safe-area-inset-top">
            {/* 顶栏 */}
            <header className="flex items-center gap-3 px-4 h-14 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-lg safe-area-top">
                <button
                    onClick={onBack}
                    className="p-1.5 -ml-1.5 rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                    aria-label="返回"
                >
                    <ArrowLeft size={22} className="text-[var(--color-text)]" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center">
                        <Sparkles size={15} className="text-white" />
                    </div>
                    <span className="font-bold text-[var(--color-text)]">AI 助手</span>
                </div>
            </header>

            {/* 内容 */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
                {!hasKey ? (
                    <NoKeyCard onBack={onBack} />
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
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-lg px-3 py-2.5 safe-area-bottom">
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
                            placeholder="问点什么…（Enter 发送，Shift+Enter 换行）"
                            rows={1}
                            className="flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)]"
                        />
                        {isSending ? (
                            <button
                                onClick={stop}
                                className="w-11 h-11 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0"
                                aria-label="停止"
                            >
                                <div className="w-3.5 h-3.5 rounded-sm bg-[var(--color-expense)]" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim()}
                                className="w-11 h-11 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                                aria-label="发送"
                            >
                                <Send size={18} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
