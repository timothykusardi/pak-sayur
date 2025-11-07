'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/* =============================== Types/Enums =============================== */

type AreaId = 'all' | 'barat' | 'timur';
type DayId =
  | 'senin'
  | 'selasa'
  | 'rabu'
  | 'kamis'
  | 'jumat'
  | 'sabtu'
  | 'minggu';

type Slot = { label: string; time: string; group?: string };

type Estate = {
  id: string;
  name: string;
  area: Exclude<AreaId, 'all'>; // 'barat' | 'timur'
  // optional: per-blok WA groups if needed later
  groups?: Partial<Record<'A-B' | 'C-D' | 'E-H', string>>;
};

/* ================================== Data ================================== */

// WEEKDAY slots only (Mon–Fri). Sat & Sun are OFF (by request).
const WEEKDAY_SLOTS: Slot[] = [
  { label: 'Blok A–B', time: '06:30 – 07:30' },
  { label: 'Blok C–D', time: '07:30 – 08:30' },
  { label: 'Blok E–H', time: '08:30 – 09:30' },
];

const DAY_LABEL: Record<DayId, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
};

const TODAY = (() => {
  // 0 = Sunday
  const map: DayId[] = [
    'minggu',
    'senin',
    'selasa',
    'rabu',
    'kamis',
    'jumat',
    'sabtu',
  ];
  return map[new Date().getDay()];
})();

// Estates (subset; extend as needed)
const ESTATES: Estate[] = [
  // BARAT
  { id: 'graha-family', name: 'Graha Family', area: 'barat' },
  { id: 'royal-residence', name: 'Royal Residence', area: 'barat' },
  { id: 'dian-istana', name: 'Dian Istana', area: 'barat' },
  { id: 'wisata-bukit-mas', name: 'Wisata Bukit Mas', area: 'barat' },
  { id: 'villa-bukit-mas', name: 'Villa Bukit Mas', area: 'barat' },
  { id: 'graha-natura', name: 'Graha Natura', area: 'barat' },
  { id: 'villa-bukit-regency', name: 'Villa Bukit Regency', area: 'barat' },

  // TIMUR
  { id: 'pakuwon-city', name: 'Pakuwon City', area: 'timur' },
  { id: 'kertajaya-indah', name: 'Kertajaya Indah Regency', area: 'timur' },
  { id: 'galaxy-bumi-permai', name: 'Galaxy Bumi Permai', area: 'timur' },
  { id: 'puri-galaxy', name: 'Puri Galaxy', area: 'timur' },
  { id: 'mulyosari', name: 'Mulyosari Area', area: 'timur' },
];

// Helper: which slots per day? (Sabtu & Minggu OFF)
function getSlotsForDay(day: DayId): Slot[] {
  if (day === 'sabtu' || day === 'minggu') return [];
  return WEEKDAY_SLOTS;
}

/* ================================ Components =============================== */

function ScheduleCard({
  estate,
  day,
}: {
  estate: Estate;
  day: DayId;
}) {
  const slots = getSlotsForDay(day);
  const hasService = slots.length > 0;

  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-serif text-xl">{estate.name}</div>
        <span className="rounded-full border border-gold/20 px-3 py-1 text-xs text-goldmuted">
          {estate.area === 'barat' ? 'Surabaya Barat' : 'Surabaya Timur'}
        </span>
      </div>

      {!hasService ? (
        <div className="mt-3 rounded-xl border border-gold/15 bg-deep2 p-4 text-goldmuted">
          {DAY_LABEL[day]}: tidak ada kunjungan reguler.{' '}
          <span className="text-gold">By request</span> (hubungi admin).
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {slots.map((s) => (
            <div
              key={`${estate.id}-${s.label}`}
              className="rounded-xl border border-gold/15 bg-deep2 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-gold">{s.label}</div>
                <div className="rounded-full border border-gold/20 px-3 py-1 text-xs">
                  {s.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================== Page ================================== */

export default function JadwalPage() {
  const [day, setDay] = useState<DayId>(TODAY);
  const [area, setArea] = useState<AreaId>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();

    return ESTATES.filter((e) => {
      const byArea = area === 'all' ? true : e.area === area;
      const byText = !key || e.name.toLowerCase().includes(key);
      return byArea && byText;
    });
  }, [area, q]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      {/* HERO */}
      <section className="relative card-soft overflow-hidden p-10 md:p-12">
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <Image
            src="/images/hero/leaf.jpg"
            alt=""
            fill
            priority
            sizes="(min-width:1024px) 1200px, 100vw"
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_60%_20%,rgba(81,133,102,.55)_0%,rgba(0,0,0,0)_60%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-deep/70 to-transparent" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-5xl leading-tight md:text-6xl">
            Jadwal Kunjungan
          </h1>
          <p className="mt-3 text-lg text-goldmuted">
            Gelombang pagi <span className="text-gold">06:30–10:00</span>{' '}
            (<span className="text-gold">Senin–Jumat</span>).{' '}
            <span className="text-gold">Sabtu & Minggu OFF</span>{' '}
            / by request. Toleransi <span className="text-gold">±15 menit</span>{' '}
            untuk cuaca & akses cluster.
          </p>
          <p className="mt-1 text-sm text-goldmuted">
            Tidak sempat pre-order? Tenang—armada keliling tetap tersedia di
            area tertentu.
          </p>
        </div>
      </section>

      {/* STICKY FILTER BAR */}
      <div className="sticky top-16 z-30 mt-6 rounded-2xl border border-gold/10 bg-deep/80 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          {/* Hari chips */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                'senin',
                'selasa',
                'rabu',
                'kamis',
                'jumat',
                'sabtu',
                'minggu',
              ] as DayId[]
            ).map((d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`rounded-xl border px-3 py-1 text-sm transition ${
                  day === d
                    ? 'border-gold/40 bg-gold/10'
                    : 'border-gold/15 hover:border-gold/25'
                }`}
              >
                {DAY_LABEL[d]}
              </button>
            ))}
          </div>

          {/* Area chips */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'barat', label: 'Barat' },
                { id: 'timur', label: 'Timur' },
              ] as { id: AreaId; label: string }[]
            ).map((a) => (
              <button
                key={a.id}
                onClick={() => setArea(a.id)}
                className={`rounded-xl border px-3 py-1 text-sm transition ${
                  area === a.id
                    ? 'border-gold/40 bg-gold/10'
                    : 'border-gold/15 hover:border-gold/25'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[240px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari perumahan… (contoh: Graha, Royal, Pakuwon)"
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <ScheduleCard key={e.id} estate={e} day={day} />
        ))}
      </div>

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <div className="mt-16 rounded-2xl border border-gold/10 bg-deep2 p-8 text-center text-goldmuted">
          Belum ada hasil untuk pencarian / filter Anda.
        </div>
      )}

      {/* FOOTER NAV */}
      <div className="mt-12 flex justify-center gap-3">
        <Link href="/" className="btn">
          Kembali ke Home
        </Link>
      </div>

      {/* INFO */}
      <div className="mt-8 space-y-2 text-center text-sm text-goldmuted">
        <p>
          Untuk update menit-terakhir, gabung{' '}
          <Link href="/club" className="text-gold underline">
            Pak Sayur Privé Club
          </Link>{' '}
          sesuai perumahan Anda.
        </p>
        <p>
          Armada keliling non-pre-order hadir di titik tertentu. Cek grup
          WhatsApp cluster untuk lokasinya.
        </p>
      </div>
    </main>
  );
}
