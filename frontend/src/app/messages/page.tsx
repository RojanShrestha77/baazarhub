"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function MessagesPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-12 h-12 text-indigo-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Messages</h2>
        <p className="text-gray-500 mb-8">Communicate with buyers and sellers directly. Messaging will be available soon.</p>
        <Link href="/marketplace" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          Browse Marketplace
        </Link>
      </motion.div>
    </div>
  );
}
