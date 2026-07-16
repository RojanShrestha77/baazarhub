"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, ApiError } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get("/profiles/me");
      setUser(data);
    } catch { setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password, captchaToken) => {
    const data = await api.post("/auth/login", { email, password, captchaToken });
    if (data.mfaRequired) { setMfaRequired(true); }
    else { await fetchUser(); }
    return data;
  };

  const register = async (email, password, captchaToken) => {
    return api.post("/auth/register", { email, password, captchaToken });
  };

  const logout = async () => {
    try { await api.post("/auth/logout", {}); } catch {}
    setUser(null); setMfaRequired(false);
  };

  const verifyMfa = async (code) => {
    await api.post("/auth/mfa/verify", { code });
    setMfaRequired(false); await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, mfaRequired, login, register, logout, verifyMfa, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
