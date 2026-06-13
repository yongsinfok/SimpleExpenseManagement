# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install         # install dependencies
npm run dev         # start Vite dev server
npm run build       # type-check (tsc -b) + production build
npm run lint        # eslint
npm run preview     # preview production build
```

There is no test script. The production build runs `tsc -b` before `vite build`, so type errors fail CI — keep types clean.

## Project Overview

This is a PWA (Progressive Web App) accounting application built with React 19, Vite 7, and Tailwind CSS 4. All data is stored locally in IndexedDB via Dexie.js - no server backend. The app uses a tab-based navigation pattern without a traditional routing library.

## Database Architecture (Dexie.js)

The database is defined in `src/db/database.ts`. Schema is at **version 2** (v2 added `savingsGoals`):

- **transactions**: `id, type, categoryId, accountId, date, createdAt`
- **categories**: `id, type, order`
- **accounts**: `id, type, order`
- **budgets**: `id, categoryId, period`
- **savingsGoals**: `id, achieved, createdAt` (added in v2)

### Key Database Patterns:

1. **Fixed IDs for default data**: Default categories and accounts use predictable string IDs (e.g., `exp_food`, `acc_cash`) to prevent duplicates
2. **Operations objects**: All CRUD operations are exported as `transactionOperations`, `categoryOperations`, `accountOperations`, `budgetOperations`, and `savingsGoalOperations` — each guards constraints (e.g. `categoryOperations.delete` refuses if the category has transactions or is a system default)
3. **Initialization**: `initializeDefaultData()` is idempotent — a localStorage flag (`simple_expense_init_done`) prevents re-running on subsequent loads. For existing users without the flag, it preserves their data and only fixes a missing `defaultAccountId`. Invoked from the `useInitializeData()` hook (in `useTransactions.ts`), which gates the entire app behind an `isInitialized` state in `App.tsx`
4. **Account balance updates**: When transactions are added/deleted, account balances are automatically updated via `accountOperations.updateBalance()`
5. **Settings storage**: Settings live in localStorage (key: `accounting_settings`), not IndexedDB — see `getSettings()` / `saveSettings()`

### ID Generation:

All entities use `generateId()` which combines timestamp + random string for unique IDs.

## State Management Architecture

### React Context Providers:

- **ThemeProvider** (`src/contexts/ThemeContext.tsx`): Manages light/dark/system theme preferences
- **SecurityProvider** (`src/contexts/SecurityContext.tsx`): Manages PIN lock functionality using localStorage (key: `app_pin`)

### Custom Hooks (`src/hooks/`):

All data fetching uses `useLiveQuery` from dexie-react-hooks for reactive updates:

- **useTransactions.ts**: `useTransactions`, `useTodayTransactions`, `useMonthTransactions`, `useGroupedTransactions`, `useAddTransaction`, `useDeleteTransaction`, `useTransactionSummary`, **`useInitializeData`** (runs default-data init and gates the app)
- **useBudgets.ts**: Budget CRUD with period filtering
- **useSavingsGoals.ts**: Savings-goal CRUD plus progress/achievement tracking
- **useCalendar.ts** + **utils/calendar.ts**: Month grid math and per-day transaction rollups
- **useServiceWorkerUpdate.ts**: PWA update detection (drives `UpdatePrompt`)

Adding a new data table = add operations in `database.ts`, write a `use<Thing>.ts` hook with `useLiveQuery`, then call from pages.

### Key Pattern:

All hooks in `src/hooks/` use Dexie live queries, meaning components automatically re-render when database changes occur.

## Navigation Architecture

**No traditional router** — uses tab-based navigation with state in `App.tsx`:

- Tab IDs: `'home'`, `'bills'`, `'charts'`, `'savings'`, `'profile'`
- Tab switching via `useState<TabId>`
- "Add" button opens a modal overlay (`AddTransaction`) rather than navigating
- Bottom navigation in `src/components/layout/TabBar.tsx`
- **Cross-component navigation** uses custom DOM events (e.g. `document.dispatchEvent(new Event('navigate-to-savings'))`, listened to in `App.tsx`). Use this pattern when a deep child needs to switch tabs.

## Data Models

Core types are in `src/types/index.ts`:

- **Transaction**: id, type (income/expense), amount, categoryId, accountId, date (YYYY-MM-DD), note, image (base64), timestamps
- **Category**: id, name, type, icon (Lucide icon name string), color, order, isCustom (boolean)
- **Account**: id, name, type (cash/bank/alipay/wechat/credit/other), balance, initialBalance, icon, color, order
- **Budget**: id, categoryId (optional for total budget), amount, period (monthly/yearly), startDate
- **SavingsGoal**: id, name, targetAmount, currentAmount, startDate, targetDate?, icon, color, achieved, achievedAt?, timestamps. `savingsGoalOperations.updateProgress` auto-flips `achieved` when `currentAmount >= targetAmount`
- **Settings**: defaultAccountId, theme, **currency/currencySymbol** (default `MYR` / `RM`), showDecimal, reminderTime?, savingsGoalsLastUpdate?

## Data Models — currency

The default currency is **MYR / RM** (Malaysian Ringgit). Currency is a per-app setting in localStorage, not per-transaction. When touching money formatting, read from `getSettings().currencySymbol` rather than hardcoding.

## Component Architecture

### Page Components (`src/pages/`):

Each page is a standalone component that manages its own state:
- `Home.tsx`: Dashboard with overview cards and recent transactions (also exported as `HomePage`)
- `Bills.tsx`: Full transaction list with filtering, bulk-edit, calendar view
- `Charts.tsx`: Statistics and visualizations using Recharts
- `SavingsGoals.tsx`: Savings goals list and tracking (exported as `SavingsGoalsPage`)
- `Profile.tsx`: Settings management
- `CategoryManagement.tsx`, `AccountManagement.tsx`, `BudgetManagement.tsx`: sub-pages reached from Profile

### UI Components (`src/components/ui/`):

Reusable atomic components:
- `Button.tsx`, `Card.tsx`, `Modal.tsx`, `Tabs.tsx`, `EmptyState.tsx`
- `CategoryPicker.tsx`: Category selection with grid layout
- `NumberPad.tsx`: Custom numeric input keypad
- `CalendarView.tsx`: Month grid with per-day transaction totals
- `EditTransactionModal.tsx`: Inline transaction editor
- `FilterPresets.tsx`: Quick filter chips for bills
- `BulkActionBar.tsx`: Multi-select action toolbar
- `PinDots.tsx`: PIN input display

### Feature Components (`src/components/`):

- `AddTransaction.tsx`: Multi-step transaction entry (amount → category → details)
- `EditTransactionModal.tsx` (in `ui/`): Inline editor for existing transactions
- `LockScreen.tsx`: PIN code verification overlay
- `UpdatePrompt.tsx`: PWA update notification (driven by `useServiceWorkerUpdate`)
- `ErrorBoundary.tsx`: Error catch-all

## Notifications

Toast notifications use **sonner** (`<Toaster position="top-center" richColors />` is mounted once in `App.tsx`). Import `toast` from `sonner` — do not introduce a second notification library.

## Styling System

UsesTailwind CSS 4 with CSS custom properties for theming:

- **Color variables**: `--color-bg`, `--color-text-primary`, `--color-text-secondary`, `--color-primary`, `--color-income`, `--color-expense`, `--color-border`
- **Radius variable**: `--radius-md` for consistent rounded corners
- **Theme switching**: ThemeProvider toggles `light`/`dark` classes on `<html>` element
- **Utility function**: `cn()` in `src/utils/cn.ts` merges Tailwind classes with clsx/tailwind-merge

## Icon System

Icons use Lucide React. All icons are registered in `src/utils/icons.ts` as `iconMap` and accessed via `getIcon(name)` function.

When adding icon support, import from Lucide and add to the iconMap. Icons are stored as string names in the database.

## Important Constraints

- **Cannot delete**: Categories with transactions, system default categories, accounts that have transactions, or the last remaining account
- **Balance synchronization**: `accountOperations.update` adjusts `balance` by the same delta when `initialBalance` changes
- **PIN security**: PIN stored in localStorage as plain text (client-side only, no server) — by design, since the app has no backend
- **Date format**: All transaction dates use ISO strings (`YYYY-MM-DD`); timestamps use full ISO 8601
- **ID uniqueness**: Never reuse entity IDs; always call `generateId()`
- **Default data**: The app enforces default categories and accounts exist at all times (re-init is guarded by the `simple_expense_init_done` localStorage flag)
- **Money as numbers**: amounts are stored as JS `number` — be careful with floating-point when summing; prefer integer cents for any arithmetic-heavy code

## Testing

There is **no test setup** — `package.json` has no `test` script, no test framework, and no spec files. Validation is manual via `npm run dev`. If you add tests, pick one framework and wire it into `package.json` rather than introducing parallel scripts.

## PWA Configuration

Configured in `vite.config.ts` with VitePWA plugin:
- Service worker auto-updates
- Caches static assets and Google Fonts
- Standalone display mode for native app feel
- Orientation locked to portrait

The `vercel.json` file enables SPA routing by rewriting all routes to `index.html`.