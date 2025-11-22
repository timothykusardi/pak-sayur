// src/app/admin/StatusCell.tsx
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

type DbStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'ON_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

const STATUS_OPTIONS: { value: DbStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
];

export default function StatusCell({
  orderId,
  initialStatus,
}: {
  orderId: number;
  initialStatus: DbStatus;
}) {
  const [status, setStatus] = useState<DbStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const currentLabel =
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  const updateStatus = (newStatus: DbStatus) => {
    setStatus(newStatus);
    setOpen(false);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/orders/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: newStatus }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Gagal update');
        }
      } catch {
        setError('Network error');
      }
    });
  };

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div ref={wrapperRef} className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full border border-emerald-500 bg-transparent px-3 py-1 text-xs text-emerald-50 hover:bg-emerald-500/10"
        >
          <span>{currentLabel}</span>
          <span className="text-[9px] leading-none">▾</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full z-20 mt-1 rounded-2xl border border-emerald-700 bg-[#04150c] px-2 py-1 shadow-lg">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateStatus(opt.value)}
                className={`block w-full rounded-xl px-3 py-1 text-left text-xs ${
                  status === opt.value
                    ? 'bg-emerald-500/30 text-emerald-50'
                    : 'text-emerald-100 hover:bg-emerald-500/15'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isPending && (
        <span className="text-[10px] text-emerald-300/70">Saving…</span>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
