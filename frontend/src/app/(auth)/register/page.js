"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    if (password !== confirmPassword) { toast.error("Passwords don't match"); setLoading(false); return; }
    if (password.length < 12) { toast.error("Password must be at least 12 characters"); setLoading(false); return; }
    try {
      await register(email, password);
      toast.success("Account created! Check your email.");
      router.push("/login");
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Join BazaarHub today</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-4 py-2" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 12 chars)" className="w-full border rounded-lg px-4 py-2" required minLength={12} />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full border rounded-lg px-4 py-2" required />
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? "Creating..." : "Create Account"}</button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-500">Already have an account? <Link href="/login" className="text-indigo-600 hover:underline">Sign In</Link></p>
      </div>
    </div>
  );
}
