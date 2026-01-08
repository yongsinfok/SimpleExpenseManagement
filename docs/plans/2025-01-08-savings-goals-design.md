# 储蓄目标追踪功能 - 设计文档

**日期**: 2025-01-08
**功能**: 储蓄目标追踪 (Savings Goals Tracking)

---

## 概述

为"简记账"应用添加储蓄目标追踪功能，帮助用户设定财务目标并追踪进度。该功能基于用户的净储蓄（收入-支出）自动计算进度，并提供达成预测和可视化展示。

---

## 数据模型设计

### 新增数据库表: `savingsGoals`

```typescript
interface SavingsGoal {
  id: string;              // 唯一 ID
  name: string;            // 目标名称，如"旅行基金"、"应急备用金"
  targetAmount: number;    // 目标金额，如 10000
  currentAmount: number;   // 当前累计金额
  startDate: string;       // 开始日期 (YYYY-MM-DD)
  targetDate?: string;     // 期望达成日期 (可选)
  icon: string;            // Lucide 图标名称
  color: string;           // 主题颜色
  achieved: boolean;       // 是否已达成
  achievedAt?: string;     // 达成日期
  createdAt: string;       // 创建时间
  updatedAt: string;       // 更新时间
}
```

### 数据库更新

在 `src/db/database.ts` 中添加：

```typescript
db.version(2).stores({
  // ... 现有表
  savingsGoals: 'id, achieved, createdAt'
});
```

---

## 核心逻辑

### 1. 自动进度计算

- **触发时机**: 应用启动、添加/删除交易时
- **计算公式**: `currentAmount = 总收入 - 总支出`（从 startDate 开始累计）
- **更新策略**: 每天最多更新一次，避免重复计算

### 2. 达成预测

- **计算基础**: 最近 3 个月的平均净储蓄
- **预测公式**: `剩余月数 = (targetAmount - currentAmount) / 月均净储蓄`
- **边界情况**:
  - 月均净储蓄为负 → 显示"需要调整支出习惯"
  - 已设置 targetDate → 对比预测与期望日期

### 3. 达成条件

- 当 `currentAmount >= targetAmount` 时标记为已达成
- 记录达成日期 `achievedAt`
- 触发庆祝动画

---

## UI/UX 设计

### 新增页面: 目标管理页面

**文件**: `src/pages/SavingsGoals.tsx`

**页面结构**:
1. **顶部总览卡片**
   - 所有目标的总金额
   - 当前已累计金额
   - 总体完成度百分比

2. **目标列表** (每个目标包含)
   - 图标和名称
   - 进度环形图 + 百分比
   - RM XXXX / RM XXXX
   - 预计剩余 X 个月
   - 编辑/删除操作

3. **空状态**
   - 提示创建第一个目标
   - 说明功能用途

4. **添加按钮** (FAB)
   - 底部悬浮按钮
   - 点击打开添加弹窗

### 新增组件: 添加/编辑目标弹窗

**文件**: `src/components/AddSavingsGoal.tsx`

**表单字段**:
- 目标名称 (必填)
- 目标金额 (必填，数字输入)
- 图标选择 (网格选择器)
- 颜色选择 (颜色选择器)
- 期望达成日期 (可选，日期选择器)

**图标选项**:
- PiggyBank (存钱罐)
- Target (目标)
- TrendingUp (增长)
- Plane (旅行)
- Home (房子)
- GraduationCap (教育)
- Car (汽车)
- Umbrella (应急)

### 首页集成

**修改**: `src/pages/Home.tsx`

在现有预算进度展示下方添加：
- 显示 1-2 个最优先的储蓄目标
- 简化版进度展示
- 点击可跳转到目标管理页面

---

## 新增 Hooks

**文件**: `src/hooks/useSavingsGoals.ts`

```typescript
export function useSavingsGoals() {
  // 获取所有目标
}

export function useActiveSavingsGoals() {
  // 获取未达成的目标
}

export function useAddSavingsGoal() {
  // 添加新目标
}

export function useUpdateSavingsGoal() {
  // 更新目标
}

export function useDeleteSavingsGoal() {
  // 删除目标
}

export function updateSavingsProgress() {
  // 自动更新所有目标的进度
  // 在应用启动和交易变化时调用
}

export function useGoalPrediction(goalId: string) {
  // 计算目标达成预测
  // 返回预计月数和预测日期
}
```

---

## 交互细节

### 1. 达成庆祝
- 彩带/烟花动画
- 震动反馈 (移动端)
- 成就徽章

### 2. 快捷操作
- 长按目标卡片 → 快速编辑
- 下拉刷新 → 更新进度
- 滑动删除 → 删除目标

### 3. 排序
- 支持拖拽排序
- 优先级影响首页显示顺序

### 4. 数据持久化
- settings 新增字段: `savingsGoals_lastUpdate`
- 记录上次更新时间，避免重复计算

---

## 错误处理

### 输入验证
- 目标金额必须大于 0
- 目标名称不能为空
- 目标名称最大长度 20 字符

### 操作确认
- 删除目标需要二次确认
- 编辑已达成目标需重置状态
- 金额变更导致已达成目标变为未达成时给出提示

### 边界情况
- 无历史数据时无法预测
- 月均净储蓄为 0 时的处理
- 目标日期早于开始日期的处理

---

## 实施计划

### Phase 1: 数据层
1. 更新数据库 schema
2. 创建 savingsGoals 表
3. 实现 CRUD operations
4. 实现进度计算逻辑

### Phase 2: 业务层
1. 创建 useSavingsGoals hooks
2. 实现自动更新机制
3. 实现预测算法

### Phase 3: UI 层
1. 创建目标管理页面
2. 创建添加/编辑弹窗
3. 首页集成
4. 实现庆祝动画

### Phase 4: 测试与优化
1. 测试各种边界情况
2. 性能优化
3. UI/UX 细节调整

---

## 技术栈

- **数据库**: Dexie.js (IndexedDB)
- **状态管理**: React Hooks + dexie-react-hooks
- **UI**: React 19 + Tailwind CSS 4 + Framer Motion
- **图表**: Recharts (用于进度可视化)
- **日期**: date-fns

---

## 未来扩展

- [ ] 目标分组 (短期/中期/长期)
- [ ] 多人协作目标 (家庭储蓄)
- [ ] 目标分享功能
- [ ] 成就系统
- [ ] 数据导出 (包含储蓄目标)
