"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "./api";
import type { User, AuthContextValue } from "@/types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get("/auth/me") as User;
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email: string, password: string, captchaToken?: string) => {
    const data = await api.post("/auth/login", { email, password, captchaToken }) as User & { mfaRequired?: boolean };
    if (data.mfaRequired) {
      setMfaRequired(true);
      return;
    }
    setUser(data);
  };

  const register = async (email: string, password: string, captchaToken?: string) => {
    const data = await api.post("/auth/register", { email, password, captchaToken }) as User;
    setUser(data);
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setUser(null);
    setMfaRequired(false);
  };

  const verifyMfa = async (code: string) => {
    const data = await api.post("/auth/mfa/verify", { code }) as User;
    setUser(data);
    setMfaRequired(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, mfaRequired, login, register, logout, verifyMfa, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
