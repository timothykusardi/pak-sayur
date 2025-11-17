// src/app/club/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/* ============================= Types & Data ============================= */

type AreaId = 'all' | 'barat' | 'tengah' | 'selatan' | 'timur';

type Estate = {
  id: string;
  name: string;
  area: Exclude<AreaId, 'all'>; // 'barat' | 'tengah' | 'selatan' | 'timur'
  waGroupUrl: string;           // link undangan grup WhatsApp
};

// List perumahan / area + link grup WhatsApp
const ESTATES: Estate[] = [
  /* --- SURABAYA BARAT --- */
  {
    id: 'graha-family',
    name: 'Graha Family',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/J7G80pQMt5NA5N7l7ex2Oi',
  },
  {
    id: 'royal-residence',
    name: 'Royal Residence',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/KGZn2SmrdZOG5IyIUDB0ez',
  },
  {
    id: 'dian-istana',
    name: 'Dian Istana',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/Kk9VCDA3bFI9jDYzTwm59h',
  },
  {
    id: 'wisata-bukit-mas',
    name: 'Wisata Bukit Mas',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/DL2IhVJmgVO8Br8qQPGHEL',
  },
  {
    id: 'villa-bukit-mas',
    name: 'Villa Bukit Mas',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/Ly69Pp6lnktHvmgQe43yAm',
  },
  {
    id: 'graha-natura',
    name: 'Graha Natura',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/HWn5MC1gshKG1Z3uAnd9JW',
  },
  {
    id: 'villa-bukit-regency',
    name: 'Villa Bukit Regency',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/B6HbIp0GH9f0LXedyZaeg9',
  },
  {
    id: 'darmo-harapan',
    name: 'Darmo Harapan Indah',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/FENup9R4JBiAAGTbcVQ8tD',
  },
  {
    id: 'pradah-indah',
    name: 'Pradah Indah',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/HbqPWC3xSJi3l6pyW1mrId',
  },
  {
    id: 'grand-pakuwon',
    name: 'Grand Pakuwon',
    area: 'barat',
    waGroupUrl: 'https://chat.whatsapp.com/IqVt1SPONKHH58hAGlZtxX',
  },

  /* --- SURABAYA TENGAH --- */
  {
    id: 'darmo-area',
    name: 'Darmo Area',
    area: 'tengah',
    waGroupUrl: 'https://chat.whatsapp.com/J84aLsXpN3pF4E6gQz2Be5',
  },
  {
    id: 'gubeng-area',
    name: 'Gubeng Area',
    area: 'tengah',
    waGroupUrl: 'https://chat.whatsapp.com/Bvkc6ToNPCjDth16G9xAks',
  },

  /* --- SURABAYA SELATAN --- */
  {
    id: 'margorejo-area',
    name: 'Margorejo Area',
    area: 'selatan',
    waGroupUrl: 'https://chat.whatsapp.com/BlIBkz71KvJAHJmvqKGkRa',
  },
  {
    id: 'jemursari-area',
    name: 'Jemursari Area',
    area: 'selatan',
    waGroupUrl: 'https://chat.whatsapp.com/IS8XWDCFUPc4dsAT35ELzU',
  },
  {
    id: 'ketintang-area',
    name: 'Ketintang Area',
    area: 'selatan',
    waGroupUrl: 'https://chat.whatsapp.com/BbiRIV1v9hhFyAtPlR9tQ0',
  },

  /* --- SURABAYA TIMUR --- */
  {
    id: 'pakuwon-city',
    name: 'Pakuwon City',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/JWMrfsTSSWVAMt5WTZT0Xy',
  },
  {
    id: 'kertajaya-indah',
    name: 'Kertajaya Indah Regency',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/D3j4DI1rhyk3DmiWEbQcUl',
  },
  {
    id: 'dharmahusada-indah',
    name: 'Dharmahusada Indah',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/Fp1UQOTnJWg1IkiJ4YmHG9',
  },
  {
    id: 'galaxy-bumi-permai',
    name: 'Galaxy Bumi Permai',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/B8yVlpnnUeAE9Hw2cXOW6N',
  },
  {
    id: 'puri-galaxy',
    name: 'Puri Galaxy',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/LvTcrGKfLy293eoX06PhQY',
  },
  {
    id: 'manyar-residence',
    name: 'Manyar Residence',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/LF5Pse0W4z0JzOZ7ZIN5uW',
  },
  {
    id: 'mulyosari-area',
    name: 'Mulyosari Area',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/HVg97N79f3s2XERy7xszkz',
  },
  {
    id: 'sutorejo-prima',
    name: 'Sutorejo Prima',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/HVg97N79f3s2XERy7xszkz',
  },
  {
    id: 'east-coast-res',
    name: 'East Coast Residence',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/Iuq7nCQ1tS3IKshcnH0wjX',
  },
  {
    id: 'laguna-residence',
    name: 'Laguna Residence',
    area: 'timur',
    waGroupUrl: 'https://chat.whatsapp.com/Hh9zqjkHGENB07kGD0STI2',
  },
];

/* ============================== Utilities ============================== */

// WA bisnis hanya untuk tombol "Minta Perumahan Baru"
const BUSINESS_WA = '6285190653341';

function waLinkFor(estate: Estate) {
  // Semua estate di atas sudah punya waGroupUrl → langsung pakai
  return estate.waGroupUrl;
}

/* ============================== UI Components ============================== */

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

function EstateCard({ estate }: { estate: Estate }) {
  const label = `Gabung grup WhatsApp ${estate.name}`;

  return (
    <div className="card p-5 flex items-center justify-between">
      <div className="font-serif text-xl">{estate.name}</div>

      <a
        href={waLinkFor(estate)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className="
          inline-flex h-12 w-12 items-center justify-center
          rounded-full border border-gold/25 bg-gold/10
          hover:bg-gold/20 hover:border-gold/35
          transition-colors duration-200
        "
      >
        <WaIcon className="h-6 w-6 text-gold" />
      </a>
    </div>
  );
}

/* ================================== Page ================================== */

export default function ClubPage() {
  const [area, setArea] = useState<AreaId>('all');
  const [q,   setQ]   = useState('');

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
            Pak Sayur Privé Club
          </h1>
          <p className="mt-3 text-lg text-goldmuted">
            Pilih <span className="text-gold">perumahan / area</span> Anda, lalu klik ikon WhatsApp
            untuk langsung bergabung ke grup resmi Pak Sayur Privé Club.
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
              placeholder="Cari perumahan/area… (contoh: Graha, Royal, Margorejo)"
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>

          {/* Area chips */}
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'all',     label: 'Semua Surabaya' },
              { id: 'barat',   label: 'Surabaya Barat' },
              { id: 'tengah',  label: 'Surabaya Tengah' },
              { id: 'selatan', label: 'Surabaya Selatan' },
              { id: 'timur',   label: 'Surabaya Timur' },
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
            href={`https://wa.me/${BUSINESS_WA}?text=${encodeURIComponent(
              'Halo admin Pak Sayur, saya mau request penambahan perumahan/area baru untuk Klub Privé: [TULIS NAMA PERUMAHAN/AREA]. Terima kasih!'
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
          <EstateCard key={e.id} estate={e} />
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
        <Link href="/" className="btn">
          Kembali ke Home
        </Link>
      </div>

      <div className="mt-8 text-center text-sm text-goldmuted">
        Daftar perumahan/area di atas bersifat indikatif. Jika perumahan/area Anda belum ada,
        silakan klik <span className="text-gold">“Minta Perumahan Baru”</span>.
      </div>
    </main>
  );
}
