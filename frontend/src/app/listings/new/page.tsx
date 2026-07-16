"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Category } from "@/types";
import toast from "react-hot-toast";

export default function NewListingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const priceMinorUnits = Math.round(parseFloat(price) * 100);
      const data = await api.post<{ id: string }>("/listings", {
        title, description, priceMinorUnits, category, quantity: parseInt(quantity),
      });
      if (images.length > 0) {
        const form = new FormData();
        for (const img of images) form.append("images", img);
        await api.upload(`/listings/${data.id}/images`, form);
      }
      toast.success("Listing created!");
      router.push(`/listings/${data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Listing</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 shadow-sm">
          <div>
            <label htmlFor="l-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input id="l-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
          </div>
          <div>
            <label htmlFor="l-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="l-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="l-price" className="block text-sm font-medium text-gray-700 mb-1">Price (NPR)</label>
              <input id="l-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div>
              <label htmlFor="l-qty" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input id="l-qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div>
              <label htmlFor="l-cat" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select id="l-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white" required>
                <option value="">Select...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="l-images" className="block text-sm font-medium text-gray-700 mb-1">Images (up to 6)</label>
            <input id="l-images" type="file" multiple accept="image/*" onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 6))} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
            {submitting ? "Creating..." : "Create Listing"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
