import { useState, useCallback, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import {
    aiMessageOperations,
    aiSessionOperations,
    aiPreferenceOperations,
} from '../db/database';
import {
    runAgent,
    extractPreferences,
    summarizeMessages,
    getApiKey,
    type ChatMessage,
} from '../agent/chatService';
import type { AIMessage, AIToolCall, AIToolResult } from '../types';

const DEFAULT_MODEL = 'openrouter/owl-alpha';
const ACTIVE_SESSION_KEY = 'ai_active_session';
const KEEP_RECENT = 6; // 压缩时保留最近几条原文
const MIN_TO_COMPRESS = KEEP_RECENT + 2; // 至少要有这么多条才值得压缩

// 把库里的历史消息转成 OpenRouter 消息格式。
// isSummary 消息 → 注入为 system 消息（之前的对话摘要）。
function aiMessagesToChatMessages(messages: AIMessage[]): ChatMessage[] {
    const result: ChatMessage[] = [];
    for (const m of messages) {
        if (m.isSummary) {
            result.push({
                role: 'system',
                content: `【之前的对话摘要】\n${m.content}`,
            });
            continue;
        }
        if (m.role === 'user') {
            result.push({ role: 'user', content: m.content });
        } else if (m.role === 'assistant') {
            if (m.toolCalls && m.toolCalls.length > 0) {
                result.push({
                    role: 'assistant',
                    content: m.content || '',
                    tool_calls: m.toolCalls.map(tc => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
                    })),
                });
                if (m.toolResults) {
                    for (const tr of m.toolResults) {
                        result.push({
                            role: 'tool',
                            tool_call_id: tr.toolCallId,
                            name: tr.name,
                            content: JSON.stringify(tr.result),
                        });
                    }
                }
            } else {
                result.push({ role: 'assistant', content: m.content });
            }
        }
        // 'tool' 角色已并入 assistant 消息，跳过
    }
    return result;
}

export interface StreamingState {
    content: string;
    toolCalls: AIToolCall[];
    toolResults: AIToolResult[];
}

// 读取或创建激活会话
async function ensureActiveSession(): Promise<string> {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (stored) {
        const exists = await aiSessionOperations.getById(stored);
        if (exists) return stored;
    }
    const all = await aiSessionOperations.getAll();
    if (all.length > 0) {
        const id = all[0].id;
        localStorage.setItem(ACTIVE_SESSION_KEY, id);
        return id;
    }
    const id = await aiSessionOperations.create();
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
    return id;
}

export function useAgent() {
    const [activeSessionId, setActiveSessionId] = useState<string | null>(() => localStorage.getItem(ACTIVE_SESSION_KEY));
    const [streaming, setStreaming] = useState<StreamingState | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    // 首次挂载：确保有一个合法的激活会话
    useEffect(() => {
        let cancelled = false;
        ensureActiveSession().then((id) => {
            if (!cancelled && id !== activeSessionId) {
                setActiveSessionId(id);
            }
        });
        return () => { cancelled = true; };
    }, [activeSessionId]);

    const sessions = useLiveQuery(() => aiSessionOperations.getAll(), []) ?? [];

    const messages = useLiveQuery(
        () => activeSessionId ? aiMessageOperations.getBySession(activeSessionId) : Promise.resolve([] as AIMessage[]),
        [activeSessionId]
    ) ?? [];

    const send = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        const apiKey = getApiKey();
        if (!apiKey) {
            toast.error('请先在设置里填写 OpenRouter API Key');
            return;
        }

        const sessionId = await ensureActiveSession();
        if (sessionId !== activeSessionId) setActiveSessionId(sessionId);

        // 1. 存用户消息
        await aiMessageOperations.add({ role: 'user', content: trimmed, sessionId });

        // 首条用户消息 → 用它当会话标题；同时刷新 updatedAt
        const sessionMsgs = await aiMessageOperations.getBySession(sessionId);
        const userCount = sessionMsgs.filter(m => m.role === 'user' && !m.isSummary).length;
        if (userCount <= 1) {
            await aiSessionOperations.rename(sessionId, trimmed.slice(0, 16));
        } else {
            await aiSessionOperations.touch(sessionId);
        }

        // 2. 取整段历史（含摘要 + 最近原文）构建请求
        const history = aiMessagesToChatMessages(sessionMsgs);

        // 3. 准备流式状态
        setIsSending(true);
        setStreaming({ content: '', toolCalls: [], toolResults: [] });
        const controller = new AbortController();
        abortRef.current = controller;
        let partialContent = '';

        try {
            const result = await runAgent({
                history,
                apiKey,
                model: DEFAULT_MODEL,
                signal: controller.signal,
                callbacks: {
                    onAssistantDelta: (delta) => {
                        partialContent += delta;
                        setStreaming(prev => prev ? { ...prev, content: prev.content + delta } : prev);
                    },
                    onToolCall: (tc) => {
                        setStreaming(prev => prev ? { ...prev, toolCalls: [...prev.toolCalls, tc] } : prev);
                    },
                    onToolResult: (tr) => {
                        setStreaming(prev => prev ? { ...prev, toolResults: [...prev.toolResults, tr] } : prev);
                    },
                },
            });

            const finalContent = (result.content || '').trim();
            // 4. 持久化 assistant 消息
            await aiMessageOperations.add({
                role: 'assistant',
                content: finalContent || '（无回复）',
                toolCalls: result.toolCalls.length ? result.toolCalls : undefined,
                toolResults: result.toolResults.length ? result.toolResults : undefined,
                sessionId,
            });
            await aiSessionOperations.touch(sessionId);

            // 5. 后台偏好提取（失败静默）
            if (finalContent) {
                const transcript = [
                    ...sessionMsgs.map(m => ({ role: m.role, content: m.content })),
                    { role: 'assistant', content: finalContent },
                ];
                extractPreferences(transcript, apiKey, DEFAULT_MODEL, AbortSignal.timeout(15000))
                    .then(async (prefs) => {
                        if (!prefs) return;
                        for (const [key, value] of Object.entries(prefs)) {
                            if (value) await aiPreferenceOperations.upsert(key, String(value));
                        }
                    })
                    .catch(() => { /* 静默 */ });
            }
        } catch (err) {
            if (controller.signal.aborted) {
                // 用户主动中断：保留已流式的内容
                if (partialContent) {
                    await aiMessageOperations.add({
                        role: 'assistant',
                        content: partialContent + '\n\n_(已中断)_',
                        sessionId,
                    });
                }
            } else {
                const msg = err instanceof Error ? err.message : '请求失败';
                await aiMessageOperations.add({
                    role: 'assistant',
                    content: `⚠️ 出错了：${msg}`,
                    error: true,
                    sessionId,
                });
                toast.error(msg);
            }
        } finally {
            setStreaming(null);
            setIsSending(false);
            abortRef.current = null;
        }
    }, [isSending, activeSessionId]);

    const stop = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    // ---- 会话管理 ----

    const selectSession = useCallback((id: string) => {
        setActiveSessionId(id);
        localStorage.setItem(ACTIVE_SESSION_KEY, id);
    }, []);

    const startNewSession = useCallback(async () => {
        const id = await aiSessionOperations.create();
        selectSession(id);
        return id;
    }, [selectSession]);

    const deleteSession = useCallback(async (id: string) => {
        const wasActive = id === activeSessionId;
        await aiSessionOperations.delete(id);
        if (wasActive) {
            // 切到剩余最新会话；没有就新建一个空会话
            const remaining = await aiSessionOperations.getAll();
            const next = remaining[0]?.id ?? await aiSessionOperations.create();
            selectSession(next);
        }
        toast.success('已删除该会话');
    }, [activeSessionId, selectSession]);

    const clearCurrent = useCallback(async () => {
        if (!activeSessionId) return;
        await aiMessageOperations.clearSession(activeSessionId);
        await aiSessionOperations.rename(activeSessionId, '新对话');
        toast.success('已清空当前会话');
    }, [activeSessionId]);

    // ---- 历史压缩 ----

    const compressHistory = useCallback(async () => {
        if (!activeSessionId || isSending || isCompressing) return;

        const apiKey = getApiKey();
        if (!apiKey) {
            toast.error('请先在设置里填写 OpenRouter API Key');
            return;
        }

        const all = await aiMessageOperations.getBySession(activeSessionId);
        const real = all.filter(m => !m.isSummary);
        if (real.length < MIN_TO_COMPRESS) {
            toast('当前历史较短，无需压缩');
            return;
        }

        const existingSummaryMsg = all.find(m => m.isSummary);
        const existingSummary = existingSummaryMsg?.content ?? null;
        const toSummarize = real.slice(0, real.length - KEEP_RECENT);

        setIsCompressing(true);
        try {
            const summary = await summarizeMessages({
                messages: toSummarize.map(m => ({ role: m.role, content: m.content })),
                existingSummary,
                apiKey,
                model: DEFAULT_MODEL,
            });
            if (!summary) {
                toast.error('压缩失败，请稍后再试');
                return;
            }

            // 删除被压缩的原文 + 旧摘要，写入新摘要（放在最早那条之前）
            const deleteIds = [
                ...toSummarize.map(m => m.id),
                ...(existingSummaryMsg ? [existingSummaryMsg.id] : []),
            ];
            await Promise.all(deleteIds.map(id => aiMessageOperations.delete(id)));

            const earliestCreatedAt = toSummarize[0]?.createdAt ?? new Date().toISOString();
            await aiMessageOperations.add({
                role: 'assistant',
                content: summary,
                isSummary: true,
                sessionId: activeSessionId,
                // 让摘要排在所有保留消息之前
            }).then((id) => aiMessageOperations.update(id, { createdAt: earliestCreatedAt }));

            toast.success(`已压缩 ${toSummarize.length} 条历史为摘要`);
        } catch {
            toast.error('压缩失败，请稍后再试');
        } finally {
            setIsCompressing(false);
        }
    }, [activeSessionId, isSending, isCompressing]);

    return {
        // 会话
        sessions,
        activeSessionId,
        selectSession,
        startNewSession,
        deleteSession,
        clearCurrent,
        // 消息
        messages,
        streaming,
        isSending,
        send,
        stop,
        // 压缩
        compressHistory,
        isCompressing,
    };
}
