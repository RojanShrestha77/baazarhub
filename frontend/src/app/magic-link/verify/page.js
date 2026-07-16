"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Suspense } from "react";
import toast from "react-hot-toast";

function VerifyMagicLink() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fetchUser } = useAuth();
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) { setStatus("invalid"); return; }
    api.post("/auth/magic-link/verify", { token })
      .then(async () => {
        await fetchUser();
        toast.success("Signed in!");
        router.push("/");
      })
      .catch(() => { setStatus("invalid"); });
  }, [searchParams, router, fetchUser]);

  if (status === "invalid") return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold mb-4">Invalid or Expired Link</h1><p className="text-gray-500">This link has expired or already been used.</p></div></div>;
  return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold mb-4">Verifying...</h1><p className="text-gray-500">Signing you in...</p></div></div>;
}

export default function MagicLinkVerifyPage() {
  return <Suspense><VerifyMagicLink /></Suspense>;
}
