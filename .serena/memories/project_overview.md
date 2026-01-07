# Project Overview: SimpleExpenseManagement (简记账)

## Purpose
A simple, elegant, and efficient personal accounting PWA (Progressive Web App) focused on privacy. All data is stored locally in the browser using IndexedDB - no server backend required.

## Tech Stack
- **Frontend Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Database**: Dexie.js 4.2.1 (IndexedDB wrapper) with dexie-react-hooks
- **Styling**: Tailwind CSS 4.1.18 with Vite plugin
- **Icons**: Lucide React 0.562.0
- **Charts**: Recharts 3.6.0
- **Animations**: Framer Motion 12.23.26
- **Notifications**: Sonner 2.0.7
- **Date Utilities**: date-fns 4.1.0
- **PWA**: vite-plugin-pwa 1.2.0
- **Language**: TypeScript 5.9.3

## Project Structure
```
src/
├── components/        # React components
│   ├── layout/       # Layout components (TabBar)
│   ├── ui/           # Reusable UI components
│   ├── AddTransaction.tsx
│   ├── ErrorBoundary.tsx
│   └── LockScreen.tsx
├── contexts/         # React Context providers
│   ├── ThemeContext.tsx
│   └── SecurityContext.tsx
├── db/              # Database configuration
│   └── database.ts
├── hooks/           # Custom React hooks
│   ├── useBudgets.ts
│   ├── useCalendar.ts
│   └── useTransactions.ts
├── pages/           # Page components
│   ├── AccountManagement.tsx
│   ├── Bills.tsx
│   ├── BudgetManagement.tsx
│   ├── CategoryManagement.tsx
│   ├── Charts.tsx
│   ├── Home.tsx
│   └── Profile.tsx
├── types/           # TypeScript type definitions
│   └── index.ts
├── utils/           # Utility functions
├── App.tsx          # Main app component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Key Features
- Privacy-focused: All data stored locally (IndexedDB)
- PWA support: Installable on mobile, offline capable
- PIN lock for security
- Multi-account management (cash, bank, Alipay, WeChat, credit cards)
- Budget system with period tracking
- Charts and statistics
- Transaction categories with icons
- Theme support (light/dark/system)

## Navigation Pattern
Tab-based navigation without traditional routing:
- Tabs: 'home', 'bills', 'charts', 'profile'
- "Add" button opens modal overlay
- State managed in App.tsx with useState
