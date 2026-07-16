import Link from "next/link";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-lg font-bold text-white">BazaarHub</span>
            </div>
            <p className="text-sm text-gray-400">A secure marketplace with escrow payments and tiered seller verification.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm hover:text-indigo-400 transition-colors">About</Link></li>
              <li><Link href="/contact" className="text-sm hover:text-indigo-400 transition-colors">Contact</Link></li>
              <li><Link href="/faq" className="text-sm hover:text-indigo-400 transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link href="/help" className="text-sm hover:text-indigo-400 transition-colors">Help Center</Link></li>
              <li><Link href="/returns-policy" className="text-sm hover:text-indigo-400 transition-colors">Returns Policy</Link></li>
              <li><Link href="/privacy-policy" className="text-sm hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-conditions" className="text-sm hover:text-indigo-400 transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Security</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Escrow Protected</span>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} BazaarHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
