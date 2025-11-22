// src/app/admin/DatePickerControl.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function formatDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // YYYY-MM-DD in LOCAL time
}

function parseYMD(dateStr: string | null): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date();
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d); // local date
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type PayFilter = 'ALL' | 'COD' | 'TRANSFER';

export default function DatePickerControl({
  selectedDate,
  payFilter,
  zoneFilter,
}: {
  selectedDate: string; // YYYY-MM-DD
  payFilter: PayFilter;
  zoneFilter: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [viewDate, setViewDate] = useState<Date>(
    parseYMD(selectedDate),
  );

  const [monthInput, setMonthInput] = useState(
    String(viewDate.getMonth() + 1),
  );
  const [yearInput, setYearInput] = useState(
    String(viewDate.getFullYear()),
  );

  useEffect(() => {
    const d = parseYMD(selectedDate);
    setViewDate(d);
  }, [selectedDate]);

  useEffect(() => {
    setMonthInput(String(viewDate.getMonth() + 1));
    setYearInput(String(viewDate.getFullYear()));
  }, [viewDate]);

  const selectedDateStr = selectedDate || '';

  const goMonth = (delta: number) => {
    setViewDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  };

  const buildUrl = (dateStr: string | null) => {
    const params = new URLSearchParams();
    if (dateStr) params.set('date', dateStr);
    if (payFilter !== 'ALL') params.set('pay', payFilter);
    if (zoneFilter) params.set('zone', zoneFilter);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const navigateWithDate = (dateStr: string | null) => {
    router.push(buildUrl(dateStr));
    setOpen(false);
  };

  const handleSelectDate = (d: Date) => {
    navigateWithDate(formatDateLocal(d));
  };

  const handleToday = () => {
    const today = new Date();
    navigateWithDate(formatDateLocal(today));
  };

  const handleClear = () => {
    // clear only the date, keep pay + zone
    router.push(buildUrl(null));
    setOpen(false);
  };

  const applyMonthYear = () => {
    let m = parseInt(monthInput, 10);
    let y = parseInt(yearInput, 10);

    if (Number.isNaN(m)) m = viewDate.getMonth() + 1;
    if (Number.isNaN(y)) y = viewDate.getFullYear();

    m = Math.min(12, Math.max(1, m));
    if (y < 2000) y = 2000;
    if (y > 2100) y = 2100;

    setViewDate(new Date(y, m - 1, 1));
  };

  const handleMonthKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applyMonthYear();
  };

  const handleYearKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applyMonthYear();
  };

  // outside click to close
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);

  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    days.push({
      date: d,
      inMonth: d.getMonth() === month,
    });
  }

  const todayStr = formatDateLocal(new Date());

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-600 bg-emerald-900/40 text-xs text-emerald-100 hover:border-emerald-400"
        aria-label="Pilih tanggal"
      >
        📅
      </button>

      {open && (
        <div className="absolute left-1/2 z-30 mt-3 w-72 -translate-x-1/2 rounded-3xl border border-emerald-900 bg-[#04150c] p-4 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
          <div className="mb-3 flex items-center justify-between text-amber-100">
            <div>
              <div className="text-lg font-semibold">
                {MONTH_NAMES[month]} {year}
              </div>
              <div className="mt-1 flex gap-3 text-[11px] text-amber-200/80">
                <label className="flex items-center gap-1">
                  Mo
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={monthInput}
                    onChange={(e) => setMonthInput(e.target.value)}
                    onBlur={applyMonthYear}
                    onKeyDown={handleMonthKey}
                    className="w-10 rounded-full border border-emerald-700 bg-transparent px-2 py-0.5 text-[11px] text-amber-100 focus:border-emerald-400 focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-1">
                  Yr
                  <input
                    type="number"
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    onBlur={applyMonthYear}
                    onKeyDown={handleYearKey}
                    className="w-14 rounded-full border border-emerald-700 bg-transparent px-2 py-0.5 text-[11px] text-amber-100 focus:border-emerald-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <button
                type="button"
                onClick={() => goMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-700 bg-transparent hover:bg-emerald-500/10"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => goMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-700 bg-transparent hover:bg-emerald-500/10"
              >
                ↓
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-y-1 text-center text-xs text-amber-200/80">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {days.map(({ date, inMonth }, idx) => {
              const dStr = formatDateLocal(date);
              const isSelected = dStr === selectedDateStr;
              const isToday = dStr === todayStr;

              let textClass = inMonth
                ? 'text-amber-100'
                : 'text-amber-100/40';
              let bgClass = '';
              let borderClass = '';

              if (isSelected) {
                bgClass = 'bg-emerald-900/60';
                borderClass = 'border border-emerald-400';
              } else if (isToday) {
                borderClass = 'border border-emerald-700';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl ${textClass} ${bgClass} ${borderClass} hover:bg-emerald-500/20`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-amber-200">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full px-2 py-1 hover:bg-emerald-500/15"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="rounded-full px-2 py-1 hover:bg-emerald-500/15"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
