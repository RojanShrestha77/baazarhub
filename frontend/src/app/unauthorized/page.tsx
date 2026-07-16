import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <ShieldAlert className="w-16 h-16 text-red-400" />
      <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="text-gray-500">You do not have permission to view this page.</p>
      <Link href="/" className="text-indigo-600 font-medium hover:text-indigo-700">Go home</Link>
    </div>
  );
}
