"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Heart className="w-16 h-16 text-gray-300" />
      <p className="text-gray-500 text-lg">Wishlist coming soon</p>
      <Link href="/marketplace" className="text-indigo-600 font-medium hover:text-indigo-700">Browse marketplace</Link>
    </div>
  );
}
