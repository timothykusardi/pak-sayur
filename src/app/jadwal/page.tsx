'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/* =============================== Types/Enums =============================== */

type AreaId = 'all' | 'barat' | 'tengah' | 'selatan' | 'timur';
type DayId =
  | 'senin'
  | 'selasa'
  | 'rabu'
  | 'kamis'
  | 'jumat'
  | 'sabtu'
  | 'minggu';

type Estate = {
  id: string;
  name: string;
  area: Exclude<AreaId, 'all'>; // 'barat' | 'tengah' | 'selatan' | 'timur'
};

type DaySchedule = {
  hasService: boolean;
  time?: string;
};

/* ================================== Data ================================== */

// Simple time window (same for all perumahan, no blok-level schedule)
const DAY_SCHEDULE: Record<DayId, DaySchedule> = {
  senin: { hasService: true, time: '06:30 – 10:00' },
  selasa: { hasService: true, time: '06:30 – 10:00' },
  rabu: { hasService: true, time: '06:30 – 10:00' },
  kamis: { hasService: true, time: '06:30 – 10:00' },
  jumat: { hasService: true, time: '06:30 – 10:00' },
  sabtu: { hasService: false },
  minggu: { hasService: false },
};

const DAY_LABEL: Record<DayId, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
};

const AREA_BADGE_LABEL: Record<Exclude<AreaId, 'all'>, string> = {
  barat: 'Surabaya Barat',
  tengah: 'Surabaya Tengah',
  selatan: 'Surabaya Selatan',
  timur: 'Surabaya Timur',
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

// Estates – synced with latest Privé Club list
const ESTATES: Estate[] = [
  // BARAT
  { id: 'graha-famili', name: 'Graha Famili', area: 'barat' },
  { id: 'royal-residence', name: 'Royal Residence', area: 'barat' },
  { id: 'dian-istana', name: 'Dian Istana', area: 'barat' },
  { id: 'wisata-bukit-mas', name: 'Wisata Bukit Mas', area: 'barat' },
  { id: 'villa-bukit-mas', name: 'Villa Bukit Mas', area: 'barat' },
  { id: 'graha-natura', name: 'Graha Natura', area: 'barat' },
  { id: 'villa-bukit-regency', name: 'Villa Bukit Regency', area: 'barat' },
  { id: 'grand-pakuwon', name: 'Grand Pakuwon', area: 'barat' },
  { id: 'darmo-harapan-indah', name: 'Darmo Harapan Indah', area: 'barat' },
  { id: 'pradah-indah', name: 'Pradah Indah', area: 'barat' },

  // TENGAH
  { id: 'darmo-area', name: 'Darmo Area', area: 'tengah' },
  { id: 'gubeng-area', name: 'Gubeng Area', area: 'tengah' },

  // SELATAN
  { id: 'margorejo-area', name: 'Margorejo Area', area: 'selatan' },
  { id: 'jemursari-area', name: 'Jemursari Area', area: 'selatan' },
  { id: 'ketintang-area', name: 'Ketintang Area', area: 'selatan' },

  // TIMUR
  { id: 'pakuwon-city', name: 'Pakuwon City', area: 'timur' },
  { id: 'kertajaya-indah', name: 'Kertajaya Indah Regency', area: 'timur' },
  { id: 'dharmahusada-indah', name: 'Dharmahusada Indah', area: 'timur' },
  { id: 'galaxy-bumi-permai', name: 'Galaxy Bumi Permai', area: 'timur' },
  { id: 'puri-galaxy', name: 'Puri Galaxy', area: 'timur' },
  { id: 'manyar-residence', name: 'Manyar Residence', area: 'timur' },
  { id: 'mulyosari', name: 'Mulyosari Area', area: 'timur' },
  { id: 'sutorejo-prima', name: 'Sutorejo Prima', area: 'timur' },
  { id: 'east-coast-residence', name: 'East Coast Residence', area: 'timur' },
  { id: 'laguna-residence', name: 'Laguna Residence', area: 'timur' },
];

/* ================================ Components =============================== */

function ScheduleCard({
  estate,
  day,
}: {
  estate: Estate;
  day: DayId;
}) {
  const schedule = DAY_SCHEDULE[day];
  const hasService = schedule.hasService;

  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-serif text-xl">{estate.name}</div>
        <span className="rounded-full border border-gold/20 px-3 py-1 text-xs text-goldmuted">
          {AREA_BADGE_LABEL[estate.area]}
        </span>
      </div>

      {!hasService ? (
        <div className="mt-3 rounded-xl border border-gold/15 bg-deep2 p-4 text-goldmuted">
          {DAY_LABEL[day]}: tidak ada kunjungan reguler.{' '}
          <span className="text-gold">By request</span> (hubungi admin).
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-gold/15 bg-deep2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-goldmuted">
                {DAY_LABEL[day]} – Gelombang Pagi
              </div>
              <div className="mt-1 text-sm text-goldmuted">
                Armada reguler keliling seluruh blok / cluster perumahan dalam
                rentang waktu ini. Toleransi{' '}
                <span className="text-gold">±15 menit</span> untuk cuaca &
                akses cluster.
              </div>
            </div>
            <div className="rounded-full border border-gold/20 px-4 py-1 text-sm font-medium text-gold">
              {schedule.time}
            </div>
          </div>
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
            <span className="text-gold">Sabtu & Minggu OFF</span> / by request.
            Toleransi <span className="text-gold">±15 menit</span> untuk cuaca
            & akses cluster.
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
                { id: 'all', label: 'Semua Surabaya' },
                { id: 'barat', label: 'Surabaya Barat' },
                { id: 'tengah', label: 'Surabaya Tengah' },
                { id: 'selatan', label: 'Surabaya Selatan' },
                { id: 'timur', label: 'Surabaya Timur' },
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
              placeholder="Cari perumahan/area… (contoh: Graha, Royal, Pakuwon)"
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
