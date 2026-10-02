import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Year, Specialization, Term } from "../types";
import { apiRequest } from "../api/client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  hasAdmin: boolean;
  years: Year[];
  specializations: Specialization[];
  terms: Term[];
  login: (studentCode: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  setupAdmin: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasAdmin, setHasAdmin] = useState<boolean>(true);
  const [years, setYears] = useState<Year[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  // Load taxonomy data
  const loadTaxonomy = useCallback(async () => {
    try {
      const data = await apiRequest<{ years: Year[]; specializations: Specialization[]; terms: Term[] }>("/api/taxonomy");
      setYears(data.years || []);
      setSpecializations(data.specializations || []);
      setTerms(data.terms || []);
    } catch (err) {
      console.error("Failed to load taxonomy:", err);
    }
  }, []);

  // Check admin status
  const checkAdminStatus = useCallback(async () => {
    try {
      const data = await apiRequest<{ hasAdmin: boolean }>("/api/auth/admin-status");
      setHasAdmin(data.hasAdmin);
    } catch {
      // ignore
    }
  }, []);

  // Fetch current user
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setUser(null);
        return;
      }
      const data = await apiRequest<{ user: User | null }>("/api/auth/me");
      setUser(data.user);
      if (!data.user) {
        localStorage.removeItem("auth_token");
      }
    } catch (err) {
      localStorage.removeItem("auth_token");
      setUser(null);
    }
  }, []);

  // Initialize app
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([refreshUser(), loadTaxonomy(), checkAdminStatus()]);
      setIsLoading(false);
    }
    init();
  }, [refreshUser, loadTaxonomy, checkAdminStatus]);

  // Periodic heartbeat to update user's last_seen
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      apiRequest("/api/auth/heartbeat", { method: "POST" }).catch(() => {});
    }, 2 * 60 * 1000); // every 2 minutes

    return () => clearInterval(interval);
  }, [user]);

  const login = async (studentCode: string, password: string) => {
    const data = await apiRequest<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ student_code: studentCode, password }),
    });

    localStorage.setItem("auth_token", data.token);
    setUser(data.user);
    await checkAdminStatus();
  };

  const register = async (formData: any) => {
    const data = await apiRequest<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    localStorage.setItem("auth_token", data.token);
    setUser(data.user);
    await checkAdminStatus();
  };

  const setupAdmin = async (formData: any) => {
    const data = await apiRequest<{ token: string; user: User }>("/api/auth/admin-setup", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    localStorage.setItem("auth_token", data.token);
    setUser(data.user);
    setHasAdmin(true);
  };

  const logout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (_) {}
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        hasAdmin,
        years,
        specializations,
        terms,
        login,
        register,
        setupAdmin,
        logout,
        refreshUser,
        checkAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
