// src/app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Pak Sayur Modern – Sayur Segar Keliling Surabaya",
  description:
    "Pesan sayur dan daging segar berkualitas untuk Graha Family, Royal Residence, Pakuwon City, dan berbagai perumahan lainnya di Surabaya. Pre-order via WhatsApp, antar pagi hari dengan jadwal teratur.",
};

const products = [
  { id: "kangkung",     name: "Kangkung",      src: "/images/products/kangkung.png" },
  { id: "brokoli",      name: "Brokoli",       src: "/images/products/brokoli.png" },
  { id: "wortel",       name: "Wortel",        src: "/images/products/wortel.png" },
  { id: "tomat-besar",  name: "Tomat Besar",   src: "/images/products/tomat-besar.png" },
  { id: "bawang-putih", name: "Bawang Putih",  src: "/images/products/bawang-putih.png" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-6">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 mb-5 rounded-2xl border border-gold/10 bg-deep/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 text-xs">
              ◉
            </span>
            <span className="font-serif text-base md:text-lg leading-none">PAK SAYUR</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden gap-8 md:flex">
            {[
              { href: "/", label: "Home" },
              { href: "/menu", label: "Menu" },
              { href: "/blog", label: "Blog" },
              { href: "/kontak", label: "Kontak" },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="nav-link">
                {l.label}
              </Link>
            ))}
          </nav>

          <Link href="/jadwal" className="btn">Jadwal Kunjungan</Link>
        </div>

        {/* Mobile nav (scrollable pills) */}
        <nav className="md:hidden flex gap-2 overflow-x-auto px-4 py-2 border-t border-gold/10">
          {[
            { href: "/", label: "Home" },
            { href: "/menu", label: "Menu" },
            { href: "/blog", label: "Blog" },
            { href: "/kontak", label: "Kontak" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="whitespace-nowrap rounded-full border border-gold/20 px-4 py-2 text-sm"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* HERO */}
      <section className="relative card-soft overflow-visible p-6 md:p-10">
        {/* Background layers */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <Image
            src="/images/hero/leaf.jpg"
            alt=""
            fill
            priority
            sizes="(min-width:1024px) 1200px, 100vw"
            className="object-cover opacity-55"
          />
        </div>
        <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(60%_60%_at_60%_20%,rgba(81,133,102,.50)_0%,rgba(0,0,0,0)_60%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 md:h-40 rounded-b-2xl bg-gradient-to-t from-deep/70 to-transparent" />

        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl md:text-6xl">
            Pak Sayur Modern
          </h1>
          <p className="mt-2 text-base sm:text-lg text-goldmuted">
            Higienis · Terjadwal · Terpercaya
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link href="/jadwal" className="btn w-full sm:w-auto">Jadwal Kunjungan</Link>
            <Link href="/menu" className="btn btn-primary w-full sm:w-auto">Lihat Menu</Link>
          </div>
        </div>

        {/* Desktop-only Privé overlay */}
        <aside
          className="
            hidden md:block
            absolute -bottom-20 right-2
            w-[340px] rounded-2xl border border-gold/20 bg-deep/95 p-6
          "
        >
          <div className="">
            <h3 className="font-serif text-[40px] leading-[1.05]">
              <span className="block">Pak Sayur</span>
              <span className="block"><span className="italic">Privé</span> Club</span>
            </h3>

            <div className="mt-3 rounded-xl border border-gold/15 p-5">
              <ul className="list-disc space-y-1 pl-5 text-goldmuted marker:text-gold/70">
                <li>Akses panen lebih awal</li>
                <li>Gift wrap gratis</li>
                <li>Concierge RT/RW</li>
              </ul>
              <Link href="/club" className="btn mt-5 w-full justify-center">
                Masuk Klub Privé
              </Link>
            </div>
          </div>
        </aside>
      </section>

      {/* MOBILE Privé (stacked) */}
      <section className="md:hidden mt-6">
        <div className="rounded-2xl border border-gold/20 bg-deep p-6">
          <h3 className="font-serif text-3xl">
            Pak Sayur <span className="italic">Privé</span> Club
          </h3>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-goldmuted">
            <li>Akses panen lebih awal</li>
            <li>Gift wrap gratis</li>
            <li>Concierge RT/RW</li>
          </ul>
          <Link href="/club" className="btn btn-primary mt-6 w-full justify-center">
            Masuk Klub Privé
          </Link>
        </div>
      </section>

      {/* MENU SECTION */}
      <section className="mt-10">
        <h2 className="font-serif text-3xl sm:text-4xl">Menu Sayuran dan Daging</h2>

        {/* Feature tiles */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25">
                <Image src="/icons/wrap.png" alt="" width={28} height={28} className="opacity-80" />
              </div>
              <div>
                <div className="font-serif text-xl sm:text-2xl">Food-Grade Wrapping</div>
                <p className="text-goldmuted">Bersih & aman untuk keluarga.</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25">
                <Image src="/icons/calendar.png" alt="" width={28} height={28} className="opacity-80" />
              </div>
              <div>
                <div className="font-serif text-xl sm:text-2xl">Jadwal Pasti per RT/RW</div>
                <p className="text-goldmuted">Kami datang sesuai jadwal.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products (2-col on mobile) */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {products.map((p) => (
            <div key={p.id} className="card p-3 group">
              <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-gold/15 bg-deep2">
                <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgba(0,0,0,.18)_0%,transparent_65%)]" />
                <Image
                  src={p.src}
                  alt={p.name}
                  fill
                  sizes="(min-width:1024px) 220px, 40vw"
                  className="
                    relative z-10 object-contain p-3
                    drop-shadow-[0_10px_24px_rgba(0,0,0,.35)]
                    transition-transform duration-500 ease-out transform-gpu
                    group-hover:scale-105
                    motion-reduce:transition-none motion-reduce:transform-none
                  "
                />
              </div>
              <div className="text-center font-serif text-sm sm:text-base">{p.name}</div>
            </div>
          ))}
        </div>

        {/* See more */}
        <div className="mt-6 flex justify-center">
          <Link href="/menu" className="btn btn-primary">Lihat lainnya</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-14 border-t border-gold/10 py-8 text-center text-sm text-goldmuted">
        © {new Date().getFullYear()} Pak Sayur
      </footer>

      {/* MOBILE sticky quick actions */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 mx-auto max-w-7xl px-4 pb-4">
        <div className="flex gap-3 rounded-2xl border border-gold/15 bg-deep/80 p-2 backdrop-blur">
          <Link href="/jadwal" className="btn flex-1 justify-center">Jadwal</Link>
          <Link href="/menu" className="btn btn-primary flex-1 justify-center">Lihat Menu</Link>
        </div>
      </div>
    </main>
  )
}
