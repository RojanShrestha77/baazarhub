"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [applyAsSeller, setApplyAsSeller] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    try {
      await register(email, password, applyAsSeller);
      router.push("/login?registered=1");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-gray-500 mb-6">Join BazaarHub today</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Min. 8 characters" required minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input id="reg-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Re-enter password" required autoComplete="new-password" />
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={applyAsSeller} onChange={(e) => setApplyAsSeller(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-600" />
              <span className="text-sm">
                <span className="font-medium text-gray-900">Register as a seller</span>
                <span className="block text-xs text-gray-500 mt-0.5">Request a seller account. You&apos;ll join as a buyer and an admin will review your application before you can list products.</span>
              </span>
            </label>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-400">Already have an account? <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign in</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
