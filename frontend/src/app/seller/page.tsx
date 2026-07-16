"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Package, ShoppingBag, BadgeCheck } from "lucide-react";

export default function SellerDashboard() {
  const cards = [
    { icon: Package, label: "My Products", href: "/seller/products", color: "bg-blue-50 text-blue-600" },
    { icon: ShoppingBag, label: "Orders", href: "/seller/orders", color: "bg-green-50 text-green-600" },
    { icon: BadgeCheck, label: "Verification", href: "/seller/verify", color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Seller Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={card.href} className="block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all group">
              <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h2 className="font-semibold text-gray-900">{card.label}</h2>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
