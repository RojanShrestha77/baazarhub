"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.get("/escrow/orders").then((data) => setOrders(data as Order[])).catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">All Orders</h1>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-gray-600"><th className="text-left p-4 font-medium">Item</th><th className="text-left p-4 font-medium">Buyer</th><th className="text-left p-4 font-medium">Amount</th><th className="text-left p-4 font-medium">Status</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4"><Link href={`/orders/${o._id}`} className="text-indigo-600 hover:text-indigo-700 font-medium">{o.listing.title}</Link></td>
                <td className="p-4 text-gray-600">{o.buyer.email}</td>
                <td className="p-4 font-medium">${o.total.toFixed(2)}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColor[o.status] || "bg-gray-100 text-gray-800"}`}>{o.status.replace("_", " ")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
