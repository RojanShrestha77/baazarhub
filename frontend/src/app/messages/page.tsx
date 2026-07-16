"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";

export default function MessagesPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <MessageSquare className="w-16 h-16 text-gray-300" />
      <p className="text-gray-500 text-lg">Messaging coming soon</p>
      <Link href="/marketplace" className="text-indigo-600 font-medium hover:text-indigo-700">Browse marketplace</Link>
    </div>
  );
}
