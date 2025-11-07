// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

const products = [
  { id: "kangkung",     name: "Kangkung",      src: "/images/products/kangkung.png" },
  { id: "brokoli",      name: "Brokoli",       src: "/images/products/brokoli.png" },
  { id: "wortel",       name: "Wortel",        src: "/images/products/wortel.png" },
  { id: "tomat-besar",  name: "Tomat Besar",   src: "/images/products/tomat-besar.png" },
  { id: "bawang-putih", name: "Bawang Putih",  src: "/images/products/bawang-putih.png" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 mb-6 rounded-2xl border border-gold/10 bg-deep/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gold/40">◉</span>
            <span className="font-serif text-lg">PAK SAYUR</span>
          </div>

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
      </header>

      {/* HERO — centered title; keep Privé alignment untouched */}
      <section className="relative card-soft overflow-visible p-10 md:p-12">
        {/* Background image + green glow + bottom fade */}
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
            Pak Sayur Modern
          </h1>
          <p className="mt-3 text-lg text-goldmuted">
            Higienis · Terjadwal · Terpercaya
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/jadwal" className="btn">Jadwal Kunjungan</Link>
            <Link href="/menu" className="btn btn-primary">Lihat Menu</Link>
          </div>
        </div>

        {/* Privé card — DO NOT change alignment */}
        <aside
          className="
            hidden md:block
            absolute -bottom-20 right-2
            w-[340px] rounded-2xl border border-gold/20 bg-deep/95 p-6
          "
        >
          <div className="translate-y-[-3rem] lg:translate-y-[-0.5rem]">
            <h3 className="font-serif text-[42px] leading-[1.05]">
              <span className="block">Pak Sayur</span>
              <span className="block"><span className="italic">Privé</span> Club</span>
            </h3>

            <div className="mt-4 rounded-xl border border-gold/15 p-5">
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
          <Link href="/club" className="btn btn-primary mt-6">
            Masuk Klub Privé
          </Link>
        </div>
      </section>

      {/* MENU SECTION */}
      <section className="mt-10">
        <h2 className="font-serif text-4xl">Menu Sayuran dan Daging</h2>

        {/* Feature tiles with icons */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25">
                <Image src="/icons/wrap.png" alt="" width={28} height={28} className="opacity-80" />
              </div>
              <div>
                <div className="font-serif text-2xl">Food-Grade Wrapping</div>
                <p className="text-goldmuted">Bersih & aman untuk keluarga.</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25">
                <Image src="/icons/calendar.png" alt="" width={28} height={28} className="opacity-80" />
              </div>
              <div>
                <div className="font-serif text-2xl">Jadwal Pasti per RT/RW</div>
                <p className="text-goldmuted">Kami datang sesuai jadwal.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products with images (no prices) */}
<div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
  {products.map((p) => (
    <div key={p.id} className="card p-4 group">
      {/* Wrapper: dark card + soft radial shadow UNDER the image */}
      <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl border border-gold/15 bg-deep2">
        <div className="pointer-events-none absolute inset-0 z-0
                        bg-[radial-gradient(60%_60%_at_50%_45%,rgba(0,0,0,.18)_0%,transparent_65%)]" />
        <Image
          src={p.src}
          alt={p.name}
          fill
          sizes="(min-width:1024px) 220px, 40vw"
          className="
            relative z-10 object-contain p-3
            drop-shadow-[0_10px_24px_rgba(0,0,0,.35)]
            transition-transform duration-500 ease-out transform-gpu
            group-hover:scale-115
            motion-reduce:transition-none motion-reduce:transform-none
          "
        />
      </div>
      <div className="font-serif">{p.name}</div>
    </div>
  ))}
</div>


        {/* See more */}
        <div className="mt-6 flex justify-center">
          <Link href="/menu" className="btn btn-primary">
            Lihat lainnya
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-gold/10 py-8 text-center text-sm text-goldmuted">
        © {new Date().getFullYear()} Pak Sayur
      </footer>
    </main>
  );
}
