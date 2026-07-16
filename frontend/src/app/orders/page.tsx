"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/types";
import { formatPrice } from "@/types";

const statusStyles: Record<string, string> = {
  created: "bg-yellow-100 text-yellow-800",
  payment_held: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
  released: "bg-gray-100 text-gray-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get<Order[]>("/escrow/orders").then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, [user, router]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" role="status"><span className="sr-only">Loading...</span></div></div>;

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
            <Link href={`/orders/${order._id}`} className="block bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{order.listingSnapshot?.title || "Order"}</p>
                  <p className="text-sm text-gray-500 mt-1">{new Date(order.createdAt).toLocaleDateString()} — {formatPrice(order.totalMinorUnits)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyles[order.status] || "bg-gray-100"}`}>{order.status.replace("_", " ")}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
