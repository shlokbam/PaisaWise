import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { Plus, ToggleLeft, ToggleRight, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "../context/ToastContext";

interface Category {
  id: string;
  name: string;
}

interface Rule {
  id: string;
  name: string;
  merchant_pattern?: string;
  upi_pattern?: string;
  payment_method?: string;
  amount_min?: number;
  amount_max?: number;
  set_ownership: string;
  set_transaction_type: string;
  set_category_id?: string;
  set_subcategory_id?: string;
  set_include_in_personal_expenses: boolean;
  priority: number;
  is_active: boolean;
  set_category?: { name: string };
}

export const Rules: React.FC = () => {
  const { showToast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [merchantPattern, setMerchantPattern] = useState("");
  const [upiPattern, setUpiPattern] = useState("");
  const [ownership, setOwnership] = useState("PERSONAL");
  const [type, setType] = useState("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [include, setInclude] = useState(true);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/rules");
      setRules(data);
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
    fetchRules();
    fetchCategories();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!merchantPattern && !upiPattern)) {
      showToast("Please provide a name and at least one search pattern.", "warning");
      return;
    }

    try {
      await apiRequest("/rules", {
        method: "POST",
        body: JSON.stringify({
          name,
          merchant_pattern: merchantPattern || null,
          upi_pattern: upiPattern || null,
          set_ownership: ownership,
          set_transaction_type: type,
          set_category_id: categoryId || null,
          set_include_in_personal_expenses: include,
          priority: 10,
          is_active: true
        })
      });
      
      setName("");
      setMerchantPattern("");
      setUpiPattern("");
      setCategoryId("");
      setShowAddForm(false);
      fetchRules();
    } catch (err) {
      showToast("Failed to create rule.", "error");
    }
  };

  const handleToggleActive = async (rule: Rule) => {
    try {
      await apiRequest(`/rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !rule.is_active })
      });
      fetchRules();
    } catch (err) {
      showToast("Failed to update rule status.", "error");
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await apiRequest(`/rules/${id}`, { method: "DELETE" });
      fetchRules();
      showToast("Automation rule deleted successfully.", "success");
    } catch (err) {
      showToast("Failed to delete rule.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Automation Rules</h2>
          <p className="text-dark-muted text-sm mt-0.5">Define deterministic mapping overrides for instant processing</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="premium-btn text-xs font-semibold py-2"
        >
          <Plus size={16} /> Create Automation Rule
        </button>
      </div>

      {/* Add Rule Form */}
      {showAddForm && (
        <form onSubmit={handleCreateRule} className="glass-panel p-5 bg-dark-card/40 border border-dark-border/80 rounded-xl space-y-4 max-w-xl">
          <h3 className="font-bold text-white text-sm">Add New Transaction Rule</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-dark-muted font-medium">Rule Title</label>
              <input
                type="text"
                placeholder="e.g. Swiggy Personal Food Rule"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full glass-input py-2 text-sm"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-dark-muted font-medium">Merchant Match Pattern (Regex/String)</label>
              <input
                type="text"
                placeholder="e.g. SWIGGY"
                value={merchantPattern}
                onChange={(e) => setMerchantPattern(e.target.value)}
                className="w-full glass-input py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-dark-muted font-medium">UPI VPA Match Pattern (Regex/String)</label>
              <input
                type="text"
                placeholder="e.g. swiggy@upi"
                value={upiPattern}
                onChange={(e) => setUpiPattern(e.target.value)}
                className="w-full glass-input py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-dark-muted font-medium">Set Ownership</label>
              <select
                value={ownership}
                onChange={(e) => setOwnership(e.target.value)}
                className="w-full glass-input py-2 text-sm"
              >
                <option value="PERSONAL">PERSONAL</option>
                <option value="FAMILY">FAMILY</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-dark-muted font-medium">Set Transaction Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full glass-input py-2 text-sm"
              >
                <option value="EXPENSE">EXPENSE</option>
                <option value="INCOME">INCOME</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="INVESTMENT">INVESTMENT</option>
                <option value="REFUND">REFUND</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-dark-muted font-medium">Set Category Mapping</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full glass-input py-2 text-sm"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-4 select-none">
              <input
                type="checkbox"
                id="rule-inc"
                checked={include}
                onChange={(e) => setInclude(e.target.checked)}
                className="rounded bg-dark-bg border-dark-border text-dark-accent"
              />
              <label htmlFor="rule-inc" className="text-dark-text font-medium">Include in Personal Spending</label>
            </div>
          </div>

          <div className="flex gap-2 justify-end text-xs pt-2">
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
              Save Rule
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-dark-muted">
          <RefreshCw className="animate-spin mr-2" /> Loading rules...
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="glass-panel p-5 bg-dark-card/30 border border-dark-border/40 hover:border-dark-border/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-white text-base">{rule.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    rule.is_active 
                      ? "bg-semantic-income/10 text-semantic-income border-semantic-income/20" 
                      : "bg-dark-hover text-dark-muted border-dark-border"
                  }`}>
                    {rule.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                
                {/* Patterns list */}
                <div className="flex flex-wrap gap-4 text-xs text-dark-muted">
                  {rule.merchant_pattern && (
                    <span>Merchant contains: <b className="text-white">"{rule.merchant_pattern}"</b></span>
                  )}
                  {rule.upi_pattern && (
                    <span>UPI ID contains: <b className="text-white">"{rule.upi_pattern}"</b></span>
                  )}
                </div>

                {/* Directives details */}
                <div className="flex flex-wrap gap-3 text-xs bg-dark-bg/40 p-2.5 rounded-lg border border-dark-border/40 max-w-md">
                  <span>Ownership: <b className="text-white">{rule.set_ownership}</b></span>
                  <span>Type: <b className="text-white">{rule.set_transaction_type}</b></span>
                  {rule.set_category && (
                    <span>Category: <b className="text-white">{rule.set_category.name}</b></span>
                  )}
                  <span>Include: <b className="text-white">{rule.set_include_in_personal_expenses ? "Yes" : "No"}</b></span>
                </div>
              </div>

              {/* Action columns */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                <button 
                  onClick={() => handleToggleActive(rule)} 
                  className="p-1.5 text-dark-muted hover:text-white hover:bg-dark-hover rounded"
                  title={rule.is_active ? "Disable Rule" : "Enable Rule"}
                >
                  {rule.is_active ? <ToggleRight size={26} className="text-dark-accent" /> : <ToggleLeft size={26} />}
                </button>
                <button 
                  onClick={() => handleDeleteRule(rule.id)} 
                  className="p-1.5 text-dark-muted hover:text-semantic-expense hover:bg-semantic-expense/10 rounded"
                  title="Delete Rule"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="glass-panel p-12 text-center text-dark-muted text-sm">
              No custom automation rules configured yet. Try correcting a transaction in the AI Inbox to see recommendations!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
