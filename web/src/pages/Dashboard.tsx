import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { 
  TrendingUp, TrendingDown, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, ShieldAlert, Sparkles, ChevronRight
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface DashboardData {
  period: string;
  personal_spending: number;
  spending_change_pct: number;
  money_movement: {
    total_inflow: number;
    total_outflow: number;
  };
  financial_activity: number;
  pending_reviews_count: number;
  monthly_budget: {
    limit: number;
    spent: number;
    remaining: number;
  };
  recent_transactions: Array<{
    id: string;
    merchant_name: string;
    amount: number;
    direction: string;
    transaction_date: string;
    category: string;
    include: boolean;
    confidence: number;
  }>;
  ai_insight: string;
}

export const Dashboard: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await apiRequest("/dashboard");
      setData(summary);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-dark-muted">
        <RefreshCw className="animate-spin mr-2" /> Loading financial data...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 glass-panel border-semantic-expense/20 text-semantic-expense max-w-lg mx-auto mt-10">
        <h3 className="font-bold text-lg">Failed to retrieve data</h3>
        <p className="text-sm mt-1">{error || "Connection error."}</p>
        <button onClick={fetchDashboard} className="premium-btn py-2 mt-4 text-sm">Retry</button>
      </div>
    );
  }

  const budgetPct = Math.min(100, (data.monthly_budget.spent / data.monthly_budget.limit) * 100);

  // Chart data: current month
  const chartData = [
    { name: "Inflow", amount: data.money_movement.total_inflow, fill: "#10B981" },
    { name: "Outflow", amount: data.money_movement.total_outflow, fill: "#EF4444" },
    { name: "Personal Spend", amount: data.personal_spending, fill: "#4F46E5" },
    { name: "Investments", amount: data.financial_activity, fill: "#10AC84" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Good evening, Shlok 👋
          </h2>
          <p className="text-dark-muted text-sm mt-1">{data.period}</p>
        </div>
        <button onClick={fetchDashboard} className="premium-btn-secondary py-2 text-sm self-start md:self-auto">
          <RefreshCw size={16} /> Sync Dashboard
        </button>
      </div>

      {/* Low-confidence Transaction Warning Banner */}
      {data.pending_reviews_count > 0 && (
        <div className="glass-panel border-semantic-review/30 bg-semantic-review/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-semantic-review/10 text-semantic-review rounded-lg">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Pending Verification</h4>
              <p className="text-xs text-dark-muted mt-0.5">
                PaisaWise detected {data.pending_reviews_count} transactions that require your review.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setTab("ai-inbox")}
            className="premium-btn py-1.5 px-4 text-xs font-semibold shrink-0"
          >
            Review Inbox <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Personal Spending */}
        <div className="glass-panel p-6 glass-panel-hover relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-dark-accent/20">
            <TrendingDown size={48} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Personal Spending</span>
          <h3 className="text-3xl font-bold text-white mt-2">₹{data.personal_spending.toLocaleString()}</h3>
          <div className="flex items-center gap-1.5 mt-3 text-xs">
            {data.spending_change_pct <= 0 ? (
              <span className="text-semantic-income flex items-center font-medium">
                <TrendingDown size={14} className="mr-0.5" />
                {Math.abs(data.spending_change_pct)}%
              </span>
            ) : (
              <span className="text-semantic-expense flex items-center font-medium">
                <TrendingUp size={14} className="mr-0.5" />
                {data.spending_change_pct}%
              </span>
            )}
            <span className="text-dark-muted">vs last month</span>
          </div>
        </div>

        {/* Card 2: Money Movement */}
        <div className="glass-panel p-6 glass-panel-hover">
          <span className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Money Movement</span>
          <h3 className="text-3xl font-bold text-white mt-2">
            ₹{(data.money_movement.total_inflow + data.money_movement.total_outflow).toLocaleString()}
          </h3>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-dark-border text-xs">
            <div className="flex items-center gap-1 text-semantic-income">
              <ArrowDownLeft size={14} />
              <span>In: ₹{data.money_movement.total_inflow.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-semantic-expense">
              <ArrowUpRight size={14} />
              <span>Out: ₹{data.money_movement.total_outflow.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Financial Activity */}
        <div className="glass-panel p-6 glass-panel-hover relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-semantic-income/10">
            <TrendingUp size={48} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Financial Activity</span>
          <h3 className="text-3xl font-bold text-white mt-2">₹{data.financial_activity.toLocaleString()}</h3>
          <p className="text-xs text-dark-muted mt-3">Investments & account transfers</p>
        </div>
      </div>

      {/* AI Insights & Budget Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Status Panel */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4">Monthly Budget Progress</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-muted">Overall Budget Limit</span>
              <span className="font-semibold text-white">₹{data.monthly_budget.limit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-dark-hover h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPct > 90 ? 'bg-semantic-expense' : 'bg-dark-accent'
                }`}
                style={{ width: `${budgetPct}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <p className="text-dark-muted">Spent</p>
                <p className="text-base font-bold text-white mt-0.5">₹{data.monthly_budget.spent.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-dark-muted">Remaining</p>
                <p className={`text-base font-bold mt-0.5 ${
                  budgetPct > 90 ? 'text-semantic-expense' : 'text-semantic-income'
                }`}>
                  ₹{data.monthly_budget.remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="glass-panel p-6 bg-gradient-to-br from-dark-card to-dark-hover/40 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400" /> AI Insights
            </h3>
            <p className="text-sm leading-relaxed text-dark-text bg-dark-bg/40 p-4 border border-dark-border/60 rounded-xl">
              {data.ai_insight}
            </p>
          </div>
          <button 
            onClick={() => setTab("ai")}
            className="premium-btn py-2 text-xs font-semibold mt-4 w-full"
          >
            Ask AI Assistant
          </button>
        </div>
      </div>

      {/* Cashflow Graph & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Column */}
        <div className="glass-panel p-6 lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">Cash Movement Breakdown</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242F4D" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                  contentStyle={{ backgroundColor: '#161D30', borderColor: '#242F4D', borderRadius: 8, color: '#fff' }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Bar key={`cell-${index}`} dataKey="amount" fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions list */}
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            <button 
              onClick={() => setTab("transactions")}
              className="text-xs text-dark-accent hover:underline flex items-center gap-0.5"
            >
              View ledger <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-dark-border/40 overflow-y-auto max-h-72 pr-2">
            {data.recent_transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between text-sm first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    tx.direction === "CREDIT" ? "bg-semantic-income" : "bg-semantic-expense"
                  }`} />
                  <div>
                    <h5 className="font-semibold text-white">{tx.merchant_name}</h5>
                    <p className="text-xs text-dark-muted mt-0.5">
                      {tx.transaction_date} · {tx.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${
                    tx.direction === "CREDIT" ? "text-semantic-income" : "text-dark-text"
                  }`}>
                    {tx.direction === "CREDIT" ? "+" : "-"} ₹{tx.amount.toLocaleString()}
                  </span>
                  <div className="text-[10px] text-dark-muted mt-0.5">
                    {tx.include ? "Personal" : "Excluded"}
                  </div>
                </div>
              </div>
            ))}
            {data.recent_transactions.length === 0 && (
              <div className="text-center py-10 text-dark-muted text-sm">
                No recent transactions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
