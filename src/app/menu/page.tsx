'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/* ----------------------------- CATEGORIES ----------------------------- */

type CategoryId = 'leafy' | 'fruit' | 'root' | 'flower' | 'aromatic';

const CATEGORIES: Record<CategoryId, { label: string }> = {
  leafy:   { label: 'Daun & Sayur Hijau' },
  fruit:   { label: 'Sayuran Buah' },
  root:    { label: 'Umbi & Akar' },
  flower:  { label: 'Bunga & Batang' },
  aromatic:{ label: 'Bumbu Dapur' },
};

/* ------------------------------- PRODUCTS ------------------------------ */

type Product = {
  id: string;
  name: string;
  category: CategoryId;
  src?: string; // optional: if missing, fallback image will be used
};

const P: Product[] = [
  // Leafy
  { id: 'bayam',          name: 'Bayam',          category: 'leafy',  src: '/images/products/bayam.png' },
  { id: 'kangkung',       name: 'Kangkung',       category: 'leafy',  src: '/images/products/kangkung.png' },
  { id: 'sawi-hijau',     name: 'Sawi Hijau',     category: 'leafy',  src: '/images/products/sawi-hijau.png' },
  { id: 'sawi-putih',     name: 'Sawi Putih',     category: 'leafy',  src: '/images/products/sawi-putih.png' },
  { id: 'kailan',         name: 'Kailan',         category: 'leafy',  src: '/images/products/kailan.png' },
  { id: 'daun-singkong',  name: 'Daun Singkong',  category: 'leafy',  src: '/images/products/daun-singkong.png' },
  { id: 'daun-pepaya',    name: 'Daun Pepaya',    category: 'leafy',  src: '/images/products/daun-pepaya.png' },
  { id: 'seledri',        name: 'Seledri',        category: 'leafy',  src: '/images/products/seledri.png' },

  // Fruit vegetables
  { id: 'kacang-panjang', name: 'Kacang Panjang', category: 'fruit',  src: '/images/products/kacang-panjang.png' },
  { id: 'buncis',         name: 'Buncis',         category: 'fruit',  src: '/images/products/buncis.png' },
  { id: 'gambas',         name: 'Gambas (Oyong)', category: 'fruit',  src: '/images/products/gambas.png' },
  { id: 'terong',         name: 'Terong',         category: 'fruit',  src: '/images/products/terong.png' },
  { id: 'tomat-besar',    name: 'Tomat Besar',    category: 'fruit',  src: '/images/products/tomat-besar.png' },
  { id: 'tomat-cherry',   name: 'Tomat Cherry',   category: 'fruit',  src: '/images/products/tomat-cherry.png' },
  { id: 'timun',          name: 'Timun',          category: 'fruit',  src: '/images/products/timun.png' },
  { id: 'paria',          name: 'Paria (Pare)',   category: 'fruit',  src: '/images/products/paria.png' },
  { id: 'jagung-manis',   name: 'Jagung Manis',   category: 'fruit',  src: '/images/products/jagung-manis.png' },
  { id: 'paprika',        name: 'Paprika',        category: 'fruit',  src: '/images/products/paprika.png' },
  { id: 'cabai-kecil',    name: 'Cabai Kecil',    category: 'fruit',  src: '/images/products/cabai-kecil.png' },

  // Roots
  { id: 'wortel',         name: 'Wortel',         category: 'root',   src: '/images/products/wortel.png' },
  { id: 'wortel-impor',   name: 'Wortel Impor',   category: 'root',   src: '/images/products/wortel-impor.png' },
  { id: 'kentang',        name: 'Kentang',        category: 'root',   src: '/images/products/kentang.png' },
  { id: 'singkong',       name: 'Singkong',       category: 'root',   src: '/images/products/singkong.png' },
  { id: 'ubi-jalar',      name: 'Ubi Jalar',      category: 'root',   src: '/images/products/ubi-jalar.png' },
  { id: 'jahe',           name: 'Jahe',           category: 'root',   src: '/images/products/jahe.png' },

  // Flower/Stem
  { id: 'tauge',          name: 'Tauge (Cambah)', category: 'flower', src: '/images/products/tauge.png' },
  { id: 'kol',            name: 'Kol (Kubis)',    category: 'flower', src: '/images/products/kol.png' },
  { id: 'brokoli',        name: 'Brokoli',        category: 'flower', src: '/images/products/brokoli.png' },
  { id: 'selada',         name: 'Selada',         category: 'flower', src: '/images/products/selada.png' },
  { id: 'jamur-kancing',  name: 'Jamur Kancing',  category: 'flower', src: '/images/products/jamur-kancing.png' },
  { id: 'jamur-tiram',    name: 'Jamur Tiram',    category: 'flower', src: '/images/products/jamur-tiram.png' },

  // Aromatics
  { id: 'bawang-putih',   name: 'Bawang Putih',   category: 'aromatic', src: '/images/products/bawang-putih.png' },
  { id: 'bawang-merah',   name: 'Bawang Merah',   category: 'aromatic', src: '/images/products/bawang-merah.png' },
  { id: 'bawang-bombai',  name: 'Bawang Bombai',  category: 'aromatic', src: '/images/products/bawang-bombai.png' },
  { id: 'daun-jeruk',     name: 'Daun Jeruk',     category: 'aromatic', src: '/images/products/daun-jeruk.png' },
];

/* --------------------------- SMALL CARD COMPONENT --------------------------- */

function ProductCard({ name, src }: { name: string; src?: string }) {
  const img = src ?? '/images/placeholders/veg.png';

  return (
    <div className="card p-3 group">
      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-gold/15 bg-deep2">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgba(0,0,0,.18)_0%,transparent_65%)]" />
        <Image
          src={img}
          alt={name}
          fill
          sizes="(min-width:1024px) 220px, 40vw"
          className="relative z-10 object-contain p-3 drop-shadow-[0_10px_24px_rgba(0,0,0,.35)]
                     transition-transform duration-500 ease-out transform-gpu group-hover:scale-105
                     motion-reduce:transition-none motion-reduce:transform-none"
        />
      </div>
      <div className="text-center font-serif text-sm sm:text-base">{name}</div>
    </div>
  );
}

/* --------------------------------- PAGE --------------------------------- */

export default function MenuPage() {
  const [active, setActive] = useState<CategoryId | 'all'>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    return P.filter((p) => {
      const byCat = active === 'all' ? true : p.category === active;
      const byText = !key || p.name.toLowerCase().includes(key);
      return byCat && byText;
    });
  }, [active, q]);

  const countPerCat = useMemo(() => {
    const map = { all: P.length } as Record<string, number>;
    (Object.keys(CATEGORIES) as CategoryId[]).forEach((c) => {
      map[c] = P.filter((p) => p.category === c).length;
    });
    return map;
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-4 md:py-6">
      {/* HERO */}
      <section className="relative card-soft overflow-hidden p-6 md:p-12">
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <Image
            src="/images/hero/leaf.jpg"
            alt=""
            fill
            priority
            sizes="(min-width:1024px) 1200px, 100vw"
            className="object-cover opacity-60"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_60%_20%,rgba(81,133,102,.55)_0%,rgba(0,0,0,0)_60%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-deep/70 to-transparent" />

        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-4xl leading-tight md:text-6xl">Menu Lengkap</h1>
          <p className="mt-3 text-base md:text-lg text-goldmuted">
            Semua sayuran & bumbu untuk keluarga.
          </p>
        </div>
      </section>

      {/* STICKY FILTER BAR */}
      <div className="sticky top-16 z-30 mt-6 rounded-2xl border border-gold/10 bg-deep/80 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="min-w-[240px] flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari sayur… (contoh: brokoli, kangkung, bawang)"
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'all', label: `Semua (${countPerCat.all})` },
              ...(Object.keys(CATEGORIES) as CategoryId[]).map((c) => ({
                id: c,
                label: `${CATEGORIES[c].label} (${countPerCat[c]})`,
              })),
            ] as { id: CategoryId | 'all'; label: string }[]).map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActive(chip.id)}
                className={`rounded-xl border px-3 py-1 text-sm transition ${
                  active === chip.id
                    ? 'border-gold/40 bg-gold/10'
                    : 'border-gold/15 hover:border-gold/25'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GROUPS by category (2-col on mobile, 3/5 wider) */}
      <div className="mt-8 space-y-10">
        {(Object.keys(CATEGORIES) as CategoryId[]).map((cat) => {
          const items = filtered.filter((p) => p.category === cat);
          if (active !== 'all' && active !== cat) return null;
          if (items.length === 0) return null;

          return (
            <section key={cat} id={cat}>
              <h2 className="mb-4 font-serif text-3xl">{CATEGORIES[cat].label}</h2>

              {/* ✅ 2-col mobile grid just like homepage */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {items.map((p) => (
                  <ProductCard key={p.id} name={p.name} src={p.src} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <div className="mt-16 rounded-2xl border border-gold/10 bg-deep2 p-8 text-center text-goldmuted">
          Tidak ditemukan hasil untuk <span className="text-gold">“{q}”</span>. Coba kata kunci lain.
        </div>
      )}

      {/* FOOTER NAV */}
      <div className="mt-12 flex justify-center gap-3">
        <Link href="/" className="btn">Kembali ke Home</Link>
      </div>
    </main>
  );
}
