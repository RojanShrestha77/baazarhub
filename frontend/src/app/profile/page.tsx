"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Save, Download, Shield, Mail, BadgeCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserProfile } from "@/types";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get<UserProfile>("/profiles/me").then((p) => { setProfile(p); setName(p.displayName || ""); }).catch(() => {});
  }, [user, router]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.patch<UserProfile>("/profiles/me", { displayName: name });
      setProfile(updated);
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.get<{ data: string }>("/profiles/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "my-data.json"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch { toast.error("Export failed"); }
  };

  if (!user) return null;
  if (!profile) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{profile.displayName || "User"}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{profile.email}</span>
                <span className="inline-flex items-center gap-1"><Shield className="w-3.5 h-3.5" />{profile.role}</span>
                <span className="inline-flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" />{profile.sellerTier}</span>
              </div>
            </div>
            {profile.mfaEnabled && <span className="text-xs bg-green-50 text-green-700 font-medium px-3 py-1.5 rounded-full border border-green-100">MFA Enabled</span>}
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
          <h2 className="font-semibold text-gray-900">Account Details</h2>
          <div>
            <label htmlFor="p-name" className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
            <input id="p-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow text-sm" placeholder="Your display name" />
          </div>
          <div>
            <label htmlFor="p-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input id="p-email" type="email" value={profile.email} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed text-sm" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
              <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all">
              <Download className="w-4 h-4" />Export Data
            </button>
          </div>
        </form>

        {/* Security section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mt-6">
          <h2 className="font-semibold text-gray-900 mb-3">Security</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div><p className="text-sm font-medium text-gray-900">Multi-Factor Authentication</p><p className="text-xs text-gray-500">{profile.mfaEnabled ? "MFA is active" : "Add an extra layer of security"}</p></div>
              {profile.mfaEnabled ? (
                <span className="text-xs bg-green-50 text-green-700 font-medium px-3 py-1.5 rounded-full">Enabled</span>
              ) : (
                <a href="/mfa/enrol" className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Enable</a>
              )}
            </div>
            <div className="flex items-center justify-between py-2">
              <div><p className="text-sm font-medium text-gray-900">Password</p><p className="text-xs text-gray-500">Last changed —</p></div>
              <a href="/password/change" className="text-xs border border-gray-200 text-gray-700 px-4 py-1.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">Change</a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
