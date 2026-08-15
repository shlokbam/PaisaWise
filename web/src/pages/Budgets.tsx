import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { 
  Plus, RefreshCw, AlertTriangle 
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

export const Budgets: React.FC = () => {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

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
          {budgets.map((b) => (
            <div key={b.category_code} className="glass-panel p-6 bg-dark-card/30 border border-dark-border/40 hover:border-dark-border/80 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: b.color }} />
                  <h4 className="font-bold text-white text-base">{b.category_name}</h4>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  b.percentage > 100 
                    ? "bg-semantic-expense/10 text-semantic-expense border-semantic-expense/20" 
                    : "bg-dark-hover text-dark-muted border-dark-border"
                }`}>
                  {b.percentage.toFixed(1)}% Used
                </span>
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
            </div>
          ))}
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
    </div>
  );
};
