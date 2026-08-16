import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { 
  Plus, RefreshCw, AlertTriangle, ChevronRight, X, Trash2, Receipt
} from "lucide-react";
import { useToast } from "../context/ToastContext";

interface Category {
  id: string;
  name: string;
}

interface BudgetStatus {
  category_id?: string;
  category_name: string;
  category_code: string;
  color: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
}

interface Transaction {
  id: string;
  merchant_name?: string;
  sender?: string;
  receiver?: string;
  upi_id?: string;
  description?: string;
  amount: number;
  direction: string;
  transaction_date: string;
  transaction_type: string;
  category?: { name: string };
}

export const Budgets: React.FC = () => {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Budget Spending Drawer State
  const [selectedBudget, setSelectedBudget] = useState<BudgetStatus | null>(null);
  const [budgetTransactions, setBudgetTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Form Fields
  const [categoryId, setCategoryId] = useState(""); // empty means overall
  const [amount, setAmount] = useState("");

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/budgets");
      setBudgets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiRequest("/categories");
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, []);

  const handleSelectBudget = async (b: BudgetStatus) => {
    if (selectedBudget?.category_code === b.category_code) {
      setSelectedBudget(null);
      setBudgetTransactions([]);
      return;
    }
    setSelectedBudget(b);
    setLoadingTx(true);
    try {
      let url = "/transactions?limit=100&type=EXPENSE&include=true";
      if (b.category_id) {
        url += `&category_id=${b.category_id}`;
      }
      const data = await apiRequest(url);
      setBudgetTransactions(data);
    } catch (err) {
      console.error("Failed to load budget transactions", err);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (!window.confirm("Delete this transaction permanently?")) return;
    try {
      await apiRequest(`/transactions/${txId}`, { method: "DELETE" });
      showToast("Transaction deleted.", "success");
      setBudgetTransactions(prev => prev.filter(t => t.id !== txId));
      fetchBudgets(); // refresh totals
    } catch (err) {
      showToast("Failed to delete transaction.", "error");
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

      await apiRequest("/budgets", {
        method: "POST",
        body: JSON.stringify({
          category_id: categoryId || null,
          amount: parseFloat(amount),
          period_start: startOfMonth,
          period_end: endOfMonth
        })
      });
      
      setAmount("");
      setCategoryId("");
      setShowAddForm(false);
      fetchBudgets();
    } catch (err) {
      showToast("Failed to save budget.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Monthly Budgets</h2>
          <p className="text-dark-muted text-sm mt-0.5">Control your monthly caps and track overspending</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="premium-btn text-xs font-semibold py-2"
        >
          <Plus size={16} /> Configure Budget
        </button>
      </div>

      {/* Add/Edit Budget Form Panel */}
      {showAddForm && (
        <form onSubmit={handleAddBudget} className="glass-panel p-5 bg-dark-card/40 border border-dark-border/80 rounded-xl space-y-4 max-w-lg">
          <h3 className="font-bold text-white text-sm">Add or Edit Monthly Limit</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-dark-muted font-medium">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full glass-input text-sm py-2"
              >
                <option value="">Overall Spending</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-dark-muted font-medium">Amount Limit (INR)</label>
              <input
                type="number"
                placeholder="Limit e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full glass-input text-sm py-2"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end text-xs">
            <button 
              type="button"
              onClick={() => setShowAddForm(false)}
              className="premium-btn-secondary py-2"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="premium-btn py-2"
            >
              Save Cap
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-dark-muted">
          <RefreshCw className="animate-spin mr-2" /> Loading budgets...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((b) => {
            const isSelected = selectedBudget?.category_code === b.category_code;
            return (
              <div 
                key={b.category_code} 
                onClick={() => handleSelectBudget(b)}
                className={`glass-panel p-6 cursor-pointer transition-all duration-200 relative ${
                  isSelected 
                    ? "bg-dark-card/90 border-dark-accent shadow-glow ring-2 ring-dark-accent/50" 
                    : "bg-dark-card/30 border-dark-border/40 hover:border-dark-accent/40 hover:bg-dark-card/50"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <h4 className="font-bold text-white text-base">{b.category_name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                      b.percentage > 100 
                        ? "bg-semantic-expense/10 text-semantic-expense border-semantic-expense/20" 
                        : "bg-dark-hover text-dark-muted border-dark-border"
                    }`}>
                      {b.percentage.toFixed(1)}% Used
                    </span>
                    <ChevronRight size={16} className={`text-dark-muted transition-transform ${isSelected ? "rotate-90 text-dark-accent" : ""}`} />
                  </div>
                </div>

                {/* Progress Slider */}
                <div className="w-full bg-dark-hover h-2.5 rounded-full overflow-hidden mb-4">
                  <div 
                    className={`h-full rounded-full transition-all duration-500`}
                    style={{ 
                      width: `${Math.min(100, b.percentage)}%`, 
                      backgroundColor: b.percentage > 100 ? "#F43F5E" : b.color 
                    }}
                  ></div>
                </div>

                {/* Data row */}
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <p className="text-dark-muted font-medium">Spent</p>
                    <p className="text-base font-bold text-white mt-0.5">₹{b.spent.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-dark-muted font-medium">Cap Limit</p>
                    <p className="text-base font-bold text-white mt-0.5">₹{b.limit.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-dark-muted font-medium">{b.percentage > 100 ? "Over Budget" : "Remaining"}</p>
                    <p className={`text-base font-bold mt-0.5 ${
                      b.percentage > 100 ? "text-semantic-expense" : "text-semantic-income"
                    }`}>
                      ₹{b.percentage > 100 ? Math.abs(b.limit - b.spent).toLocaleString() : b.remaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Overbudget Alert warning */}
                {b.percentage > 100 && (
                  <div className="mt-4 p-3 bg-semantic-expense/10 border border-semantic-expense/20 rounded-xl text-semantic-expense text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Budget exceeded by ₹{(b.spent - b.limit).toLocaleString()}! Consider spending smart.</span>
                  </div>
                )}

                <div className="mt-3 text-[11px] text-dark-accent font-semibold flex items-center gap-1 justify-end opacity-80 hover:opacity-100">
                  <span>{isSelected ? "Hide Spendings" : "Click to view transactions"}</span>
                  <ChevronRight size={12} className={isSelected ? "rotate-90" : ""} />
                </div>
              </div>
            );
          })}
          {budgets.length === 0 && (
            <div className="col-span-2 glass-panel p-12 text-center text-dark-muted text-sm space-y-4">
              <p>No budgets configured for this billing period.</p>
              <button onClick={() => setShowAddForm(true)} className="premium-btn py-2 text-xs font-semibold mx-auto">
                Set Overall Spending Budget
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Budget Transaction Drawer */}
      {selectedBudget && (
        <div className="glass-panel p-6 bg-dark-card/90 border border-dark-accent/40 rounded-2xl space-y-4 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-dark-border">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: selectedBudget.color }} />
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <span>{selectedBudget.category_name} Transactions</span>
                  <span className="text-xs bg-dark-accent/20 text-dark-accent px-2 py-0.5 rounded-full border border-dark-accent/30 font-semibold">
                    {budgetTransactions.length} Items
                  </span>
                </h3>
                <p className="text-xs text-dark-muted">
                  Total Spent: <strong className="text-white">₹{selectedBudget.spent.toLocaleString()}</strong> out of ₹{selectedBudget.limit.toLocaleString()} cap
                </p>
              </div>
            </div>

            <button 
              onClick={() => { setSelectedBudget(null); setBudgetTransactions([]); }}
              className="p-1.5 text-dark-muted hover:text-white hover:bg-dark-hover rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {loadingTx ? (
            <div className="py-12 text-center text-dark-muted text-sm flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin" size={16} /> Loading transaction history...
            </div>
          ) : budgetTransactions.length === 0 ? (
            <div className="py-12 text-center text-dark-muted text-sm flex flex-col items-center gap-2">
              <Receipt size={32} className="opacity-40" />
              <p>No transactions found under {selectedBudget.category_name} yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border/40 max-h-96 overflow-y-auto pr-1 space-y-1">
              {budgetTransactions.map((tx) => (
                <div key={tx.id} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-dark-hover/20 rounded-xl transition-colors">
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-white text-sm truncate">
                      {tx.merchant_name || tx.sender || tx.receiver || "Unknown Merchant"}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-dark-muted mt-0.5">
                      <span>{tx.transaction_date}</span>
                      <span>•</span>
                      <span className="truncate max-w-xs">{tx.upi_id || tx.description || "UPI"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`font-bold text-sm ${tx.direction === "CREDIT" ? "text-semantic-income" : "text-white"}`}>
                        {tx.direction === "CREDIT" ? "+" : "-"} ₹{tx.amount.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-dark-muted block uppercase font-medium">
                        {tx.transaction_type}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteTx(tx.id)}
                      className="p-1.5 text-dark-muted hover:text-semantic-expense hover:bg-semantic-expense/10 rounded-lg transition-colors"
                      title="Delete Transaction"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

