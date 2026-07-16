"use client";

import { Users } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">User Management</h1>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-gray-600"><th className="text-left p-4 font-medium">Email</th><th className="text-left p-4 font-medium">Role</th><th className="text-left p-4 font-medium">Tier</th><th className="text-left p-4 font-medium">MFA</th><th className="text-left p-4 font-medium">Actions</th></tr></thead>
          <tbody>
            <tr><td colSpan={5} className="p-8 text-center text-gray-400"><Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />User list placeholder</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
