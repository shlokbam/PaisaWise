import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { AIInbox } from "./pages/AIInbox";
import { Budgets } from "./pages/Budgets";
import { Subscriptions } from "./pages/Subscriptions";
import { Rules } from "./pages/Rules";
import { Analytics } from "./pages/Analytics";
import { AIChat } from "./pages/AIChat";
import { Settings } from "./pages/Settings";
import { 
  LayoutDashboard, ListTodo, ShieldAlert, BadgeDollarSign, 
  CreditCard, ToggleLeft, BarChart3, Sparkles, LogOut, Menu, X, Settings as SettingsIcon 
} from "lucide-react";

const AppContent: React.FC = () => {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center text-dark-muted text-sm">
        Verifying user credentials...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Ledger", icon: ListTodo },
    { id: "ai-inbox", label: "AI Inbox", icon: ShieldAlert },
    { id: "budgets", label: "Budgets", icon: BadgeDollarSign },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { id: "rules", label: "Automation Rules", icon: ToggleLeft },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "ai", label: "AI Chat Assistant", icon: Sparkles },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard setTab={setActiveTab} />;
      case "transactions": return <Transactions />;
      case "ai-inbox": return <AIInbox />;
      case "budgets": return <Budgets />;
      case "subscriptions": return <Subscriptions />;
      case "rules": return <Rules />;
      case "analytics": return <Analytics />;
      case "ai": return <AIChat />;
      case "settings": return <Settings />;
      default: return <Dashboard setTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex text-dark-text">
      {/* Mobile Sidebar overlay toggler */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
        ></div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-dark-card border-r border-dark-border z-30 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } transition-transform duration-300 flex flex-col justify-between`}>
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-dark-border flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-dark-accent">Paisa</span>Wise
            </h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-dark-muted hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === item.id 
                      ? 'bg-dark-accent text-white shadow-glow' 
                      : 'text-dark-muted hover:text-white hover:bg-dark-hover/40'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info (User profile) */}
        <div className="p-4 border-t border-dark-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-dark-accent/15 border border-dark-accent/30 text-dark-accent font-bold text-xs flex items-center justify-center">
              SH
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.first_name || "Shlok"}</p>
              <p className="text-[10px] text-dark-muted truncate">Logged In</p>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="p-1.5 text-dark-muted hover:text-semantic-expense hover:bg-semantic-expense/10 rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Panel Content wrapper */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header (Mobile nav indicator) */}
        <header className="lg:hidden p-4 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-white">
            <span className="text-dark-accent">Paisa</span>Wise
          </h1>
          <button onClick={() => setSidebarOpen(true)} className="text-dark-muted hover:text-white">
            <Menu size={22} />
          </button>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
