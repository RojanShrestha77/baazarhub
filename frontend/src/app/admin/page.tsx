"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ShoppingBag, FileText, BadgeCheck, Activity } from "lucide-react";

export default function AdminDashboard() {
  const cards = [
    { icon: Users, label: "User Management", href: "/admin/users", desc: "Manage users, roles, and tiers", color: "bg-blue-50 text-blue-600" },
    { icon: ShoppingBag, label: "Orders", href: "/admin/orders", desc: "View all platform orders", color: "bg-green-50 text-green-600" },
    { icon: FileText, label: "Audit Logs", href: "/admin/logs", desc: "Security and activity logs", color: "bg-purple-50 text-purple-600" },
    { icon: BadgeCheck, label: "Verification", href: "/admin/verification", desc: "Review seller documents", color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Activity className="w-8 h-8 text-indigo-600" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={card.href} className="block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{card.label}</h2>
                  <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
