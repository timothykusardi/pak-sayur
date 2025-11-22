// src/app/admin/ZoneSearchControl.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, KeyboardEvent } from 'react';

type PayFilter = 'ALL' | 'COD' | 'TRANSFER';

export default function ZoneSearchControl({
  selectedDate,
  payFilter,
  initialZone,
}: {
  selectedDate: string;
  payFilter: PayFilter;
  initialZone: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialZone);

  const submit = () => {
    const params = new URLSearchParams();

    if (selectedDate) params.set('date', selectedDate);
    if (payFilter !== 'ALL') params.set('pay', payFilter);

    const trimmed = value.trim();
    if (trimmed) {
      params.set('zone', trimmed);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  const clear = () => {
    setValue('');
    const params = new URLSearchParams();

    if (selectedDate) params.set('date', selectedDate);
    if (payFilter !== 'ALL') params.set('pay', payFilter);

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-emerald-300/80">Search Zone:</span>
      <div className="flex items-center rounded-full border border-emerald-700 bg-[#04150c] px-2 py-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Margorejo, Graha, Pakuwon..."
          className="w-44 bg-transparent text-[11px] text-emerald-100 placeholder:text-emerald-500 focus:outline-none"
        />
        {value.trim() && (
          <button
            type="button"
            onClick={clear}
            className="ml-1 text-[11px] text-emerald-300 hover:text-emerald-100"
          >
            ×
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] text-emerald-50 hover:bg-emerald-500"
        >
          Go
        </button>
      </div>
    </div>
  );
}
