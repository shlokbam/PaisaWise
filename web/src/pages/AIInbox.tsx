import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { 
  Sparkles, Check, RefreshCw, Plus, CheckCircle2, Edit3 
} from "lucide-react";
import { useToast } from "../context/ToastContext";

interface Category {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: number;
  direction: string;
  transaction_date: string;
  merchant_name: string;
  upi_id?: string;
  sender?: string;
  receiver?: string;
  description?: string;
  ownership: string;
  transaction_type: string;
  confidence: number;
  category_id?: string;
  category?: { name: string };
}

interface RuleSuggestion {
  name: string;
  merchant_pattern?: string;
  upi_pattern?: string;
  set_ownership: string;
  set_transaction_type: string;
  set_category_id?: string;
  set_subcategory_id?: string;
  set_include_in_personal_expenses: boolean;
}

export const AIInbox: React.FC = () => {
  const { showToast } = useToast();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Rule Suggestion State
  const [activeSuggestion, setActiveSuggestion] = useState<RuleSuggestion | null>(null);
  
  // Custom Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOwnership, setEditOwnership] = useState("PERSONAL");
  const [editType, setEditType] = useState("EXPENSE");
  const [editCategory, setEditCategory] = useState("");
  const [editInclude, setEditInclude] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/transactions?needs_review=true");
      setTxs(data);
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
    fetchReviews();
    fetchCategories();
  }, []);

  const handleConfirm = async (tx: Transaction) => {
    try {
      const res = await apiRequest(`/transactions/${tx.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          ownership: tx.ownership,
          transaction_type: tx.transaction_type,
          category_id: tx.category_id,
          include_in_personal_expenses: tx.ownership === "PERSONAL" && tx.transaction_type === "EXPENSE"
        })
      });
      
      // Remove from active list
      setTxs(prev => prev.filter(item => item.id !== tx.id));
      
      if (res.suggest_rule) {
        setActiveSuggestion(res.rule_suggestion);
      }
    } catch (err) {
      showToast("Failed to confirm transaction.", "error");
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditOwnership(tx.ownership || "PERSONAL");
    setEditType(tx.transaction_type || "EXPENSE");
    setEditCategory(tx.category_id || "");
    setEditInclude(tx.ownership === "PERSONAL" && tx.transaction_type === "EXPENSE");
  };

  const handleSaveEdit = async (txId: string) => {
    try {
      const res = await apiRequest(`/transactions/${txId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          ownership: editOwnership,
          transaction_type: editType,
          category_id: editCategory || null,
          include_in_personal_expenses: editInclude
        })
      });
      setEditingId(null);
      setTxs(prev => prev.filter(item => item.id !== txId));
      
      if (res.suggest_rule) {
        setActiveSuggestion(res.rule_suggestion);
      }
    } catch (err) {
      showToast("Failed to save changes.", "error");
    }
  };

  const handleCreateRule = async () => {
    if (!activeSuggestion) return;
    try {
      await apiRequest("/rules", {
        method: "POST",
        body: JSON.stringify(activeSuggestion)
      });
      setActiveSuggestion(null);
      showToast("Rule created successfully! Matching transactions will auto-classify.", "success");
    } catch (err) {
      showToast("Failed to create rule.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-yellow-400" size={24} /> AI Inbox
        </h2>
        <p className="text-dark-muted text-sm mt-0.5">
          Verify and resolve transactions flagged for review.
        </p>
      </div>

      {/* Rule Suggestion Banner Alert */}
      {activeSuggestion && (
        <div className="glass-panel border-dark-accent/40 bg-dark-accent/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-white text-base">Suggested Rule Available</h4>
            <p className="text-sm text-dark-muted mt-1">
              You repeatedly corrected transactions from <span className="text-white font-semibold">{activeSuggestion.merchant_pattern || activeSuggestion.upi_pattern}</span>. Create a permanent rule?
            </p>
            <div className="flex gap-4 mt-2 text-xs text-dark-muted">
              <span>Set Ownership: <b className="text-white">{activeSuggestion.set_ownership}</b></span>
              <span>Inclusion: <b className="text-white">{activeSuggestion.set_include_in_personal_expenses ? "Include" : "Exclude"}</b></span>
            </div>
          </div>
          <div className="flex gap-2.5 shrink-0 self-end sm:self-center">
            <button onClick={() => setActiveSuggestion(null)} className="premium-btn-secondary py-2 text-xs">
              Dismiss
            </button>
            <button onClick={handleCreateRule} className="premium-btn py-2 text-xs">
              <Plus size={14} /> Create Rule
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-dark-muted">
          <RefreshCw className="animate-spin mr-2" /> Fetching reviews...
        </div>
      ) : txs.length === 0 ? (
        <div className="glass-panel p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 bg-semantic-income/10 text-semantic-income rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-xl font-bold text-white">All caught up!</h3>
          <p className="text-dark-muted text-sm max-w-sm mx-auto">
            Your transactions are either successfully parsed or have high classification confidence scores.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {txs.map((tx) => (
            <div key={tx.id} className="glass-panel p-5 bg-dark-card/50 flex flex-col justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-[10px] font-bold text-yellow-500 bg-yellow-500/10 rounded-bl-xl border-l border-b border-dark-border">
                Confidence: {Math.round(tx.confidence * 100)}%
              </div>

              <div>
                <span className="text-xs text-dark-muted font-medium">{tx.transaction_date}</span>
                <h4 className="text-lg font-bold text-white mt-1">
                  {tx.merchant_name || tx.sender || "Unknown Merchant"}
                </h4>
                <p className="text-xs text-dark-muted truncate mt-1">
                  {tx.upi_id || tx.description}
                </p>
                <div className="text-xl font-black text-white mt-3">
                  ₹{tx.amount.toLocaleString()}
                </div>
              </div>

              {/* Editing Form */}
              {editingId === tx.id ? (
                <div className="grid grid-cols-2 gap-3 bg-dark-bg/60 p-4 rounded-xl border border-dark-border text-xs">
                  <div className="space-y-1">
                    <label className="text-dark-muted font-semibold">Ownership</label>
                    <select 
                      value={editOwnership} 
                      onChange={(e) => setEditOwnership(e.target.value)}
                      className="w-full bg-dark-card border border-dark-border text-white rounded p-1.5 focus:outline-none"
                    >
                      <option value="PERSONAL">PERSONAL</option>
                      <option value="FAMILY">FAMILY</option>
                      <option value="BUSINESS">BUSINESS</option>
                      <option value="UNKNOWN">UNKNOWN</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-dark-muted font-semibold">Type</label>
                    <select 
                      value={editType} 
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full bg-dark-card border border-dark-border text-white rounded p-1.5 focus:outline-none"
                    >
                      <option value="EXPENSE">EXPENSE</option>
                      <option value="INCOME">INCOME</option>
                      <option value="TRANSFER">TRANSFER</option>
                      <option value="INVESTMENT">INVESTMENT</option>
                      <option value="REFUND">REFUND</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-dark-muted font-semibold">Category</label>
                    <select 
                      value={editCategory} 
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-dark-card border border-dark-border text-white rounded p-1.5 focus:outline-none"
                    >
                      <option value="">None</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 col-span-2 mt-2">
                    <input 
                      type="checkbox" 
                      id={`inc-${tx.id}`} 
                      checked={editInclude} 
                      onChange={(e) => setEditInclude(e.target.checked)}
                      className="rounded bg-dark-bg border-dark-border text-dark-accent" 
                    />
                    <label htmlFor={`inc-${tx.id}`} className="text-dark-text font-medium select-none">
                      Include in Personal Expenses
                    </label>
                  </div>
                  
                  <div className="flex gap-2 col-span-2 mt-3 pt-2 border-t border-dark-border">
                    <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 border border-dark-border rounded-lg text-dark-muted font-semibold hover:text-white hover:bg-dark-hover transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => handleSaveEdit(tx.id)} className="flex-1 py-1.5 bg-dark-accent rounded-lg text-white font-semibold hover:bg-dark-accent/90 transition-colors">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-dark-border/40">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-dark-muted">Prediction:</span>
                    <span className="bg-dark-hover px-2 py-0.5 rounded text-white font-semibold">
                      {tx.ownership} · {tx.category?.name || "Other"}
                    </span>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => handleConfirm(tx)} 
                      className="flex-1 py-2 bg-semantic-income/10 border border-semantic-income/20 text-semantic-income rounded-xl text-xs font-semibold hover:bg-semantic-income/20 transition-all flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Correct
                    </button>
                    <button 
                      onClick={() => handleStartEdit(tx)} 
                      className="flex-1 py-2 bg-dark-hover border border-dark-border text-dark-text rounded-xl text-xs font-semibold hover:bg-dark-hover/80 transition-all flex items-center justify-center gap-1"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
