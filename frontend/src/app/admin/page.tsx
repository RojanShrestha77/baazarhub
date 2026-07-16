"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Shield, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type AdminTab = "users" | "verifications" | "logs";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>("users");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") { router.push("/"); return; }
    const fetchAll = async () => {
      try {
        const [users, verifications, logs] = await Promise.all([
          api.get<any[]>("/admin/users").catch(() => []),
          api.get<any[]>("/admin/verifications").catch(() => []),
          api.get<any[]>("/admin/logs?limit=50").catch(() => []),
        ]);
        setData({ users, verifications, logs });
      } catch { setData({ users: [], verifications: [], logs: [] }); }
    };
    fetchAll();
  }, [user, router]);

  if (!data) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;

  const updateRole = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      const users = await api.get<any[]>("/admin/users");
      setData({ ...data, users });
    } catch { /* ignore */ }
  };

  const updateTier = async (userId: string, tier: string) => {
    try {
      await api.patch(`/admin/users/${userId}/tier`, { tier });
      const users = await api.get<any[]>("/admin/users");
      setData({ ...data, users });
    } catch { /* ignore */ }
  };

  const updateVerification = async (verificationId: string, status: string) => {
    try {
      await api.patch(`/admin/verifications/${verificationId}`, { status });
      const verifications = await api.get<any[]>("/admin/verifications");
      setData({ ...data, verifications });
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        <div className="flex gap-2 mb-6">
          {(["users", "verifications", "logs"] as AdminTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-50"}`}>{t === "users" && <Users className="w-4 h-4 inline mr-1.5" />}{t === "verifications" && <Shield className="w-4 h-4 inline mr-1.5" />}{t === "logs" && <ClipboardList className="w-4 h-4 inline mr-1.5" />}{t}</button>
          ))}
        </div>
        {tab === "users" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{["Email", "Role", "Tier", "MFA", "Actions"].map((h) => <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>)}</tr></thead>
              <tbody>{data.users.map((u: any, i: number) => <tr key={u.id || u._id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={(e) => updateRole(u.id || u._id, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white">
                    <option value="user">User</option><option value="seller">Seller</option><option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select value={u.tier || "none"} onChange={(e) => updateTier(u.id || u._id, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white">
                    <option value="none">None</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option>
                  </select>
                </td>
                <td className="px-4 py-3">{u.mfaEnabled ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                <td className="px-4 py-3"><button onClick={() => {}} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">View</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {tab === "verifications" && (
          <div className="space-y-3">
            {data.verifications.length === 0 && <p className="text-gray-500 text-center py-12">No verifications</p>}
            {data.verifications.map((v: any) => (
              <div key={v.id || v._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                <div><p className="font-medium text-gray-900">{v.user?.email || "Unknown"}</p><p className="text-sm text-gray-500">{v.documentType} — {v.status}</p></div>
                {v.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => updateVerification(v.id || v._id, "approved")} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium hover:bg-green-200">Approve</button>
                    <button onClick={() => updateVerification(v.id || v._id, "rejected")} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium hover:bg-red-200">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {tab === "logs" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{["Action", "User", "IP", "Time"].map((h) => <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>)}</tr></thead>
              <tbody>{data.logs.map((l: any, i: number) => <tr key={l.id || i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-3">{l.user?.email || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.ip}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.createdAt || l.timestamp).toLocaleString()}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
