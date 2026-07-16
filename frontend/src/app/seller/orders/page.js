"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SellerOrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (loading || !user) return;
    api.get("/escrow/orders").then(setOrders).catch(() => {});
  }, [user, loading]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Seller Orders</h1>
      {orders.length === 0 ? <p className="text-gray-500">No orders yet</p> : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order._id} href={`/orders/${order._id}`} className="block bg-white border rounded-lg p-4 hover:shadow-md">
              <div className="flex justify-between"><span className="font-semibold">Order #{order._id?.slice(-8)}</span><span className="text-sm capitalize">{order.status?.replace(/_/g, " ")}</span></div>
              <p className="text-sm text-gray-500">£{(order.total || order.amount || 0).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
