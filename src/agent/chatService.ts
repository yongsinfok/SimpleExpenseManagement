import { toolDefinitions, toolExecutors } from './tools';
import { aiPreferenceOperations, getSettings } from '../db/database';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { db } from '../db/database';
import type { AIToolCall, AIToolResult } from '../types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_TOOL_ROUNDS = 5;

interface StreamDelta {
    content?: string;
    tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }>;
}
interface StreamChunk {
    choices?: Array<{ delta?: StreamDelta }>;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
    }>;
    tool_call_id?: string; // 用于 tool 角色消息
    name?: string;
}

export interface RunAgentCallbacks {
    onAssistantDelta?: (delta: string) => void; // 流式文字片段
    onToolCall?: (toolCall: AIToolCall) => void; // 模型发起了工具调用
    onToolResult?: (result: AIToolResult) => void; // 工具执行完毕
}

// 读取 localStorage 中的 OpenRouter key
export function getApiKey(): string | null {
    return localStorage.getItem('openrouter_api_key');
}

export function setApiKey(key: string): void {
    localStorage.setItem('openrouter_api_key', key.trim());
}

export function clearApiKey(): void {
    localStorage.removeItem('openrouter_api_key');
}

// ---- system prompt 构建 ----

async function loadPreferencesText(): Promise<string> {
    const prefs = await aiPreferenceOperations.getAll();
    if (prefs.length === 0) return '（暂未记录任何偏好）';
    return prefs.map(p => `- ${p.key}: ${p.value}`).join('\n');
}

export async function buildSystemPrompt(): Promise<string> {
    const settings = getSettings();
    const today = format(new Date(), 'yyyy-MM-dd');
    const prefs = await loadPreferencesText();

    return [
        '你是一个记账 App 的私人理财助手，名字叫"小记"。',
        '规则：',
        '1. 必须基于用户真实的财务数据回答，能用工具查就先查再答，绝不编造数字。',
        `2. 货币单位是 ${settings.currencySymbol}（${settings.currency}）。`,
        `3. 今天是 ${today}。"本月"指当前自然月。`,
        '4. 回答简洁、口语化、像朋友聊天，不要用 markdown 标题，可以用列表。',
        '5. 当信息不足以给出建议时（例如不知道用户目标储蓄额、投资期限、风险偏好），主动反问用户一两个关键问题再给建议。',
        '6. 涉及"能拿出多少钱投资/存钱"这类问题，先算出本月净结余和当前总资产，再结合用户的偏好给判断。',
        '',
        '已记录的用户偏好：',
        prefs,
    ].join('\n');
}

// ---- 摘要注入兜底 ----

export async function buildMonthlySnapshot(): Promise<string> {
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    const symbol = getSettings().currencySymbol;

    const txs = await db.transactions.where('date').between(start, end, true, true).toArray();
    const accounts = await db.accounts.toArray();
    const goals = await db.savingsGoals.toArray();

    let income = 0;
    let expense = 0;
    for (const t of txs) {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
    }
    const totalAssets = accounts.reduce((s, a) => s + a.balance, 0);
    const r2 = (n: number) => Math.round(n * 100) / 100;

    return [
        '【本月财务快照（兜底模式自动注入）】',
        `月份：${start.slice(0, 7)}`,
        `本月收入：${symbol} ${r2(income)}`,
        `本月支出：${symbol} ${r2(expense)}`,
        `本月净结余：${symbol} ${r2(income - expense)}`,
        `交易笔数：${txs.length}`,
        `总资产：${symbol} ${r2(totalAssets)}`,
        `储蓄目标个数：${goals.length}（其中已达成 ${goals.filter(g => g.achieved).length} 个）`,
        '请基于以上真实数据回答用户。',
    ].join('\n');
}

// ---- 单次流式请求（带工具） ----

interface StreamResult {
    content: string;
    toolCalls: Array<{
        id: string;
        name: string;
        arguments: string; // 原始 JSON 字符串
    }>;
}

async function streamCompletion(
    messages: ChatMessage[],
    apiKey: string,
    model: string,
    useTools: boolean,
    onDelta: (delta: string) => void,
    signal?: AbortSignal
): Promise<StreamResult> {
    const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        temperature: 0.4,
    };
    if (useTools) {
        body.tools = toolDefinitions;
        body.tool_choice = 'auto';
    }

    const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'SimpleExpenseManagement',
        },
        body: JSON.stringify(body),
        signal,
    });

    if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new AgentHttpError(res.status, text);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let content = '';
    // 按工具调用 index 累积
    const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const raw of lines) {
            const line = raw.trim();
            if (!line || !line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;

            let json: StreamChunk;
            try {
                json = JSON.parse(data) as StreamChunk;
            } catch {
                continue;
            }

            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
                content += delta.content;
                onDelta(delta.content);
            }

            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    const idx: number = tc.index ?? 0;
                    const existing = toolCallMap.get(idx) || { id: '', name: '', arguments: '' };
                    if (tc.id) existing.id = tc.id;
                    if (tc.function?.name) existing.name += tc.function.name;
                    if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                    toolCallMap.set(idx, existing);
                }
            }
        }
    }

    const toolCalls = Array.from(toolCallMap.values()).filter(tc => tc.name);
    return { content, toolCalls };
}

export class AgentHttpError extends Error {
    status: number;
    body: string;
    constructor(status: number, body: string) {
        super(`OpenRouter 请求失败 (${status})`);
        this.status = status;
        this.body = body;
    }
}

// ---- 主循环 ----

export interface RunAgentResult {
    content: string;
    toolCalls: AIToolCall[];
    toolResults: AIToolResult[];
}

export async function runAgent(params: {
    history: ChatMessage[]; // 不含 system，含历史 user/assistant/tool
    apiKey: string;
    model: string;
    signal?: AbortSignal;
    callbacks?: RunAgentCallbacks;
}): Promise<RunAgentResult> {
    const { history, apiKey, model, signal, callbacks } = params;
    const systemPrompt = await buildSystemPrompt();

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history,
    ];

    const allToolCalls: AIToolCall[] = [];
    const allToolResults: AIToolResult[] = [];
    let usedFallback = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        let result: StreamResult;
        try {
            result = await streamCompletion(
                messages, apiKey, model, /* useTools */ true,
                (delta) => callbacks?.onAssistantDelta?.(delta),
                signal
            );
        } catch (err) {
            if (!usedFallback) {
                // 网络或 HTTP 错误 → 降级摘要注入重试一次
                usedFallback = true;
                const snapshot = await buildMonthlySnapshot();
                messages[0] = { role: 'system', content: systemPrompt + '\n\n' + snapshot };
                result = await streamCompletion(
                    messages, apiKey, model, false,
                    (delta) => callbacks?.onAssistantDelta?.(delta),
                    signal
                );
                return {
                    content: result.content || '抱歉，我暂时无法获取你的数据，请稍后再试。',
                    toolCalls: allToolCalls,
                    toolResults: allToolResults,
                };
            }
            throw err;
        }

        // 没有工具调用 → 终态
        if (result.toolCalls.length === 0) {
            return {
                content: result.content,
                toolCalls: allToolCalls,
                toolResults: allToolResults,
            };
        }

        // 处理工具调用
        // 先把 assistant 的 tool_calls 消息加入上下文
        messages.push({
            role: 'assistant',
            content: result.content || '',
            tool_calls: result.toolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
            })),
        });

        for (const tc of result.toolCalls) {
            let parsedArgs: Record<string, unknown> = {};
            try {
                parsedArgs = tc.arguments ? JSON.parse(tc.arguments) : {};
            } catch {
                parsedArgs = {};
            }

            const toolCallRecord: AIToolCall = { id: tc.id, name: tc.name, args: parsedArgs };
            allToolCalls.push(toolCallRecord);
            callbacks?.onToolCall?.(toolCallRecord);

            let toolResult: unknown;
            try {
                const fn = toolExecutors[tc.name];
                toolResult = fn ? await fn(parsedArgs) : { error: `未知工具: ${tc.name}` };
            } catch (e) {
                toolResult = { error: e instanceof Error ? e.message : '工具执行失败' };
            }

            const resultRecord: AIToolResult = { toolCallId: tc.id, name: tc.name, result: toolResult };
            allToolResults.push(resultRecord);
            callbacks?.onToolResult?.(resultRecord);

            messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.name,
                content: JSON.stringify(toolResult),
            });
        }
        // 进入下一轮，让模型基于工具结果继续
    }

    // 超出轮数仍未结束，返回已有内容
    return {
        content: '（已达到最大工具调用次数）' ,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
    };
}

// ---- 历史摘要（上下文压缩） ----

export async function summarizeMessages(opts: {
    messages: { role: string; content: string }[];
    existingSummary: string | null;
    apiKey: string;
    model: string;
    signal?: AbortSignal;
}): Promise<string | null> {
    const { messages, existingSummary, apiKey, model, signal } = opts;

    const systemPrompt = [
        '你是一个对话压缩器。把用户与理财助手"小记"的对话压缩成一段简洁的中文摘要，用于节省 token。',
        '要求：',
        '1. 保留关键事实、所有出现的具体数字/金额/日期、用户的财务意图、已得出的结论、尚未回答的问题。',
        '2. 丢弃寒暄、重复内容、工具调用的中间过程。',
        '3. 用紧凑的条目式表述，不要客套话。',
        existingSummary ? '4. 下面会先给出【已有摘要】，请把它和新对话一起融合成一份更新后的摘要。' : '',
        '只输出摘要正文，不要任何前缀或解释。',
    ].filter(Boolean).join('\n');

    const transcript = [
        existingSummary ? `【已有摘要】\n${existingSummary}` : '',
        '【新对话】',
        ...messages.filter(m => m.content).map(m => `${m.role}: ${m.content}`),
    ].filter(Boolean).join('\n');

    try {
        const res = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SimpleExpenseManagement',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: transcript },
                ],
                temperature: 0,
            }),
            signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        return text.trim() || null;
    } catch {
        return null;
    }
}

// ---- 后台偏好提取 ----

export async function extractPreferences(
    recentMessages: { role: string; content: string }[],
    apiKey: string,
    model: string,
    signal?: AbortSignal
): Promise<Record<string, string> | null> {
    const systemPrompt = [
        '从用户与理财助手的对话中提取用户的偏好和事实，输出 JSON。',
        '只提取明确陈述的、稳定的信息，例如：monthly_saving_target（月度储蓄目标）、',
        'investment_horizon（投资期限）、risk_appetite（风险偏好）、monthly_income（月收入）、',
        'main_financial_goal（主要财务目标）等。值为简短中文。',
        '如果对话中没有明确的稳定偏好，输出空对象 {}。',
        '只输出 JSON，不要任何解释。',
    ].join('\n');

    const transcript = recentMessages
        .filter(m => m.content)
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

    try {
        const res = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SimpleExpenseManagement',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: transcript },
                ],
                temperature: 0,
                response_format: { type: 'json_object' },
            }),
            signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        return JSON.parse(text);
    } catch {
        return null;
    }
}
