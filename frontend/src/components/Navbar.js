"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { ShoppingCart, User, LogOut, Menu, X, Store } from "lucide-react";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl text-indigo-600">BazaarHub</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/marketplace" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Marketplace</Link>
            {!loading && user ? (
              <>
                <Link href="/cart" className="text-gray-600 hover:text-gray-900"><ShoppingCart className="w-5 h-5" /></Link>
                <div className="relative group">
                  <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"><User className="w-5 h-5" /></button>
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50">Profile</Link>
                    <Link href="/orders" className="block px-4 py-2 text-sm hover:bg-gray-50">Orders</Link>
                    <Link href="/wishlist" className="block px-4 py-2 text-sm hover:bg-gray-50">Wishlist</Link>
                    <Link href="/messages" className="block px-4 py-2 text-sm hover:bg-gray-50">Messages</Link>
                    {(user.role === "seller" || user.role === "admin") && (
                      <Link href="/seller" className="block px-4 py-2 text-sm hover:bg-gray-50"><Store className="w-4 h-4 inline mr-1" />Seller Dashboard</Link>
                    )}
                    {user.role === "admin" && (
                      <Link href="/admin" className="block px-4 py-2 text-sm hover:bg-gray-50">Admin Panel</Link>
                    )}
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"><LogOut className="w-4 h-4" />Logout</button>
                  </div>
                </div>
              </>
            ) : !loading ? (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign In</Link>
                <Link href="/register" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">Join Free</Link>
              </div>
            ) : null}
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t pt-2">
            <Link href="/marketplace" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>Marketplace</Link>
            {!user ? (
              <>
                <Link href="/login" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link href="/register" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            ) : (
              <>
                <Link href="/orders" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>Orders</Link>
                <Link href="/cart" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>Cart</Link>
                <Link href="/profile" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>Profile</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
