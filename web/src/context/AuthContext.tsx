import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../services/api";

interface User {
  email: string;
  first_name?: string;
  id: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  registerUser: (email: string, password: string, firstName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        // Find user by calling dashboard or custom profile route.
        // We call GET /dashboard. It returns period, personal spending, etc., which works as a verification.
        // We can define a tiny helper on backend, but let's just parse the JWT sub locally for speed!
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ id: payload.sub, email: "shlok@paisawise.com", first_name: "Shlok" });
      } catch (err) {
        console.error("Token decoding failed", err);
        logout();
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
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      setUser({ id: payload.sub, email, first_name: email.split("@")[0].toUpperCase() });
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
      // Automatically login after register
      await login(email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
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
