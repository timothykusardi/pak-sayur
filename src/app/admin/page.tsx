// src/app/admin/page.tsx

export const dynamic = 'force-dynamic';

type OrderRow = {
  id: number;
  name: string;
  address: string;
  orders: number;
  total: number;
  pay: 'COD' | 'TF';
  status: 'PENDING' | 'CONFIRMED';
};

type ZoneSection = {
  zoneName: string;
  codCount: number;
  tfCount: number;
  totalOrders: number;
  totalAmount: number;
  orders: OrderRow[];
};

const MOCK_ZONES: ZoneSection[] = [
  {
    zoneName: 'Graha Famili',
    codCount: 2,
    tfCount: 1,
    totalOrders: 3,
    totalAmount: 403000,
    orders: [
      {
        id: 1,
        name: 'Bu Maya',
        address: 'Jl. GF AA-11',
        orders: 3,
        total: 150000,
        pay: 'COD',
        status: 'PENDING',
      },
      {
        id: 2,
        name: 'Pak Anton',
        address: 'Jl. GF SS-2',
        orders: 2,
        total: 123000,
        pay: 'TF',
        status: 'CONFIRMED',
      },
      {
        id: 3,
        name: 'Bu Nia',
        address: 'Jl. GF BB-5',
        orders: 1,
        total: 130000,
        pay: 'COD',
        status: 'CONFIRMED',
      },
    ],
  },
];

export default function AdminPage() {
  const selectedDateLabel = 'Mar 31, 2024';

  return (
    <main className="min-h-screen bg-[#020d07] text-emerald-50">
      {/* Top bar */}
      <header className="border-b border-emerald-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full border border-emerald-400" />
            <span className="text-sm tracking-[0.2em] text-emerald-200">
              PAK SAYUR
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-emerald-100/80">
            <a href="/" className="hover:text-emerald-200">
              Home
            </a>
            <a href="/menu" className="hover:text-emerald-200">
              Menu
            </a>
            <a href="/blog" className="hover:text-emerald-200">
              Blog
            </a>
            <a href="/kontak" className="hover:text-emerald-200">
              Kontak
            </a>
            <button className="rounded-full border border-emerald-500/60 px-4 py-1 text-xs">
              Jadwal Kunjungan
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Title card */}
        <section className="mb-6 rounded-3xl border border-emerald-900/70 bg-[#04150c] px-6 py-8 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-4xl tracking-[0.25em] text-emerald-100">
              PAK SAYUR ADMIN
            </h1>
            <div className="text-sm text-emerald-300/80">
              [ {selectedDateLabel} ]
            </div>

            <div className="mt-2 flex gap-4">
              <button className="flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-800/10 px-4 py-1.5 text-xs text-emerald-100">
                Filter
                <span className="text-[10px]">▼</span>
              </button>
              <button className="flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-800/10 px-4 py-1.5 text-xs text-emerald-100">
                Sort All
                <span className="text-[10px]">▼</span>
              </button>
            </div>
          </div>
        </section>

        {/* ZONE SECTIONS */}
        {MOCK_ZONES.map((zone) => (
          <section key={zone.zoneName} className="mb-8">
            <h2 className="mb-3 text-base font-medium text-emerald-100/90">
              ZONE:{zone.zoneName} (
              {zone.totalOrders} orders — {zone.codCount} COD, {zone.tfCount} TF
              – Rp {zone.totalAmount.toLocaleString('id-ID')})
            </h2>

            <div className="overflow-hidden rounded-2xl border border-[#23412d] bg-[#06170f]">
              <table className="w-full border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-[#1a3322] text-xs font-semibold uppercase tracking-wide text-emerald-100/80">
                    <th className="px-6 py-3 text-left">Nama</th>
                    <th className="px-3 py-3 text-left">Alamat</th>
                    <th className="px-3 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-center">Pay</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {zone.orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-t border-[#1a3322] text-emerald-50/90"
                    >
                      <td className="px-6 py-4 font-semibold text-emerald-50">
                        {o.name}
                      </td>
                      <td className="px-3 py-4 text-sm text-emerald-200/80">
                        {o.address}
                      </td>
                      <td className="px-3 py-4 text-center">
                        {o.orders}
                      </td>
                      <td className="px-4 py-4 text-right">
                        Rp {o.total.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-4 text-center font-medium">
                        {o.pay}
                      </td>
                      <td className="px-3 py-4 text-center text-sm">
                        {o.status === 'PENDING'
                          ? 'Pending'
                          : o.status === 'CONFIRMED'
                          ? 'Confirmed'
                          : o.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
