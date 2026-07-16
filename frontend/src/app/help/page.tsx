import Link from "next/link";
import { FileText } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Help Center</h1>
      <div className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-6">
        <FileText className="w-6 h-6 text-indigo-600 mt-1" />
        <div>
          <p className="text-gray-600 mb-4">Visit our <Link href="/faq" className="text-indigo-600 hover:text-indigo-700 font-medium">FAQ</Link> for common questions, or <Link href="/contact" className="text-indigo-600 hover:text-indigo-700 font-medium">contact support</Link> for further assistance.</p>
        </div>
      </div>
    </div>
  );
}
