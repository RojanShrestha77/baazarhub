"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ShoppingCart, User, Package, Heart, MessageSquare, ChevronDown, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">BazaarHub</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/marketplace" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
              Marketplace
            </Link>
            <Link href="/cart" className="relative text-gray-600 hover:text-indigo-600 transition-colors">
              <ShoppingCart className="w-5 h-5" />
            </Link>
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">
                  <User className="w-5 h-5" />
                  <span className="hidden lg:inline">{user.email.split("@")[0]}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50" onMouseLeave={() => setDropdownOpen(false)}>
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <Link href="/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      <Package className="w-4 h-4" /> Orders
                    </Link>
                    <Link href="/wishlist" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      <Heart className="w-4 h-4" /> Wishlist
                    </Link>
                    <Link href="/messages" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      <MessageSquare className="w-4 h-4" /> Messages
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    {(user.role === "seller" || user.role === "admin") && (
                      <Link href="/seller" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <Package className="w-4 h-4" /> Seller Dashboard
                      </Link>
                    )}
                    {user.role === "admin" && (
                      <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <Shield className="w-4 h-4" /> Admin Panel
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                  Login
                </Link>
                <Link href="/register" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden p-2 text-gray-600" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <Link href="/marketplace" className="block text-sm font-medium text-gray-700 py-2">Marketplace</Link>
          <Link href="/cart" className="block text-sm font-medium text-gray-700 py-2">Cart</Link>
          {user ? (
            <>
              <Link href="/profile" className="block text-sm font-medium text-gray-700 py-2">Profile</Link>
              <Link href="/orders" className="block text-sm font-medium text-gray-700 py-2">Orders</Link>
              {(user.role === "seller" || user.role === "admin") && (
                <Link href="/seller" className="block text-sm font-medium text-gray-700 py-2">Seller Dashboard</Link>
              )}
              {user.role === "admin" && (
                <Link href="/admin" className="block text-sm font-medium text-gray-700 py-2">Admin Panel</Link>
              )}
              <button onClick={logout} className="block text-sm font-medium text-red-600 py-2 w-full text-left">Logout</button>
            </>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="flex-1 text-center text-sm font-medium text-gray-700 border border-gray-300 rounded-lg py-2">Login</Link>
              <Link href="/register" className="flex-1 text-center text-sm font-medium bg-indigo-600 text-white rounded-lg py-2">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
