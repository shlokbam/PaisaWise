import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest, apiDownload } from "../services/api";
import { useToast } from "../context/ToastContext";
import { 
  Lock, Sparkles, Key, Eye, EyeOff, 
  Upload, CheckCircle, AlertTriangle, FileSpreadsheet, FileText, Download 
} from "lucide-react";

export const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  
  // State for API Keys
  const [groqKey, setGroqKey] = useState("");
  const [showGroq, setShowGroq] = useState(false);
  const [mistralKey, setMistralKey] = useState("");
  const [showMistral, setShowMistral] = useState(false);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysSuccess, setKeysSuccess] = useState(false);

  // State for Password Change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  // State for Avatar Upload
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // State for Exports
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [exportRange, setExportRange] = useState<"week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const handleUpdateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeysLoading(true);
    setKeysSuccess(false);
    try {
      await apiRequest("/auth/settings", {
        method: "PUT",
        body: JSON.stringify({
          groq_api_key: groqKey || undefined,
          mistral_api_key: mistralKey || undefined,
        }),
      });
      setKeysSuccess(true);
      setGroqKey("");
      setMistralKey("");
      await refreshUser();
    } catch (err: any) {
      showToast(err.message || "Failed to update API Keys.", "error");
    } finally {
      setKeysLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (newPassword !== confirmPassword) {
      setPwdError("New password confirmation does not match.");
      return;
    }

    setPwdLoading(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      setPwdSuccess("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdError(err.message || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setAvatarError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiRequest("/auth/profile-picture", {
        method: "POST",
        body: formData,
      });
      await refreshUser();
    } catch (err: any) {
      setAvatarError(err.message || "Failed to upload avatar.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      let endpoint = `/transactions/export?format=${exportFormat}&range_type=${exportRange}`;
      if (exportRange === "custom") {
        if (!startDate || !endDate) {
          showToast("Please specify start and end dates.", "warning");
          return;
        }
        endpoint += `&start_date=${startDate}&end_date=${endDate}`;
      }
      
      const blob = await apiDownload(endpoint);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = exportFormat === "csv" 
        ? `paisawise_report_${exportRange}.csv` 
        : `paisawise_statement_${exportRange}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      showToast(err.message || "Failed to download statement.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Settings Workspace</h2>
        <p className="text-sm text-dark-muted mt-1">Configure profile details, secure AI API integration, and export ledger reports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card & Password change */}
        <div className="lg:col-span-1 space-y-8">
          {/* Profile Card */}
          <div className="glass-panel p-6 flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-white mb-4">Profile Account</h3>
            
            <div className="relative group mb-4">
              {user?.profile_picture ? (
                <img 
                  src={`http://127.0.0.1:8000${user.profile_picture}`} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full border border-dark-border object-cover bg-dark-hover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-dark-accent/15 border border-dark-accent/30 text-dark-accent font-bold text-3xl flex items-center justify-center">
                  {user?.first_name?.substring(0, 2).toUpperCase() || "SH"}
                </div>
              )}
              
              <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-dark-accent text-white border border-dark-border hover:scale-105 active:scale-95 cursor-pointer shadow-glow transition-all">
                <Upload size={14} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  disabled={avatarLoading}
                  className="hidden" 
                />
              </label>
            </div>

            {avatarLoading && <p className="text-xs text-dark-accent animate-pulse mb-2">Uploading avatar image...</p>}
            {avatarError && <p className="text-xs text-semantic-expense mb-2">{avatarError}</p>}

            <h4 className="font-semibold text-white">{user?.first_name || "Shlok"}</h4>
            <p className="text-xs text-dark-muted mt-1">{user?.email}</p>
            <span className="text-[10px] bg-dark-accent/10 border border-dark-accent/20 text-dark-accent px-2.5 py-0.5 rounded-full mt-3 font-semibold">
              PaisaWise User
            </span>
          </div>

          {/* Change Password Form */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Lock size={18} className="text-dark-accent" />
              <span>Change Password</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwdError && (
                <div className="bg-semantic-expense/10 border border-semantic-expense/25 text-semantic-expense rounded-xl p-3 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /> {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="bg-semantic-income/10 border border-semantic-income/25 text-semantic-income rounded-xl p-3 text-xs flex items-center gap-2">
                  <CheckCircle size={14} /> {pwdSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-muted">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-muted">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-muted">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input py-2 text-xs"
                />
              </div>

              <button 
                type="submit" 
                disabled={pwdLoading}
                className="w-full premium-btn py-2 text-xs"
              >
                {pwdLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>

        {/* API keys configuration & Reports Export */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* API Keys Configuration */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Key size={18} className="text-dark-accent" />
              <span>AI Core API Integrations</span>
            </h3>
            <p className="text-xs text-dark-muted mb-4">
              Configure personal API keys to run high-confidence LLM classification prompts locally.
            </p>

            <form onSubmit={handleUpdateKeys} className="space-y-5">
              {keysSuccess && (
                <div className="bg-semantic-income/10 border border-semantic-income/25 text-semantic-income rounded-xl p-3 text-xs flex items-center gap-2">
                  <CheckCircle size={14} /> API settings updated successfully!
                </div>
              )}

              {/* Groq Key */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-dark-muted flex items-center gap-1">
                    <Sparkles size={12} className="text-yellow-400" /> Groq API Key
                  </label>
                  {user?.has_groq_key && (
                    <span className="text-[10px] text-semantic-income font-medium">✓ Configured in Cloud</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showGroq ? "text" : "password"}
                    placeholder={user?.has_groq_key ? "••••••••••••••••••••••••••••••••" : "gsk_..."}
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    className="w-full glass-input py-2.5 text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroq(!showGroq)}
                    className="absolute right-3.5 top-3.5 text-dark-muted hover:text-white"
                  >
                    {showGroq ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Mistral Key */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-dark-muted flex items-center gap-1">
                    <Sparkles size={12} className="text-purple-400" /> Mistral API Key
                  </label>
                  {user?.has_mistral_key && (
                    <span className="text-[10px] text-semantic-income font-medium">✓ Configured in Cloud</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showMistral ? "text" : "password"}
                    placeholder={user?.has_mistral_key ? "••••••••••••••••••••••••••••••••" : "Your Mistral API Key"}
                    value={mistralKey}
                    onChange={(e) => setMistralKey(e.target.value)}
                    className="w-full glass-input py-2.5 text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMistral(!showMistral)}
                    className="absolute right-3.5 top-3.5 text-dark-muted hover:text-white"
                  >
                    {showMistral ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={keysLoading}
                className="premium-btn py-2 text-xs ml-auto"
              >
                {keysLoading ? "Saving API keys..." : "Save API Configuration"}
              </button>
            </form>
          </div>

          {/* Export Reports Center */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Download size={18} className="text-dark-accent" />
              <span>Export Statements Center</span>
            </h3>
            <p className="text-xs text-dark-muted mb-6">
              Export full financial ledgers, summary statistics, and category classifications to your system.
            </p>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Format selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-muted">Output Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportFormat("csv")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        exportFormat === "csv"
                          ? "bg-dark-accent/15 border-dark-accent text-white"
                          : "bg-dark-hover/30 border-dark-border text-dark-muted hover:text-white"
                      }`}
                    >
                      <FileSpreadsheet size={16} className="text-green-500" />
                      <span>Excel (CSV)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat("pdf")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        exportFormat === "pdf"
                          ? "bg-dark-accent/15 border-dark-accent text-white"
                          : "bg-dark-hover/30 border-dark-border text-dark-muted hover:text-white"
                      }`}
                    >
                      <FileText size={16} className="text-red-500" />
                      <span>PDF Document</span>
                    </button>
                  </div>
                </div>

                {/* Range selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-muted">Statement Scope</label>
                  <select
                    value={exportRange}
                    onChange={(e) => setExportRange(e.target.value as any)}
                    className="w-full glass-input py-2 text-xs"
                  >
                    <option value="week" className="bg-dark-card text-white">This Week (Last 7 days)</option>
                    <option value="month" className="bg-dark-card text-white">This Month (Last 30 days)</option>
                    <option value="year" className="bg-dark-card text-white">This Year (Last 365 days)</option>
                    <option value="custom" className="bg-dark-card text-white">Custom Date Range...</option>
                  </select>
                </div>
              </div>

              {/* Custom date range fields */}
              {exportRange === "custom" && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-dark-border bg-dark-bg/30">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-dark-muted">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full glass-input py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-dark-muted">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full glass-input py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExport}
                disabled={exportLoading}
                className="w-full premium-btn py-3 mt-4 disabled:opacity-50"
              >
                {exportLoading ? "Generating Statement..." : "Export Financial Statement"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
