import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../services/api";

interface User {
  email: string;
  first_name?: string;
  id: string;
  profile_picture?: string;
  has_groq_key?: boolean;
  has_mistral_key?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  registerUser: (email: string, password: string, firstName: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { getAuthToken, setAuthToken, clearAuthTokens } from "../services/storage";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const userData = await apiRequest("/auth/me");
      setUser(userData);
    } catch (err) {
      console.error("Refresh user profile failed", err);
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await apiRequest("/auth/me");
        setUser(userData);
      } catch (err: any) {
        console.error("Fetch current user failed", err);
        // Only clear tokens if server explicitly returns 401 Unauthorized
        if (err.message && err.message.includes("Session expired")) {
          await clearAuthTokens();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest("/auth/login-json", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await setAuthToken(data.access_token, data.refresh_token);
      
      const userData = await apiRequest("/auth/me");
      setUser(userData);
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (email: string, password: string, firstName: string) => {
    setLoading(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, first_name: firstName }),
      });
      await login(email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await clearAuthTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        registerUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
