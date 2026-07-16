"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RequestResetPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post("/auth/password/reset/request", { email });
      setSent(true);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (sent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center"><h1 className="text-2xl font-bold mb-4">Check Your Email</h1><p className="text-gray-500">If that email has an account, a reset link has been sent.</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Reset Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-4 py-2" required />
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? "Sending..." : "Send Reset Link"}</button>
        </form>
        <p className="text-center mt-4"><Link href="/login" className="text-sm text-indigo-600 hover:underline">Back to login</Link></p>
      </div>
    </div>
  );
}
