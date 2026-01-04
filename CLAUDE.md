# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Project Overview

This is a PWA (Progressive Web App) accounting application built with React 19, Vite 7, and Tailwind CSS 4. All data is stored locally in IndexedDB via Dexie.js - no server backend. The app uses a tab-based navigation pattern without a traditional routing library.

## Database Architecture (Dexie.js)

The database is defined in `src/db/database.ts` with the following tables:

- **transactions**: Stores individual income/expense records with indexes on type, categoryId, accountId, date, createdAt
- **categories**: Stores transaction categories (income/expense) with fixed IDs for default categories
- **accounts**: Stores payment accounts (cash, bank, alipay, wechat, credit, other)
- **budgets**: Stores budget settings with period tracking

### Key Database Patterns:

1. **Fixed IDs for default data**: Default categories and accounts use predictable string IDs (e.g., `exp_food`, `acc_cash`) to prevent duplicates
2. **Operations objects**: All CRUD operations are exported as `transactionOperations`, `categoryOperations`, `accountOperations`, and `budgetOperations`
3. **Initialization**: `initializeDefaultData()` runs on app startup to ensure default categories and accounts exist
4. **Account balance updates**: When transactions are added/deleted, account balances are automatically updated via `updateBalance()`
5. **Settings storage**: Settings are stored in localStorage, not IndexedDB (key: `accounting_settings`)

### ID Generation:

All entities use `generateId()` which combines timestamp + random string for unique IDs.

## State Management Architecture

### React Context Providers:

- **ThemeProvider** (`src/contexts/ThemeContext.tsx`): Manages light/dark/system theme preferences
- **SecurityProvider** (`src/contexts/SecurityContext.tsx`): Manages PIN lock functionality using localStorage (key: `app_pin`)

### Custom Hooks with Dexie Live Queries:

All data fetching uses `useLiveQuery` from dexie-react-hooks for reactive updates:

- **useTransactions()**: Fetch transactions with optional filtering (type, date range, category)
- **useCategories()**: Fetch categories, optionally filtered by type
- **useAccounts()**: Fetch all accounts
- **useBudgets()**: Fetch budgets, optionally filtered by period
- **useTodayTransactions()**: Transactions for current day
- **useMonthTransactions()**: Transactions for specified month
- **useGroupedTransactions()**: Groups transactions by date with daily summaries
- **useAddTransaction()**: Handles adding transactions with automatic account balance updates
- **useDeleteTransaction()**: Handles deletion with balance reversal
- **useTransactionSummary()**: Calculates income/expense/balance for a transaction set

### Key Pattern:

All hooks in `src/hooks/` use Dexie live queries, meaning components automatically re-render when database changes occur.

## Navigation Architecture

**No traditional router** - uses tab-based navigation with state:

- Tab IDs: `'home'`, `'bills'`, `'charts'`, `'profile'`
- Tab switching handled in `App.tsx` with `useState<TabId>`
- "Add" button opens a modal overlay rather than navigating to a page
- Bottom navigation in `src/components/layout/TabBar.tsx`

## Data Models

Core types are in `src/types/index.ts`:

- **Transaction**: id, type (income/expense), amount, categoryId, accountId, date (YYYY-MM-DD), note, image (base64), timestamps
- **Category**: id, name, type, icon (Lucide icon name string), color, order, isCustom (boolean)
- **Account**: id, name, type (cash/bank/alipay/wechat/credit/other), balance, initialBalance, icon, color, order
- **Budget**: id, categoryId (optional for total budget), amount, period (monthly/yearly), startDate

## Component Architecture

### Page Components (`src/pages/`):

Each page is a standalone component that manages its own state:
- `HomePage.tsx`: Dashboard with overview cards and recent transactions
- `Bills.tsx`: Full transaction list with filtering
- `Charts.tsx`: Statistics and visualizations using Recharts
- `Profile.tsx`: Settings management
- `CategoryManagement.tsx`: Add/edit/delete categories
- `AccountManagement.tsx`: Account management
- `BudgetManagement.tsx`: Budget setup and tracking

### UI Components (`src/components/ui/`):

Reusable atomic components:
- `Button.tsx`, `Card.tsx`, `Modal.tsx`, `Tabs.tsx`, `EmptyState.tsx`
- `CategoryPicker.tsx`: Category selection with grid layout
- `NumberPad.tsx`: Custom numeric input keypad

### Feature Components (`src/components/`):

- `AddTransaction.tsx`: Multi-step transaction entry (amount → category → details)
- `LockScreen.tsx`: PIN code verification overlay
- `ErrorBoundary.tsx`: Error catch-all

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

- **Cannot delete**: Categories with transactions, system default categories, or the last account
- **Balance synchronization**: Modifying account initialBalance automatically adjusts current balance
- **PIN security**: PIN stored in localStorage as plain text (client-side only, no server)
- **Date format**: All dates use ISO strings (YYYY-MM-DD)
- **ID uniqueness**: Never reuse entity IDs; always generate new ones
- **Default data**: The app enforces default categories and accounts exist at all times

## PWA Configuration

Configured in `vite.config.ts` with VitePWA plugin:
- Service worker auto-updates
- Caches static assets and Google Fonts
- Standalone display mode for native app feel
- Orientation locked to portrait

The `vercel.json` file enables SPA routing by rewriting all routes to `index.html`.