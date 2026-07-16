"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Users, ShoppingBag, FileText, Activity, EyeOff } from "lucide-react";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) return;
    api.get("/admin/logs/stats").then(setStats).catch(() => {});
  }, [user, loading]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Loading...</div>;
  if (!user || user.role !== "admin") return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Access denied. Admin only.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-4"><Users className="w-8 h-8 text-indigo-600 mb-2" /><p className="text-2xl font-bold">{stats?.totalUsers || 0}</p><p className="text-sm text-gray-500">Users</p></div>
        <div className="bg-white border rounded-lg p-4"><ShoppingBag className="w-8 h-8 text-green-600 mb-2" /><p className="text-2xl font-bold">{stats?.totalOrders || 0}</p><p className="text-sm text-gray-500">Orders</p></div>
        <div className="bg-white border rounded-lg p-4"><FileText className="w-8 h-8 text-blue-600 mb-2" /><p className="text-2xl font-bold">{stats?.totalLogs || 0}</p><p className="text-sm text-gray-500">Audit Logs</p></div>
        <div className="bg-white border rounded-lg p-4"><Activity className="w-8 h-8 text-purple-600 mb-2" /><p className="text-2xl font-bold">{stats?.activeSessions || 0}</p><p className="text-sm text-gray-500">Active Sessions</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/users" className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"><h2 className="font-semibold text-lg mb-2">User Management</h2><p className="text-sm text-gray-500">Manage roles, tiers, and user accounts</p></Link>
        <Link href="/admin/orders" className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"><h2 className="font-semibold text-lg mb-2">Orders</h2><p className="text-sm text-gray-500">View and manage all orders</p></Link>
        <Link href="/admin/logs" className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"><h2 className="font-semibold text-lg mb-2">Audit Logs</h2><p className="text-sm text-gray-500">View security and activity logs</p></Link>
        <Link href="/admin/verification" className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"><h2 className="font-semibold text-lg mb-2">Verification Requests</h2><p className="text-sm text-gray-500">Review seller document submissions</p></Link>
      </div>
    </div>
  );
}
