import { useState, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import {
    aiMessageOperations,
    aiPreferenceOperations,
} from '../db/database';
import {
    runAgent,
    extractPreferences,
    getApiKey,
    type ChatMessage,
} from '../agent/chatService';
import type { AIMessage, AIToolCall, AIToolResult } from '../types';

const HISTORY_LIMIT = 20;
const DEFAULT_MODEL = 'openrouter/owl-alpha';

// 把库里的历史消息转成 OpenRouter 消息格式
function aiMessagesToChatMessages(messages: AIMessage[]): ChatMessage[] {
    const result: ChatMessage[] = [];
    for (const m of messages) {
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

export function useAgent() {
    const messages = useLiveQuery(() => aiMessageOperations.getAll(), []) ?? [];
    const [streaming, setStreaming] = useState<StreamingState | null>(null);
    const [isSending, setIsSending] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const send = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        const apiKey = getApiKey();
        if (!apiKey) {
            toast.error('请先在设置里填写 OpenRouter API Key');
            return;
        }

        // 1. 存用户消息
        await aiMessageOperations.add({ role: 'user', content: trimmed });

        // 2. 取历史（含刚存入的，最近 N 条）
        const recent = await aiMessageOperations.getRecent(HISTORY_LIMIT);
        const history = aiMessagesToChatMessages(recent);

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
            });

            // 5. 后台偏好提取（失败静默）
            if (finalContent) {
                const transcript = [
                    ...recent.map(m => ({ role: m.role, content: m.content })),
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
                    });
                }
            } else {
                const msg = err instanceof Error ? err.message : '请求失败';
                await aiMessageOperations.add({
                    role: 'assistant',
                    content: `⚠️ 出错了：${msg}`,
                    error: true,
                });
                toast.error(msg);
            }
        } finally {
            setStreaming(null);
            setIsSending(false);
            abortRef.current = null;
        }
    }, [isSending]);

    const stop = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    const clearHistory = useCallback(async () => {
        await aiMessageOperations.clear();
        toast.success('已清空对话历史');
    }, []);

    return {
        messages,
        streaming,
        isSending,
        send,
        stop,
        clearHistory,
    };
}
