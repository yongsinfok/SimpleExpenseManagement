import { useState, useEffect } from 'react';
import { TabBar, type TabId } from './components/layout';
import { AddTransaction } from './components/AddTransaction';
import { HomePage, BillsPage, ChartsPage, SavingsGoalsPage, ProfilePage } from './pages';
import { useInitializeData } from './hooks/useTransactions';
import { ThemeProvider } from './contexts/ThemeContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { LockScreen } from './components/LockScreen';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const { isInitialized, error } = useInitializeData();

  // 加载中状态
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="text-center">
          <p className="text-[var(--color-expense)] font-medium mb-2">加载失败</p>
          <p className="text-[var(--color-text-secondary)] text-sm">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-md)]"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: TabId) => {
    if (tab !== 'add') {
      setActiveTab(tab);
    }
  };

  // Listen for custom navigation event from home page
  useEffect(() => {
    const handleNavigateToSavings = () => setActiveTab('savings');
    document.addEventListener('navigate-to-savings', handleNavigateToSavings);
    return () => document.removeEventListener('navigate-to-savings', handleNavigateToSavings);
  }, []);

  const handleAddClick = () => {
    setShowAddTransaction(true);
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage onViewAllBills={() => setActiveTab('bills')} />;
      case 'bills':
        return <BillsPage />;
      case 'charts':
        return <ChartsPage />;
      case 'savings':
        return <SavingsGoalsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage onViewAllBills={() => setActiveTab('bills')} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col safe-area-inset-top transition-colors duration-200">
      <LockScreen />

      {/* 页面内容 */}
      {renderPage()}

      {/* 底部导航 */}
      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddClick={handleAddClick}
      />

      {/* 记账弹窗 */}
      <AddTransaction
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        onSuccess={() => {
          // 记账成功后可以添加一些反馈
        }}
      />
    </div>
  );
}

import { Toaster } from 'sonner';

export default function App() {
  return (
    <ThemeProvider>
      <SecurityProvider>
        <AppContent />
        <Toaster position="top-center" richColors />
      </SecurityProvider>
    </ThemeProvider>
  );
}
