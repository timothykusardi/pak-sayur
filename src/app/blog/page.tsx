import Image from "next/image";
import Link from "next/link";

type Step = { title: string; body: string };

const STEPS: Step[] = [
  {
    title: "Panen Pagi di Desa",
    body:
      "Sayuran dipanen pagi hari langsung dari desa agar segar, tidak cepat layu, dan nutrisinya terjaga.",
  },
  {
    title: "Sortasi di Lapangan",
    body:
      "Tim menyortir bahan: yang luka/memar dipisahkan. Hanya grade terbaik yang lanjut ke kota.",
  },
  {
    title: "Rantai Dingin Perjalanan",
    body:
      "Pengiriman memakai boks tertutup + ice gel sederhana untuk menjaga tekstur dan kesegaran.",
  },
  {
    title: "Pencucian & Sanitasi Food-Grade",
    body:
      "Di fasilitas kami, sayur dicuci air mengalir lalu disanitasi sesuai standar food-grade, kemudian ditiriskan di rak bersih.",
  },
  {
    title: "Kemasan Food-Grade & Pelabelan",
    body:
      "Dikemas rapi, aman kontak pangan, mengurangi kontaminasi silang selama distribusi.",
  },
  {
    title: "Penjadwalan per RT/RW",
    body:
      "Kami punya rute tetap per perumahan & blok. Info jadwal dibagikan lewat grup WhatsApp.",
  },
  {
    title: "Pengantaran & Armada Keliling",
    body:
      "Driver terlatih melakukan penjualan langsung di rute. Bisa minta foto bukti saat titip.",
  },
];

export default function BlogProcedurePage() {
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
            Dari Desa ke Meja Anda
          </h1>
          <p className="mt-3 text-lg text-goldmuted">
            Proses ringkas Pak Sayur—panen pagi, dibersihkan, dikemas food-grade, lalu
            diantar terjadwal ke perumahan Anda.
          </p>
        </div>
      </section>

      {/* PROCEDURE STEPS */}
      <section className="mt-8 space-y-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card p-5 md:p-6 flex gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold">
              {i + 1}
            </div>
            <div>
              <h2 className="font-serif text-2xl">{s.title}</h2>
              <p className="mt-1 text-goldmuted">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* NOTE ABOUT PRE-ORDER */}
      <section className="mt-8 rounded-2xl border border-gold/15 bg-deep2 p-5">
        <h3 className="font-serif text-xl">Tidak Pre-Order? Tetap Aman</h3>
        <p className="mt-1 text-goldmuted">
          Walau Anda belum pre-order, <span className="text-gold">armada keliling</span> kami
          tetap lewat sesuai jadwal. Silakan belanja langsung saat rombongan melintas di blok Anda.
          Untuk kepastian stok, kami sarankan pre-order melalui grup WhatsApp perumahan.
        </p>
        <div className="mt-4">
          <Link href="/club" className="btn btn-primary">
            Gabung Grup WhatsApp (Privé Club)
          </Link>
        </div>
      </section>

      {/* BACK TO HOME */}
      <div className="mt-12 flex justify-center">
        <Link href="/" className="btn">
          Kembali ke Home
        </Link>
      </div>
    </main>
  );
}
