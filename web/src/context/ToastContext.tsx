import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="text-semantic-income shrink-0" size={18} />;
      case "error":
        return <AlertTriangle className="text-semantic-expense shrink-0" size={18} />;
      case "warning":
        return <AlertTriangle className="text-yellow-400 shrink-0" size={18} />;
      default:
        return <Info className="text-dark-accent shrink-0" size={18} />;
    }
  };

  const getTypeClasses = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-semantic-income/10 border-semantic-income/30 text-white shadow-semantic-income/5";
      case "error":
        return "bg-semantic-expense/10 border-semantic-expense/30 text-white shadow-semantic-expense/5";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30 text-white shadow-yellow-500/5";
      default:
        return "bg-dark-accent/15 border-dark-accent/30 text-white shadow-dark-accent/5";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Floating Stack Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass-panel p-4 flex items-center justify-between gap-3 border shadow-glow rounded-xl transition-all duration-300 pointer-events-auto ${getTypeClasses(
              toast.type
            )}`}
            style={{
              animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <div className="flex items-center gap-3">
              {getIcon(toast.type)}
              <p className="text-xs font-medium tracking-tight leading-relaxed pr-2">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-dark-muted hover:text-white p-0.5 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
