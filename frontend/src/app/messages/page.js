"use client";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function MessagesPage() {
  const { user } = useAuth();
  if (!user) return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">Sign in to view messages</div>;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <p className="text-gray-500">Messaging coming soon.</p>
    </div>
  );
}
