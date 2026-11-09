import type { CancellationPreview } from '../../types';
import { AlertCircle, DollarSign, Ticket, TrendingDown } from 'lucide-react';

interface Props {
  preview: CancellationPreview | null;
  isLoading: boolean;
  error: string | null;
}

const TIER_COLOURS: Record<string, string> = {
  'Full refund':    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'Partial refund': 'bg-yellow-500/20  text-yellow-300  border-yellow-500/40',
  'No refund':      'bg-orange-500/20  text-orange-300  border-orange-500/40',
  'Non-refundable': 'bg-red-500/20     text-red-300     border-red-500/40',
};

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

/** Segmented bar that shows the refund / fee / credit split visually. */
const BreakdownBar = ({ preview }: { preview: CancellationPreview }) => {
  const { price_paid, refund_amount, fee_amount, credit_amount } = preview;
  if (price_paid === 0) return null;
  const refundPct  = (refund_amount  / price_paid) * 100;
  const feePct     = (fee_amount     / price_paid) * 100;
  const creditPct  = (credit_amount  / price_paid) * 100;

  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex gap-0.5 mt-1 mb-3">
      {refundPct  > 0 && <div style={{ width: `${refundPct}%`  }} className="bg-emerald-400 rounded-l-full" />}
      {creditPct  > 0 && <div style={{ width: `${creditPct}%` }} className="bg-blue-400" />}
      {feePct     > 0 && <div style={{ width: `${feePct}%`    }} className="bg-red-400 rounded-r-full" />}
    </div>
  );
};

export const CancellationBreakdown = ({ preview, isLoading, error }: Props) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-star-white/10 bg-space-dark/60 p-4 animate-pulse">
        <div className="h-3 bg-star-white/10 rounded w-2/3 mb-2" />
        <div className="h-2 bg-star-white/10 rounded w-full mb-1" />
        <div className="h-2 bg-star-white/10 rounded w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>{error} — you can still cancel.</span>
      </div>
    );
  }

  if (!preview) return null;

  const tierColour = TIER_COLOURS[preview.tier_label] ?? TIER_COLOURS['Non-refundable'];

  return (
    <div className="rounded-xl border border-star-white/10 bg-space-dark/60 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-star-white/50">
          Estimated refund
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tierColour}`}>
          {preview.tier_label}
        </span>
      </div>

      {/* Segmented bar */}
      <BreakdownBar preview={preview} />

      {/* Row: refund */}
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-star-white/70">
          <DollarSign size={14} className="text-emerald-400" />
          Refund to payment method
        </span>
        <span className="font-semibold text-emerald-300">{fmt(preview.refund_amount)}</span>
      </div>

      {/* Row: credit (only when non-zero) */}
      {preview.credit_amount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-star-white/70">
            <Ticket size={14} className="text-blue-400" />
            Travel credit issued
          </span>
          <span className="font-semibold text-blue-300">{fmt(preview.credit_amount)}</span>
        </div>
      )}

      {/* Row: fee */}
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-star-white/70">
          <TrendingDown size={14} className="text-red-400" />
          Cancellation fee
        </span>
        <span className="font-semibold text-red-300">{fmt(preview.fee_amount)}</span>
      </div>

      {/* Divider + total */}
      <div className="flex items-center justify-between text-sm pt-2 border-t border-star-white/10">
        <span className="text-star-white/50">You'll receive back</span>
        <span className="font-bold text-star-white">{fmt(preview.refund_amount)}</span>
      </div>

      <p className="text-[11px] text-star-white/30 leading-tight">
        Estimated only. Actual amounts processed in a future payment phase.
      </p>
    </div>
  );
};

// Made with Bob
