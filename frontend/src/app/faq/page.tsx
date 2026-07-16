export default function FaqPage() {
  const faqs = [
    { q: "How does escrow protection work?", a: "When you purchase an item, payment is held securely by BazaarHub. The seller ships the item, and once you confirm delivery, the payment is released to the seller." },
    { q: "What seller tiers are available?", a: "Sellers can be Basic, Verified, or Premium. Higher tiers require stricter verification and offer greater buyer trust signals." },
    { q: "How do I become a verified seller?", a: "Submit government ID, business license, or tax records through your Seller Dashboard. An administrator reviews and approves your request." },
  ];
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">FAQ</h1>
      <div className="space-y-6">
        {faqs.map((faq) => (
          <div key={faq.q} className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
