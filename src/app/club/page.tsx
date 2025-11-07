'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/* ============================= Types & Presets ============================= */

type AreaId = 'all' | 'barat' | 'timur';

type BlockGroup = {
  label: string;   // e.g. "Blok A–B"
  invite: string;  // WhatsApp invite URL
};

type EstateBase = {
  id: string;
  name: string;
  area: Exclude<AreaId, 'all'>; // only 'barat' | 'timur'
  blocks?: BlockGroup[];
};

// After normalization, every estate must have blocks
type Estate = {
  id: string;
  name: string;
  area: Exclude<AreaId, 'all'>;
  blocks: BlockGroup[];
};

const DEFAULT_BLOCKS: BlockGroup[] = [
  { label: 'Blok A–B', invite: '#' },
  { label: 'Blok C–D', invite: '#' },
  { label: 'Blok E–H', invite: '#' },
];

/* =========================== Surabaya – Estates =========================== */
/* Replace invite: '#' with your actual WhatsApp invite URLs.                */

const RAW_ESTATES: EstateBase[] = [
  /* --- SURABAYA BARAT --- */
  { id: 'graha-family',        name: 'Graha Family',        area: 'barat' },
  { id: 'royal-residence',     name: 'Royal Residence',     area: 'barat' },
  { id: 'dian-istana',         name: 'Dian Istana',         area: 'barat' },
  { id: 'wisata-bukit-mas',    name: 'Wisata Bukit Mas',    area: 'barat' },
  { id: 'villa-bukit-mas',     name: 'Villa Bukit Mas',     area: 'barat' },
  { id: 'graha-natura',        name: 'Graha Natura',        area: 'barat' },
  { id: 'villa-bukit-regency', name: 'Villa Bukit Regency', area: 'barat' },
  { id: 'darmo-harapan',       name: 'Darmo Harapan Indah', area: 'barat' },
  { id: 'pradah-indah',        name: 'Pradah Indah',        area: 'barat' },
  { id: 'grand-pakuwon',       name: 'Grand Pakuwon',       area: 'barat' },
  { id: 'citraland-bukit-palma', name: 'CitraLand – Bukit Palma', area: 'barat' },
  { id: 'citraland-bukit-golf',  name: 'CitraLand – Bukit Golf',  area: 'barat' },
  { id: 'taman-puspa-indah',   name: 'Taman Puspa Indah (CitraLand)', area: 'barat' },

  /* --- SURABAYA TIMUR --- */
  { id: 'pakuwon-city',        name: 'Pakuwon City',        area: 'timur' },
  { id: 'kertajaya-indah',     name: 'Kertajaya Indah Regency', area: 'timur' },
  { id: 'dharmahusada-indah',  name: 'Dharmahusada Indah',  area: 'timur' },
  { id: 'galaxy-bumi-permai',  name: 'Galaxy Bumi Permai',  area: 'timur' },
  { id: 'puri-galaxy',         name: 'Puri Galaxy',         area: 'timur' },
  { id: 'manyar-residence',    name: 'Manyar Residence',    area: 'timur' },
  { id: 'mulyosari',           name: 'Mulyosari Area',      area: 'timur' },
  { id: 'sutorejo-prima',      name: 'Sutorejo Prima',      area: 'timur' },
  { id: 'east-coast-res',      name: 'East Coast Residence',area: 'timur' },
  { id: 'laguna-residence',    name: 'Laguna Residence',    area: 'timur' },
];

// Normalize so every estate has blocks
const ESTATES: Estate[] = RAW_ESTATES.map((e) => ({
  ...e,
  blocks: e.blocks ?? DEFAULT_BLOCKS,
}));

/* ============================== UI Components ============================== */

// Inline WhatsApp SVG icon (gold theme-friendly)
function WaIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.11 17.15c-.27-.13-1.58-.78-1.83-.87-.25-.09-.43-.13-.62.13-.18.27-.71.87-.87 1.04-.16.18-.32.2-.59.07-.27-.13-1.12-.41-2.13-1.3-.79-.7-1.33-1.56-1.49-1.82-.16-.27-.02-.41.11-.54.11-.11.25-.27.38-.41.13-.13.18-.23.27-.41.09-.18.05-.34-.02-.48-.07-.13-.62-1.49-.84-2.05-.22-.53-.45-.45-.62-.46l-.53-.01c-.18 0-.46.07-.7.34-.23.27-.92.9-.92 2.2 0 1.3.94 2.55 1.07 2.73.13.18 1.85 2.82 4.49 3.95.63.27 1.12.43 1.5.55.63.2 1.21.17 1.66.11.51-.08 1.58-.64 1.8-1.27.22-.62.22-1.15.15-1.27-.07-.11-.25-.18-.52-.31z" />
      <path d="M26.88 5.12A13.84 13.84 0 0 0 16 1.14 13.86 13.86 0 0 0 2.12 15c0 2.44.66 4.82 1.92 6.9L2 29.88l8.18-2c2.02 1.11 4.3 1.69 6.64 1.69 7.64 0 13.86-6.21 13.86-13.86 0-3.7-1.44-7.18-4.8-10.59zM16.82 26.67c-2.12 0-4.18-.56-6-1.63l-.43-.26-4.85 1.19 1.29-4.73-.28-.45a11.83 11.83 0 0 1-1.78-6.25c0-6.56 5.34-11.9 11.9-11.9 3.18 0 6.17 1.24 8.42 3.49a11.84 11.84 0 0 1 3.49 8.42c0 6.56-5.34 11.9-11.9 11.9z" />
    </svg>
  );
}

function EstateCard({ name, blocks }: { name: string; blocks: BlockGroup[] }) {
  return (
    <div className="card p-5">
      <div className="mb-3 font-serif text-xl">{name}</div>

      <div className="grid gap-3 sm:grid-cols-2">
        {blocks.map((b) => (
          <div
            key={b.label}
            className="rounded-xl border border-gold/15 bg-deep2 p-3 flex items-center justify-between"
          >
            <div className="text-gold">{b.label}</div>

            <a
              href={b.invite}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Gabung WhatsApp ${name} – ${b.label}`}
              title={`Gabung WhatsApp ${name} – ${b.label}`}
              className="
                inline-flex h-11 w-11 items-center justify-center
                rounded-full border border-gold/25 bg-gold/10
                hover:bg-gold/20 hover:border-gold/35
                transition-colors duration-200
              "
            >
              <WaIcon className="h-6 w-6 text-gold" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================== Page ================================== */

export default function ClubPage() {
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
          <h1 className="font-serif text-5xl leading-tight md:text-6xl">Pak Sayur Privé Club</h1>
          <p className="mt-3 text-lg text-goldmuted">
            Pilih <span className="text-gold">perumahan</span> & <span className="text-gold">blok</span> Anda, lalu
            klik ikon WhatsApp untuk bergabung ke grup—jadwal kunjungan, promo, & concierge RT/RW.
          </p>
        </div>
      </section>

      {/* STICKY FILTER BAR */}
      <div className="sticky top-16 z-30 mt-6 rounded-2xl border border-gold/10 bg-deep/80 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[240px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari perumahan… (contoh: Graha, Royal, Pakuwon)"
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>

          {/* Area chips */}
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'all', label: 'Semua Surabaya' },
              { id: 'barat', label: 'Surabaya Barat' },
              { id: 'timur', label: 'Surabaya Timur' },
            ] as { id: AreaId; label: string }[]).map((chip) => (
              <button
                key={chip.id}
                onClick={() => setArea(chip.id)}
                className={`rounded-xl border px-3 py-1 text-sm transition
                  ${area === chip.id
                    ? 'border-gold/40 bg-gold/10'
                    : 'border-gold/15 hover:border-gold/25'
                  }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Ask for new estate */}
          <a
            href={`https://wa.me/628132020531?text=${encodeURIComponent(
              'Halo admin Pak Sayur, saya mau request grup perumahan baru: [TULIS NAMA PERUMAHAN & BLOK]. Terima kasih!'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            Minta Perumahan Baru
          </a>
        </div>
      </div>

      {/* LIST */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <EstateCard key={e.id} name={e.name} blocks={e.blocks} />
        ))}
      </div>

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <div className="mt-16 rounded-2xl border border-gold/10 bg-deep2 p-8 text-center text-goldmuted">
          Belum ada hasil untuk pencarian Anda. Coba kata kunci/area lain.
        </div>
      )}

      {/* FOOTER NAV */}
      <div className="mt-12 flex justify-center gap-3">
        <Link href="/" className="btn">Kembali ke Home</Link>
      </div>

      <div className="mt-8 text-center text-sm text-goldmuted">
        Daftar perumahan di atas bersifat indikatif (tidak semua tercantum). Jika perumahan Anda belum ada,
        silakan klik <span className="text-gold">“Minta Perumahan Baru”</span>.
      </div>
    </main>
  );
}
