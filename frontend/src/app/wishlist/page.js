"use client";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function WishlistPage() {
  const { user } = useAuth();
  if (!user) return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Sign in to view your wishlist</div>;
  return <div className="max-w-7xl mx-auto px-4 py-8"><h1 className="text-2xl font-bold mb-6">Wishlist</h1><p className="text-gray-500">Coming soon</p></div>;
}
