# Code Style and Conventions

## General Conventions
- **Language**: TypeScript with strict type checking
- **Component Style**: Functional components with hooks
- **File Extension**: `.tsx` for components, `.ts` for utilities
- **Encoding**: UTF-8

## Naming Conventions
- **Components**: PascalCase (e.g., `AddTransaction`, `HomePage`)
- **Functions/Variables**: camelCase (e.g., `useTransactions`, `activeTab`)
- **Types/Interfaces**: PascalCase (e.g., `Transaction`, `AccountType`)
- **Constants**: UPPER_SNAKE_CASE or camelCase depending on scope
- **CSS Custom Properties**: kebab-case with `--color-` prefix (e.g., `--color-primary`)

## Component Patterns
- Functional components with hooks only
- Props defined as interfaces with `interface` keyword
- Event handlers prefixed with `handle` (e.g., `handleTabChange`, `handleAddClick`)
- Boolean props often use `is`, `show`, `has` prefixes
- Children prop used for composition

## Database Patterns (Dexie.js)
- Fixed string IDs for default data (e.g., `exp_food`, `acc_cash`)
- Generated IDs using `generateId()` for user-created entities
- CRUD operations exported as objects (e.g., `transactionOperations`)
- All dates use ISO format (YYYY-MM-DD)
- Account balances auto-update on transaction changes

## State Management
- React Context for global state (ThemeProvider, SecurityProvider)
- Custom hooks with Dexie live queries (`useLiveQuery`)
- Local component state with `useState` for UI state
- Settings stored in localStorage (key: `app_pin`, `accounting_settings`)

## Styling (Tailwind CSS 4)
- CSS custom properties for theming: `--color-bg`, `--color-text-primary`, `--color-primary`, etc.
- Consistent radius: `var(--radius-md)`
- Utility function `cn()` for merging classes (clsx + tailwind-merge)
- Theme switching via `light`/`dark` classes on `<html>` element

## Import Order
1. React imports
2. Third-party libraries
3. Internal imports (components, hooks, types, utils)
4. Relative imports

## Icon System
- Icons from Lucide React
- Icon registry in `src/utils/icons.ts` as `iconMap`
- Icons stored as string names in database
- Accessed via `getIcon(name)` function

## Important Constraints
- Cannot delete categories with transactions
- Cannot delete system default categories
- Cannot delete the last account
- Balance synchronization when modifying account initialBalance
- PIN stored in localStorage as plain text (client-side only)
