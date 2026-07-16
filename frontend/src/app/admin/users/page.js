"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") return;
  }, [user, loading]);

  if (!user || user.role !== "admin") return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Access denied.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left p-4">Email</th><th className="text-left p-4">Role</th><th className="text-left p-4">Tier</th><th className="text-left p-4">MFA</th><th className="text-left p-4">Actions</th></tr></thead>
          <tbody>{/* User rows rendered from API data would go here */}</tbody>
        </table>
      </div>
    </div>
  );
}
