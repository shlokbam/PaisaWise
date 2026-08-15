import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, User, ShieldAlert } from "lucide-react";

export const Login: React.FC = () => {
  const { login, registerUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await registerUser(email, password, firstName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-dark-bg">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-dark-accent/10 rounded-full blur-3xl animate-glow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-glow"></div>

      <div className="w-full max-w-md glass-panel p-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span className="text-dark-accent">Paisa</span>Wise
          </h1>
          <p className="text-dark-muted mt-2 text-sm">"Spend smart. Know more."</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-semantic-expense/10 border border-semantic-expense/20 rounded-xl text-semantic-expense text-sm flex items-center gap-2">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-muted">First Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-3.5 text-dark-muted" />
                <input
                  type="text"
                  required
                  placeholder="Shlok"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full !pl-12 glass-input"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-muted">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-dark-muted" />
              <input
                type="email"
                required
                placeholder="shlok@paisawise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full !pl-12 glass-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-muted">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-dark-muted" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full !pl-12 glass-input"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full premium-btn py-3 mt-4">
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-dark-muted hover:text-white transition-colors duration-200"
          >
            {isRegister
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
