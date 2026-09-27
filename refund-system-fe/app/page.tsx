import { RefundRequestForm } from '@/components/RefundRequestForm';

const policyItems = [
  { n: '01', title: 'Damaged or Incorrect Items', body: 'Items that arrive damaged or differ from what was ordered qualify for a full refund, regardless of tier.', allow: true },
  { n: '02', title: 'Cancelled Orders', body: 'Orders cancelled before or after payment with no delivery qualify for automatic full refunds.', allow: true },
  { n: '03', title: 'Change of Mind', body: 'Standard customers may return non-final-sale items within 30 days. Premium & VIP get 45 days.', allow: true },
  { n: '04', title: 'Final Sale Items', body: 'Items explicitly marked as final sale are not eligible for refunds under any circumstance.', allow: false },
  { n: '05', title: 'Expired Return Windows', body: 'Requests submitted beyond the allowed window (30d standard / 45d premium–VIP) are automatically denied.', allow: false },
  { n: '06', title: 'High-Value Orders', body: 'Refund requests above $500 (Standard) or $750 (Premium / VIP) require human review before approval.', allow: null },
];

export default function CustomerPortalPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* ── Page header ── */}
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 pt-14 pb-10 border-b border-border">
        <p className="label-uppercase mb-3">Customer Portal</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <h1 className="display-heading">Request a Refund</h1>
          <p className="text-ink-2 text-sm max-w-xs leading-relaxed">
            Powered by AI. Evaluated against Companys' refund policy in real time.
          </p>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">

          {/* Form column */}
          <div className="lg:col-span-3">
            <RefundRequestForm />
          </div>

          {/* Policy sidebar */}
          <aside className="lg:col-span-2 space-y-0">
            <div className="border-t border-border">
              <div className="py-5 border-b border-border">
                <p className="label-uppercase mb-1">How it works</p>
                <ol className="mt-3 space-y-2.5">
                  {[
                    'Select your account and order.',
                    'Describe your issue in detail.',
                    'Our AI evaluates against COMPANY\'s policy.',
                    'Receive an instant decision.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-ink-2">
                      <span className="text-orange font-bold text-xs mt-0.5 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Policy rules */}
              {policyItems.map(item => (
                <div key={item.n} className="py-5 border-b border-border">
                  <div className="flex items-start gap-3">
                    <span className="text-orange font-bold text-xs mt-0.5 shrink-0">{item.n}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        {item.allow === true  && <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-widest">Eligible</span>}
                        {item.allow === false && <span className="text-[10px] text-red-600 font-semibold uppercase tracking-widest">Not Eligible</span>}
                        {item.allow === null  && <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-widest">Review</span>}
                      </div>
                      <p className="text-xs text-ink-2 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
