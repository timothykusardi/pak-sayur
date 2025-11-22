// src/app/driver/page.tsx
import supabaseAdmin from '@/lib/supabaseAdmin';
import DatePickerControl from '../admin/DatePickerControl';
import ZoneSearchControl from '../admin/ZoneSearchControl';

export const dynamic = 'force-dynamic';

type SearchParams = {
  date?: string;
  zone?: string;
  pay?: string;
};

type OrderRow = {
  // note: the view might not have a real `id` column, we won't order by it
  zone_code: string | null;
  zone_name: string | null;
  customer_name: string | null;
  address_text: string | null;
  payment_method: 'COD' | 'TRANSFER' | null;
  order_status: string | null;
  payment_status: string | null;
  grand_total: number | null;
  order_items_text: string | null;
  order_profit: number | null;
};

type ZoneGroup = {
  zoneCode: string;
  zoneName: string;
  orders: OrderRow[];
  stats: {
    orderCount: number;
    codCount: number;
    tfCount: number;
    totalAmount: number;
    totalProfit: number;
  };
};

function formatRupiah(value: number): string {
  return (value ?? 0).toLocaleString('id-ID');
}

function formatDateHeading(ymd: string): string {
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return ymd;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function displayStatus(status: string | null): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'ON_DELIVERY':
      return 'On Delivery';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'DRAFT':
      return 'Draft';
    default:
      return status ?? '-';
  }
}

export default async function DriverPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise
  searchParams: Promise<SearchParams>;
}) {
  // ---------- 1. Resolve filters from URL (await the Promise) ----------
  const params = await searchParams;

  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const selectedDate =
    typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : defaultDate;

  const zoneFilter =
    typeof params.zone === 'string' ? params.zone.trim() : '';

  // Driver page has no payment filter; always treat as "ALL"
  const payFilter = 'ALL' as const;

  // ---------- 2. Fetch orders for that date ----------
  let query = supabaseAdmin
    .from('dispatch_orders_with_item_list')
    .select('*')
    .eq('order_date', selectedDate)
    .order('zone_name', { ascending: true }); // removed `.order('id')` (column doesn't exist)

  if (zoneFilter) {
    query = query.ilike('zone_name', `%${zoneFilter}%`);
  }

  const { data: orderRows, error: orderErr } = await query;

  if (orderErr) {
    console.error('[DRIVER_DASHBOARD] error orders', orderErr);
  }

  const ordersRaw = (orderRows ?? []) as OrderRow[];

  // ---------- 3. Group by zone ----------
  const zonesMap = new Map<string, ZoneGroup>();

  for (const row of ordersRaw) {
    const zoneCode = row.zone_code ?? 'UNKNOWN';
    const zoneName = row.zone_name ?? 'Unknown Zone';
    const key = `${zoneCode}___${zoneName}`;

    let group = zonesMap.get(key);
    if (!group) {
      group = {
        zoneCode,
        zoneName,
        orders: [],
        stats: {
          orderCount: 0,
          codCount: 0,
          tfCount: 0,
          totalAmount: 0,
          totalProfit: 0,
        },
      };
      zonesMap.set(key, group);
    }

    group.orders.push(row);

    group.stats.orderCount += 1;
    if (row.payment_method === 'COD') group.stats.codCount += 1;
    if (row.payment_method === 'TRANSFER') group.stats.tfCount += 1;
    group.stats.totalAmount += row.grand_total ?? 0;
    group.stats.totalProfit += row.order_profit ?? 0;
  }

  const zones = Array.from(zonesMap.values()).sort((a, b) =>
    a.zoneName.localeCompare(b.zoneName),
  );

  const hasOrders = zones.length > 0;

  // ---------- 4. Render ----------
  return (
    <main className="min-h-screen bg-[#020c08] text-emerald-50">
      <header className="border-b border-emerald-900 bg-gradient-to-b from-[#03150d] to-transparent">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <h1 className="text-3xl tracking-[0.35em] text-emerald-100 sm:text-4xl">
            ORDERS LIST
          </h1>

          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-emerald-200">
            <span className="text-emerald-300">
              [ {formatDateHeading(selectedDate)} ]
            </span>
            <DatePickerControl
              selectedDate={selectedDate}
              payFilter={payFilter}
              zoneFilter={zoneFilter}
            />
          </div>

          {/* Zone search only (no pay filter UI for drivers) */}
          <div className="mt-4 flex items-center justify-center">
            <ZoneSearchControl
              selectedDate={selectedDate}
              payFilter={payFilter}
              initialZone={zoneFilter}
            />
          </div>
        </div>
      </header>

      <section className="mx-auto mb-20 mt-8 max-w-6xl px-4 sm:px-6">
        {!hasOrders && (
          <p className="mt-10 text-center text-sm text-emerald-300">
            Belum ada order untuk tanggal ini.
          </p>
        )}

        {zones.map((zone) => (
          <section
            key={`${zone.zoneCode}-${zone.zoneName}`}
            className="mb-8 overflow-hidden rounded-3xl border border-emerald-900/70 bg-[#03140e] shadow-[0_0_40px_rgba(0,0,0,0.5)]"
          >
            <h2 className="border-b border-emerald-900 bg-[#041810] px-6 py-4 text-lg font-semibold text-emerald-100">
              ZONE: {zone.zoneName}{' '}
              <span className="text-sm font-normal text-emerald-300">
                ({zone.stats.orderCount} orders — {zone.stats.codCount} COD,{' '}
                {zone.stats.tfCount} TF – Rp {formatRupiah(
                  zone.stats.totalAmount,
                )}
                )
              </span>
            </h2>

            <div className="relative rounded-3xl bg-[#020f0a]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-xs text-emerald-300">
                    <th className="px-5 py-3 text-left">NAMA</th>
                    <th className="px-5 py-3 text-left">ALAMAT</th>
                    <th className="px-5 py-3 text-left">ORDERS</th>
                    <th className="px-5 py-3 text-right">TOTAL</th>
                    <th className="px-5 py-3 text-center">PAY</th>
                    <th className="px-5 py-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {zone.orders.map((order, idx) => (
                    <tr
                      key={`${zone.zoneCode}-${idx}`}
                      className="border-t border-emerald-900/50"
                    >
                      <td className="px-5 py-4 align-top text-sm font-medium text-emerald-50">
                        {order.customer_name ?? 'Customer'}
                      </td>
                      <td className="px-5 py-4 align-top text-sm text-emerald-200">
                        {order.address_text}
                      </td>
                      <td className="px-5 py-4 align-top text-sm text-emerald-100">
                        {order.order_items_text ?? ''}
                      </td>
                      <td className="px-5 py-4 align-top text-right text-sm text-emerald-100">
                        Rp {formatRupiah(order.grand_total ?? 0)}
                      </td>
                      <td className="px-5 py-4 align-top text-center text-xs font-semibold tracking-wide">
                        {order.payment_method ?? '-'}
                      </td>
                      <td className="px-5 py-4 align-top text-center text-xs font-semibold tracking-wide">
                        {displayStatus(order.order_status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
