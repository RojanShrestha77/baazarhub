export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms & Conditions</h1>
      <div className="prose prose-gray max-w-none">
        <p>By using BazaarHub, you agree to these terms. Buyers and sellers must act in good faith. Disputes are resolved through our escrow mediation process.</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Seller Obligations</h2>
        <p>Sellers must accurately describe items, fulfill orders promptly, and maintain truthful verification documents.</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Buyer Obligations</h2>
        <p>Buyers must make timely payments and confirm delivery only after receiving items as described.</p>
      </div>
    </div>
  );
}
