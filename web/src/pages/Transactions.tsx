import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { 
  Search, Edit3, Check, X, Plus 
} from "lucide-react";
import { useToast } from "../context/ToastContext";

interface Category {
  id: string;
  name: string;
  code: string;
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
  payment_method: string;
  description?: string;
  ownership: string;
  transaction_type: string;
  confidence: number;
  include_in_personal_expenses: boolean;
  category_id?: string;
  subcategory_id?: string;
  category?: { name: string };
}

export const Transactions: React.FC = () => {
  const { showToast } = useToast();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, PERSONAL, FAMILY, INCOME, INVESTMENTS, TRANSFERS, EXCLUDED, NEEDS_REVIEW
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit Form Fields
  const [editOwnership, setEditOwnership] = useState("");
  const [editType, setEditType] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editInclude, setEditInclude] = useState(false);

  // Manual Entry Form Fields
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addMerchant, setAddMerchant] = useState("");
  const [addType, setAddType] = useState("EXPENSE");
  const [addOwnership, setAddOwnership] = useState("PERSONAL");
  const [addCategory, setAddCategory] = useState("");
  const [addPaymentMethod, setAddPaymentMethod] = useState("CASH");
  const [addInclude, setAddInclude] = useState(true);
  const [addDate, setAddDate] = useState(new Date().toISOString().split("T")[0]);
  const [addDesc, setAddDesc] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await apiRequest("/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(addAmount),
          currency: "INR",
          direction: addType === "INCOME" ? "CREDIT" : "DEBIT",
          transaction_date: addDate || new Date().toISOString().split("T")[0],
          merchant_name: addMerchant,
          payment_method: addPaymentMethod,
          description: addDesc || undefined,
          ownership: addOwnership,
          transaction_type: addType,
          category_id: addCategory || undefined,
          include_in_personal_expenses: addType === "EXPENSE" && addOwnership === "PERSONAL" ? addInclude : false
        })
      });
      setShowAddModal(false);
      setAddAmount("");
      setAddMerchant("");
      setAddType("EXPENSE");
      setAddOwnership("PERSONAL");
      setAddCategory("");
      setAddPaymentMethod("CASH");
      setAddDesc("");
      setAddDate(new Date().toISOString().split("T")[0]);
      fetchTransactions();
    } catch (err: any) {
      showToast(err.message || "Failed to add transaction.", "error");
    } finally {
      setAddLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = "/transactions?";
      if (filterType === "PERSONAL") url += "ownership=PERSONAL&type=EXPENSE&include=true";
      else if (filterType === "FAMILY") url += "ownership=FAMILY";
      else if (filterType === "INCOME") url += "type=INCOME";
      else if (filterType === "INVESTMENTS") url += "type=INVESTMENT";
      else if (filterType === "TRANSFERS") url += "type=TRANSFER";
      else if (filterType === "EXCLUDED") url += "include=false";
      else if (filterType === "NEEDS_REVIEW") url += "needs_review=true";

      if (search) url += `&search=${encodeURIComponent(search)}`;

      const data = await apiRequest(url);
      setTxs(data);
    } catch (err) {
      console.error("Failed to load transactions", err);
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
    fetchTransactions();
  }, [filterType, search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleStartEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditOwnership(tx.ownership);
    setEditType(tx.transaction_type);
    setEditCategory(tx.category_id || "");
    setEditInclude(tx.include_in_personal_expenses);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await apiRequest(`/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ownership: editOwnership,
          transaction_type: editType,
          category_id: editCategory || null,
          include_in_personal_expenses: editInclude
        })
      });
      setEditingId(null);
      fetchTransactions();
    } catch (err) {
      showToast("Failed to save changes.", "error");
    }
  };

  const getOwnershipLabel = (ownership: string) => {
    switch (ownership) {
      case "PERSONAL": return "bg-dark-accent/15 text-dark-accent border-dark-accent/20";
      case "FAMILY": return "bg-purple-500/15 text-purple-400 border-purple-500/20";
      case "BUSINESS": return "bg-blue-500/15 text-blue-400 border-blue-500/20";
      default: return "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Ledger</h2>
          <p className="text-dark-muted text-sm mt-0.5">Manage and verify all transaction classifications</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="premium-btn py-2 text-xs shrink-0"
        >
          <Plus size={14} /> Record Manual/Cash
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-card/40 border border-dark-border p-4 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-3 text-dark-muted" />
          <input
            type="text"
            placeholder="Search by merchant, UPI ID, or body..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full !pl-10 pr-4 py-2 glass-input text-sm"
          />
        </div>
        
        {/* Preset Filter Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "PERSONAL", "FAMILY", "INCOME", "INVESTMENTS", "TRANSFERS", "NEEDS_REVIEW"].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                filterType === filter
                  ? "bg-dark-accent text-white border-dark-accent"
                  : "bg-dark-bg/60 text-dark-muted border-dark-border hover:border-dark-muted/40"
              }`}
            >
              {filter.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg/40 text-dark-muted text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Entity</th>
                <th className="py-4 px-6">Ownership</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Personal?</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40">
              {txs.map((tx) => (
                <tr key={tx.id} className="hover:bg-dark-hover/10 transition-colors">
                  {/* Date */}
                  <td className="py-4 px-6 text-xs text-dark-muted whitespace-nowrap">
                    {tx.transaction_date}
                  </td>
                  
                  {/* Merchant / Description */}
                  <td className="py-4 px-6">
                    <h5 className="font-semibold text-white">{tx.merchant_name || tx.sender || tx.receiver || "Unknown"}</h5>
                    <p className="text-xs text-dark-muted max-w-xs truncate mt-0.5" title={tx.description}>
                      {tx.upi_id || tx.description || "-"}
                    </p>
                  </td>

                  {/* Ownership Classification */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    {editingId === tx.id ? (
                      <select
                        value={editOwnership}
                        onChange={(e) => setEditOwnership(e.target.value)}
                        className="bg-dark-bg border border-dark-border text-xs rounded p-1"
                      >
                        <option value="PERSONAL">PERSONAL</option>
                        <option value="FAMILY">FAMILY</option>
                        <option value="BUSINESS">BUSINESS</option>
                        <option value="UNKNOWN">UNKNOWN</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getOwnershipLabel(tx.ownership)}`}>
                        {tx.ownership}
                      </span>
                    )}
                  </td>

                  {/* Transaction Type */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    {editingId === tx.id ? (
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="bg-dark-bg border border-dark-border text-xs rounded p-1"
                      >
                        <option value="EXPENSE">EXPENSE</option>
                        <option value="INCOME">INCOME</option>
                        <option value="TRANSFER">TRANSFER</option>
                        <option value="INVESTMENT">INVESTMENT</option>
                        <option value="REFUND">REFUND</option>
                        <option value="SETTLEMENT">SETTLEMENT</option>
                        <option value="CASH_WITHDRAWAL">CASH_WITHDRAWAL</option>
                      </select>
                    ) : (
                      <span className="text-xs text-dark-muted">{tx.transaction_type}</span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    {editingId === tx.id ? (
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="bg-dark-bg border border-dark-border text-xs rounded p-1"
                      >
                        <option value="">None</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-dark-text">{tx.category?.name || "-"}</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-4 px-6 text-right font-bold whitespace-nowrap">
                    <span className={tx.direction === "CREDIT" ? "text-semantic-income" : "text-white"}>
                      {tx.direction === "CREDIT" ? "+" : "-"} ₹{tx.amount.toLocaleString()}
                    </span>
                  </td>

                  {/* Include in Personal Expenses checkbox */}
                  <td className="py-4 px-6 text-center">
                    {editingId === tx.id ? (
                      <input
                        type="checkbox"
                        checked={editInclude}
                        onChange={(e) => setEditInclude(e.target.checked)}
                        className="w-4 h-4 rounded text-dark-accent bg-dark-bg border-dark-border focus:ring-dark-accent"
                      />
                    ) : (
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                        tx.include_in_personal_expenses ? "bg-semantic-income/20 text-semantic-income" : "bg-dark-hover text-dark-muted"
                      }`}>
                        {tx.include_in_personal_expenses ? "✓" : "✗"}
                      </span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    {editingId === tx.id ? (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleSaveEdit(tx.id)} className="p-1 text-semantic-income hover:bg-semantic-income/10 rounded">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-semantic-expense hover:bg-semantic-expense/10 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleStartEdit(tx)} className="p-1 text-dark-muted hover:text-white hover:bg-dark-hover/40 rounded">
                        <Edit3 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {txs.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-dark-muted">
                    No transactions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-dark-border pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-dark-accent" />
                <span>Record Manual Transaction</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-dark-muted hover:text-white p-1 hover:bg-dark-hover/40 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-dark-muted">Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full glass-input py-2 text-xs"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-dark-muted">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full glass-input py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Merchant / Entity */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-muted">Merchant / Entity / Sender *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cash Expense, Chai Stall, Friend Amit"
                  value={addMerchant}
                  onChange={(e) => setAddMerchant(e.target.value)}
                  className="w-full glass-input py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-dark-muted">Transaction Type</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value)}
                    className="w-full glass-input py-2 text-xs"
                  >
                    <option value="EXPENSE" className="bg-dark-card text-white">Expense (Debit)</option>
                    <option value="INCOME" className="bg-dark-card text-white">Income (Credit)</option>
                    <option value="INVESTMENT" className="bg-dark-card text-white">Investment (SIP/IPO)</option>
                    <option value="TRANSFER" className="bg-dark-card text-white">Self Transfer</option>
                    <option value="SETTLEMENT" className="bg-dark-card text-white">Settlement</option>
                  </select>
                </div>

                {/* Ownership */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-dark-muted">Ownership</label>
                  <select
                    value={addOwnership}
                    onChange={(e) => setAddOwnership(e.target.value)}
                    className="w-full glass-input py-2 text-xs"
                  >
                    <option value="PERSONAL" className="bg-dark-card text-white">Personal</option>
                    <option value="FAMILY" className="bg-dark-card text-white">Family</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-dark-muted">Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full glass-input py-2 text-xs"
                  >
                    <option value="" className="bg-dark-card text-white">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-dark-card text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-dark-muted">Payment Method</label>
                  <select
                    value={addPaymentMethod}
                    onChange={(e) => setAddPaymentMethod(e.target.value)}
                    className="w-full glass-input py-2 text-xs"
                  >
                    <option value="CASH" className="bg-dark-card text-white">Cash</option>
                    <option value="UPI" className="bg-dark-card text-white">UPI (GPay/PhonePe)</option>
                    <option value="CARD" className="bg-dark-card text-white">Debit/Credit Card</option>
                    <option value="NETBANKING" className="bg-dark-card text-white">NetBanking</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-muted">Description (Notes)</label>
                <input
                  type="text"
                  placeholder="Additional context/notes..."
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="w-full glass-input py-2 text-xs"
                />
              </div>

              {/* Include in Personal Spending Toggle */}
              {addType === "EXPENSE" && addOwnership === "PERSONAL" && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="addInclude"
                    checked={addInclude}
                    onChange={(e) => setAddInclude(e.target.checked)}
                    className="rounded bg-dark-bg border-dark-border text-dark-accent focus:ring-dark-accent"
                  />
                  <label htmlFor="addInclude" className="text-xs text-dark-muted cursor-pointer select-none">
                    Include in Personal Spending Calculations
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 premium-btn-secondary py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 premium-btn py-2.5 text-xs"
                >
                  {addLoading ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
