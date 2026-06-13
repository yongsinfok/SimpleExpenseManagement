# AI Agent 功能设计

**日期**: 2026-06-14
**状态**: 已确认设计（待实施）

## 概述

给记账 app 增加一个 AI 理财助手聊天页。助手能访问本地全部财务数据（交易、账户、预算、储蓄目标），基于真实数据回答问题（如"我这个月还能拿出多少钱投资"）、对比收支、并在信息不足时主动反问用户。跨会话记住用户偏好。

**模型**: OpenRouter `openrouter/owl-alpha`（免费模型），通过浏览器直连 OpenRouter API，无后端。

## 关键决策

| 维度 | 决策 | 理由 |
|---|---|---|
| API key | 用户自填，存 localStorage | 纯客户端 PWA 无后端，key 不进代码库，避免泄露盗用 |
| 数据访问 | Tool calling（函数调用）+ 摘要注入兜底 | 让模型主动按需查询，回答更灵活；owl-alpha tool-calling 不稳定时自动降级 |
| 权限 | 只读 + 对话 | 不写账本，避免模型误操作金额/分类 |
| 记忆 | 聊天记录 + 提取的偏好，均存 IndexedDB | 跨会话稳定记住用户是谁、目标是什么 |
| UI 入口 | 首页图标按钮 → 全屏聊天页 | 不挤占 TabBar，入口明显 |

## 架构与数据流

### 入口与导航

- 首页右上角加 `Sparkles` 图标按钮。
- 点击后切换到全屏 `AgentChat` 页面（用 `useState` 控制显隐，或复用现有导航机制），带返回按钮回首页。
- 不新增 tab，不修改 `TabBar`。聊天页沉浸式，不带底部导航。

### 调用链路

```
用户输入 → chatService 组装请求 → POST https://openrouter.ai/api/v1/chat/completions
                                     （浏览器 fetch，stream: true）
模型返回 tool_calls → chatService 在本地执行（从 Dexie 读数据）
  → 结果作为 tool role 消息回填 → 发第二轮请求
  → 重复直到模型给出最终文字回复 → 流式逐字渲染
```

请求体携带 `tools` 数组（只读工具）。所有 HTTP 头按 OpenRouter 规范：`Authorization: Bearer <key>`、`HTTP-Referer`、`X-Title`。

### 只读工具集（初版）

所有工具纯查询，不写库：

- `get_period_summary(period, refDate?)` — 某月/某年的收入、支出、净额、各分类汇总
- `get_account_balances()` — 全部账户余额 + 总资产
- `get_budget_status(period)` — 各预算的额度 vs 已花 vs 剩余
- `get_savings_goals()` — 各储蓄目标进度
- `query_transactions(filter)` — 按分类/日期/关键词/金额查具体交易
- `get_user_preferences()` — 读出已提取的偏好

### 兜底机制

owl-alpha 的 tool-calling 不一定稳定。预留：连续两次模型未正确发起 tool_call 时，自动退化为摘要注入模式——把当月快照（收入/支出/余额/预算/储蓄）塞进 system prompt，让模型直接答。

## 记忆与偏好

### 数据库新增（DB version 3）

两张新表（Dexie 自动迁移，老用户数据无损）：

- **`aiMessages`**: `id, role, content, toolCalls?, toolResults?, createdAt` — 完整对话历史。`role` 含 `user/assistant/tool`。存原始结构以便重放回模型。
- **`aiPreferences`**: `id, key, value, updatedAt` — 提取出的用户偏好/事实。例：`{ key: 'monthly_saving_target', value: 'RM 1000' }`、`{ key: 'risk_appetite', value: 'conservative' }`。

### 偏好写入路径

1. **用户在 Profile 页手动编辑**（列表，可增删改）—— 兜底，保证可控。
2. **后台提取**：对话结束后（或检测到用户陈述新偏好，如"我这个月打算存 1000"），由一次轻量级模型调用提取结构化偏好写入 `aiPreferences`。提取失败/无新信息则跳过，不影响主流程。

### 上下文组装（每次请求）

```
system prompt = 角色设定 + 货币(RM) + 当前日期 + 注入用户偏好(aiPreferences 全量)
messages      = aiMessages 最近 20 条（超出截断）+ 当前 user 消息
```

### 角色设定（system prompt 开头示例）

> 你是这个记账 app 的私人理财助手。基于用户的真实财务数据回答，能用工具查就先查再答，不要编数字。货币是 RM (MYR)。回答简洁、像朋友聊天。当信息不足以给建议时，主动反问用户（比如目标储蓄额、投资期限）。

### 隐私

偏好与对话均存本地 IndexedDB（同 PIN）。仅发请求时把必要内容发给 OpenRouter。Profile 页可一键清空对话/偏好。

## UI 与交互

### 聊天页 `AgentChat.tsx`（新页面）

经典聊天布局，复用主题变量与 `cn()`：

- **顶栏**：返回按钮 + "AI 助手" + 右侧 `Sparkles`，深浅色自动跟随。
- **消息列表**：用户消息靠右（primary 色 bubble），助手靠左（卡片 bubble），支持流式逐字渲染（光标动画）。助手消息数字用货币符号格式化。
- **空状态**：首次进入显示欢迎语 + 4 个建议提问 chips，点击直接发送：
  - "我这个月还能拿出多少钱投资？"
  - "对比我本月收入和支出"
  - "我的预算执行得怎么样？"
  - "按分类看看我这月花了多少"
- **输入区**：固定底部，多行输入框 + 发送按钮。发送时禁用并显示 loading（助手"正在思考..."）。
- **工具状态提示**：模型调用工具时，列表插入轻量气泡，如"📊 正在查询本月交易…"。

### 设置入口（Profile 页新增"AI 助手"节）

- API Key 输入框（`type="password"`，localStorage key `openrouter_api_key`）。
- 模型显示（固定 `openrouter/owl-alpha`，或留可编辑项方便换模型）。
- 按钮："清空对话历史"、"清空已记住的偏好"。
- 未填 key 时，进聊天页显示引导卡片 + 跳转设置按钮。

### 错误处理

- 网络失败 / 401（key 无效）/ 429（限流）：`sonner` toast 提示 + 消息列表留错误气泡，可点"重试"。
- 流式中断：保留已收到的部分，标记为不完整。

### 复用现有

不引入新通知库（继续用 sonner）；图标用 Lucide 加进 `iconMap`；样式全走 CSS 变量；**无新增依赖**（OpenRouter 是普通 fetch，不需要 SDK）。

## 实施影响清单

- `src/db/database.ts` — schema v3，新增 `aiMessages`、`aiPreferences` 表 + operations
- `src/hooks/useAgent.ts`（新）— chatService + tool 执行 + 流式处理
- `src/pages/AgentChat.tsx`（新）— 聊天页
- `src/components/...`（新）— MessageBubble、ChatInput、建议 chips
- `src/pages/Home.tsx` — 加 AI 图标按钮入口
- `src/pages/Profile.tsx` — 加 AI 助手设置节（key、模型、清空）
- `src/types/index.ts` — AIMessage、AIPreference 类型
- `src/App.tsx` — chat 页显隐控制
- `src/utils/icons.ts` — 注册 `Sparkles` 等图标

## 风险与注意事项

- **owl-alpha tool-calling 稳定性**：依赖兜底摘要注入模式。
- **API key 安全**：必须由用户自填，绝不硬编码/提交进仓库。已在对话中提示用户轮换本次泄露的 key。
- **上下文成本**：tool-calling 多轮往返 + 20 条历史，注意 token；后续可加摘要压缩。
- **浮点金额**：工具内做金额累加时按整数分计算，避免浮点误差。
