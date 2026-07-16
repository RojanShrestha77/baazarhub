"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function AdminOrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (loading || !user || user.role !== "admin") return;
    api.get("/escrow/orders").then(setOrders).catch(() => {}).finally(() => setLoadingOrders(false));
  }, [user, loading]);

  if (!user || user.role !== "admin") return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Access denied.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">All Orders</h1>
      {loadingOrders ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order._id} href={`/orders/${order._id}`} className="block bg-white border rounded-lg p-4 hover:shadow-md">
              <div className="flex justify-between items-center"><span className="font-semibold">Order #{order._id?.slice(-8)}</span><span className="text-sm capitalize">{order.status?.replace(/_/g, " ")}</span></div>
              <p className="text-sm text-gray-500 mt-1">£{(order.total || order.amount || 0).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
