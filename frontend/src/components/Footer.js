import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white font-bold text-lg mb-3">BazaarHub</h3>
            <p className="text-sm max-w-md">A secure marketplace platform with escrow payments, seller verification, and multi-factor authentication.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <div className="space-y-2 text-sm">
              <Link href="/marketplace" className="block hover:text-white">Marketplace</Link>
              <Link href="/about" className="block hover:text-white">About</Link>
              <Link href="/contact" className="block hover:text-white">Contact</Link>
              <Link href="/faq" className="block hover:text-white">FAQ</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Support</h4>
            <div className="space-y-2 text-sm">
              <Link href="/help" className="block hover:text-white">Help Center</Link>
              <Link href="/returns-policy" className="block hover:text-white">Returns</Link>
              <Link href="/privacy-policy" className="block hover:text-white">Privacy</Link>
              <Link href="/terms-conditions" className="block hover:text-white">Terms</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">&copy; {new Date().getFullYear()} BazaarHub. All rights reserved.</div>
      </div>
    </footer>
  );
}
