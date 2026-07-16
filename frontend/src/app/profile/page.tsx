"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { User as UserIcon, Shield, Download, Key, BadgeCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const [bio, setBio] = useState("");

  const exportData = async () => {
    try {
      const data = await api.get("/auth/me");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "bazaarhub-data.json"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.email}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-3 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full capitalize">{user.role}</span>
                {user.sellerTier && (
                  <span className="flex items-center gap-1 px-3 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                    <BadgeCheck className="w-3 h-3" /> {user.sellerTier}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Tell us about yourself..." />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/mfa/enrol" className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div><p className="font-semibold text-gray-900">MFA Settings</p><p className="text-sm text-gray-500">{user.mfaEnabled ? "Enabled" : "Not configured"}</p></div>
          </Link>
          <Link href="/password/change" className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Key className="w-5 h-5 text-indigo-600" />
            </div>
            <div><p className="font-semibold text-gray-900">Change Password</p><p className="text-sm text-gray-500">Update your password</p></div>
          </Link>
          <button onClick={exportData} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group text-left">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Download className="w-5 h-5 text-indigo-600" />
            </div>
            <div><p className="font-semibold text-gray-900">Export Data</p><p className="text-sm text-gray-500">Download your information</p></div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
