export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
      <div className="prose prose-gray max-w-none">
        <p>BazaarHub collects only the data necessary to operate the marketplace: email, profile details, and transaction records. We do not sell your data.</p>
        <p>Session data is stored server-side. Payment processing is handled by Stripe — BazaarHub never stores full payment details.</p>
      </div>
    </div>
  );
}
