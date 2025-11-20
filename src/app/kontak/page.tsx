'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const ADMIN_WA = '6285190653341';

function WaIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.11 17.15c-.27-.13-1.58-.78-1.83-.87-.25-.09-.43-.13-.62.13-.18.27-.71.87-.87 1.04-.16.18-.32.2-.59.07-.27-.13-1.12-.41-2.13-1.3-.79-.7-1.33-1.56-1.49-1.82-.16-.27-.02-.41.11-.54.11-.11.25-.27.38-.41.13-.13.18-.23.27-.41.09-.18.05-.34-.02-.48-.07-.13-.62-1.49-.84-2.05-.22-.53-.45-.45-.62-.46l-.53-.01c-.18 0-.46.07-.7.34-.23.27-.92.9-.92 2.2 0 1.3.94 2.55 1.07 2.73.13.18 1.85 2.82 4.49 3.95.63.27 1.12.43 1.5.55.63.2 1.21.17 1.66.11.51-.08 1.58-.64 1.8-1.27.22-.62.22-1.15.15-1.27-.07-.11-.25-.18-.52-.31z" />
      <path d="M26.88 5.12A13.84 13.84 0 0 0 16 1.14 13.86 13.86 0 0 0 2.12 15c0 2.44.66 4.82 1.92 6.9L2 29.88l8.18-2c2.02 1.11 4.3 1.69 6.64 1.69 7.64 0 13.86-6.21 13.86-13.86 0-3.7-1.44-7.18-4.8-10.59zM16.82 26.67c-2.12 0-4.18-.56-6-1.63l-.43-.26-4.85 1.19 1.29-4.73-.28-.45a11.83 11.83 0 0 1-1.78-6.25c0-6.56 5.34-11.9 11.9-11.9 3.18 0 6.17 1.24 8.42 3.49a11.84 11.84 0 0 1 3.49 8.42c0 6.56-5.34 11.9-11.9 11.9z" />
    </svg>
  );
}

export default function KontakPage() {
  const [nama, setNama] = useState('');
  const [perumahan, setPerumahan] = useState('');
  const [blok, setBlok] = useState('');
  const [alamat, setAlamat] = useState('');
  const [pesanan, setPesanan] = useState('');

  const openWA = () => {
    // Minimal validation
    if (!alamat.trim() || !pesanan.trim()) {
      alert('Tolong isi minimal Alamat dan Pesanan.');
      return;
    }

    const lines = [
      'Halo Admin Pak Sayur, saya ingin pesan:',
      `Nama: ${nama || '-'}`,
      `Perumahan: ${perumahan || '-'}`,
      `Blok: ${blok || '-'}`,
      `Alamat Lengkap: ${alamat}`,
      'Pesanan:',
      pesanan,
    ];
    const msg = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/${ADMIN_WA}?text=${msg}`;
    window.open(url, '_blank');
  };

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
          <h1 className="font-serif text-5xl leading-tight md:text-6xl">Kontak & Pemesanan</h1>
          <p className="mt-3 text-lg text-goldmuted">
            Pemesanan <span className="text-gold">direkomendasikan lewat grup WhatsApp</span> per
            perumahan (Privé Club). Jika belum bergabung, Anda bisa tulis <em>alamat</em> dan
            <em> pesanan</em> di bawah ini untuk dikirim ke admin.
          </p>
        </div>
      </section>

      {/* CTA CARDS */}
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Privé Club */}
        <div className="card p-6">
          <h2 className="font-serif text-2xl">Gabung Privé Club (Disarankan)</h2>
          <p className="mt-2 text-goldmuted">
            Dapatkan info jadwal per perumahan & prioritas stok. Klik untuk memilih perumahan ,
            lalu bergabung ke grup WhatsApp.
          </p>
          <Link href="/club" className="btn btn-primary mt-4 inline-flex items-center gap-2">
            <WaIcon /> Pilih Perumahan
          </Link>
        </div>

        {/* Chat Admin */}
        <div className="card p-6">
          <h2 className="font-serif text-2xl">Chat Admin</h2>
          <p className="mt-2 text-goldmuted">
            Nomor admin: <span className="text-gold">+{ADMIN_WA}</span>
          </p>
          <a
            href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent('Halo Admin Pak Sayur!')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn mt-4 inline-flex items-center gap-2"
            title="Buka WhatsApp"
          >
            <WaIcon /> Buka WhatsApp
          </a>
        </div>
      </section>

      {/* QUICK ORDER FORM */}
      <section className="mt-8 card p-6">
        <h2 className="font-serif text-2xl">Form Singkat (Jika belum di grup)</h2>
        <p className="mt-1 text-goldmuted">
          Isi form ini untuk mengirim detail ke admin via WhatsApp. Disarankan tetap bergabung ke
          grup perumahan agar jadwal lebih jelas.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-goldmuted mb-1">Nama</label>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
              placeholder="Nama Anda"
            />
          </div>
          <div>
            <label className="block text-sm text-goldmuted mb-1">Perumahan</label>
            <input
              value={perumahan}
              onChange={(e) => setPerumahan(e.target.value)}
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
              placeholder="Contoh: Graha Famili"
            />
          </div>
          <div>
            <label className="block text-sm text-goldmuted mb-1">Blok</label>
            <input
              value={blok}
              onChange={(e) => setBlok(e.target.value)}
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
              placeholder="Contoh: A-3"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-goldmuted mb-1">Alamat Lengkap *</label>
            <input
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
              placeholder="Jalan, nomor rumah, patokan"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-goldmuted mb-1">Pesanan *</label>
            <textarea
              value={pesanan}
              onChange={(e) => setPesanan(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-gold/15 bg-deep2 px-4 py-2 text-gold placeholder:text-goldmuted focus:outline-none focus:ring-1 focus:ring-gold/30"
              placeholder={`Contoh:\n- Kangkung 2 ikat\n- Brokoli 1\n- Wortel 500g`}
              required
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={openWA} className="btn btn-primary inline-flex items-center gap-2">
            <WaIcon /> Kirim ke WhatsApp Admin
          </button>
          <Link href="/club" className="btn">
            Gabung Privé Club
          </Link>
        </div>
      </section>

      {/* INFO NOTE */}
      <section className="mt-8 rounded-2xl border border-gold/15 bg-deep2 p-5">
        <h3 className="font-serif text-xl">Tidak Pre-Order? Masih Bisa Belanja</h3>
        <p className="mt-1 text-goldmuted">
          Tenang—meski tidak pre-order, <span className="text-gold">armada keliling</span> kami tetap
          lewat sesuai jadwal per blok. Anda tetap bisa belanja langsung saat armada melintas.
        </p>
      </section>

      {/* BACK TO HOME */}
      <div className="mt-12 flex justify-center">
        <Link href="/" className="btn">Kembali ke Home</Link>
      </div>
    </main>
  );
}
