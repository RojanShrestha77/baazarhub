"use client";
import { useState, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Suspense } from "react";
import toast from "react-hot-toast";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post("/auth/password/reset/confirm", { token, newPassword: password });
      toast.success("Password reset! You can now log in.");
      router.push("/login");
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Choose New Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 12 chars)" className="w-full border rounded-lg px-4 py-2" required minLength={12} />
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? "Resetting..." : "Reset Password"}</button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
