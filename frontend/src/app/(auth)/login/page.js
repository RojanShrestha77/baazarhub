"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login, verifyMfa, mfaRequired } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await login(email, password);
      if (!mfaRequired) { toast.success("Welcome back!"); router.push("/"); }
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleMfa = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await verifyMfa(mfaCode);
      toast.success("Verified!"); router.push("/");
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (mfaRequired) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-6">Two-Factor Auth</h1>
          <form onSubmit={handleMfa} className="space-y-4">
            <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="000000" className="w-full border rounded-lg px-4 py-2 text-center text-2xl tracking-widest" maxLength={6} required />
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? "Verifying..." : "Verify"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Sign In</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Welcome back to BazaarHub</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-4 py-2" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full border rounded-lg px-4 py-2" required />
          <div className="text-right"><Link href="/magic-link" className="text-sm text-indigo-600 hover:underline">Sign in without password</Link></div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? "Signing in..." : "Sign In"}</button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-500">Don't have an account? <Link href="/register" className="text-indigo-600 hover:underline">Register</Link></p>
        <p className="text-center mt-2"><Link href="/request-reset-password" className="text-sm text-indigo-600 hover:underline">Forgot password?</Link></p>
      </div>
    </div>
  );
}
