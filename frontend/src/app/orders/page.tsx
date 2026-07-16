"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { api } from "@/lib/api";
import type { Order } from "@/types";

const statusColor: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  payment_received: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
  released: "bg-gray-100 text-gray-800",
  refunded: "bg-orange-100 text-orange-800",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.get("/escrow/orders").then((data) => setOrders(data as Order[])).catch(() => {});
  }, []);

  if (orders.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Package className="w-16 h-16 text-gray-300" />
      <p className="text-gray-500 text-lg">No orders yet</p>
      <Link href="/marketplace" className="text-indigo-600 font-medium hover:text-indigo-700">Start shopping</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order, i) => (
          <motion.div key={order._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={`/orders/${order._id}`} className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{order.listing.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColor[order.status] || "bg-gray-100 text-gray-800"}`}>{order.status.replace("_", " ")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">${order.total.toFixed(2)}</span>
                <span className="text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
