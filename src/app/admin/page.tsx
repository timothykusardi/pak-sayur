// src/app/admin/page.tsx
import supabaseAdmin from '@/lib/supabaseAdmin';
import DatePickerControl from './DatePickerControl';
import StatusCell from './StatusCell';
import ZoneSearchControl from './ZoneSearchControl';

export const dynamic = 'force-dynamic';

type DbStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'ON_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

type PaymentMethod = 'COD' | 'TRANSFER';

type OrderItemDetail = {
  name: string;
  qty: number;
  lineProfit: number;
};

type OrderRow = {
  id: number;
  name: string;
  address: string;
  items: OrderItemDetail[];
  totalQty: number;
  total: number;
  pay: PaymentMethod;
  status: DbStatus;
  zoneId: number | null;
  zoneName: string;
  profit: number;
};

type ZoneSection = {
  zoneName: string;
  codCount: number;
  tfCount: number;
  totalOrders: number;
  totalAmount: number;
  totalProfit: number;
  orders: OrderRow[];
};

function startEndOfDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const next = new Date(d);
  next.setDate(d.getDate() + 1);
  return [d.toISOString(), next.toISOString()] as const;
}

function filterUrl(
  date: string,
  pay: 'ALL' | 'COD' | 'TRANSFER',
  zone: string,
) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (pay !== 'ALL') params.set('pay', pay);
  if (zone) params.set('zone', zone);
  const qs = params.toString();
  return qs ? `/admin?${qs}` : '/admin';
}

function filterBtnClass(active: boolean) {
  const base =
    'rounded-full border px-3 py-1 text-xs transition-colors';
  const activeCls =
    'border-emerald-400 bg-emerald-500/20 text-emerald-50';
  const inactiveCls =
    'border-emerald-700 bg-transparent text-emerald-200 hover:border-emerald-500 hover:text-emerald-50';
  return `${base} ${active ? activeCls : inactiveCls}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  // ---------- 1. Resolve searchParams ----------
  let sp: any = {};
  if (searchParams) {
    sp = await searchParams; // Next 16: can be Promise
  }

  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const selectedDate =
    (typeof sp.date === 'string'
      ? sp.date
      : Array.isArray(sp.date)
      ? sp.date[0]
      : undefined) ?? defaultDate;

  const selectedPayRaw =
    typeof sp.pay === 'string'
      ? sp.pay
      : Array.isArray(sp.pay)
      ? sp.pay[0]
      : undefined;

  const zoneFilterRaw =
    typeof sp.zone === 'string'
      ? sp.zone
      : Array.isArray(sp.zone)
      ? sp.zone[0]
      : undefined;

  const zoneFilter = zoneFilterRaw ?? '';
  const zoneFilterTrimmed = zoneFilter.trim();

  const payFilter: 'ALL' | 'COD' | 'TRANSFER' =
    selectedPayRaw === 'COD' || selectedPayRaw === 'TRANSFER'
      ? selectedPayRaw
      : 'ALL';

  const [startIso, endIso] = startEndOfDate(selectedDate);

  // ---------- 2. Fetch orders ----------
  let orderQuery = supabaseAdmin
    .from('orders')
    .select('*')
    .gte('created_at', startIso)
    .lt('created_at', endIso);

  if (payFilter === 'COD' || payFilter === 'TRANSFER') {
    orderQuery = orderQuery.eq('payment_method', payFilter);
  }

  const { data: orderRows, error: orderErr } = await orderQuery;

  if (orderErr) {
    console.warn('[ADMIN_DASHBOARD] error orders', orderErr);
  }

  const ordersRaw = (orderRows ?? []) as any[];

  // ---------- 3. Fetch zones ----------
  const { data: zoneRows, error: zoneErr } = await supabaseAdmin
    .from('zones')
    .select('id, name');

  if (zoneErr) {
    console.warn('[ADMIN_DASHBOARD] error zones', zoneErr);
  }

  const zoneNameById = new Map<number, string>();
  (zoneRows ?? []).forEach((z: any) => {
    if (typeof z.id === 'number') {
      zoneNameById.set(z.id, z.name ?? 'Unknown');
    }
  });

  // ---------- 4. Fetch order_items + products (with line_profit) ----------
  const orderIds = ordersRaw
    .map((o) => o.id)
    .filter((id) => typeof id === 'number');

  const itemsByOrder = new Map<number, OrderItemDetail[]>();

  if (orderIds.length > 0) {
    const { data: itemRows, error: itemErr } = await supabaseAdmin
      .from('order_items')
      .select('order_id, qty, line_profit, products(name)')
      .in('order_id', orderIds);

    if (itemErr) {
      console.warn('[ADMIN_DASHBOARD] error order_items', itemErr);
    }

    (itemRows ?? []).forEach((row: any) => {
      const oid = row.order_id as number;
      const qty = typeof row.qty === 'number' ? row.qty : 0;
      const lineProfit =
        typeof row.line_profit === 'number' ? row.line_profit : 0;
      const productName =
        row.products?.name ?? row.product_name ?? 'Item';

      if (!itemsByOrder.has(oid)) {
        itemsByOrder.set(oid, []);
      }
      itemsByOrder.get(oid)!.push({ name: productName, qty, lineProfit });
    });
  }

  // ---------- 5. Map to OrderRow ----------
  const orders: OrderRow[] = ordersRaw.map((row) => {
    const zoneId =
      typeof row.zone_id === 'number' ? (row.zone_id as number) : null;

    const items = itemsByOrder.get(row.id) ?? [];
    const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
    const profit = items.reduce((sum, it) => sum + it.lineProfit, 0);

    return {
      id: row.id,
      name:
        row.customer_name ??
        row.customer ??
        row.customer_phone ??
        'Customer',
      address: row.address_text ?? '',
      items,
      totalQty,
      total:
        typeof row.grand_total === 'number'
          ? row.grand_total
          : row.grand_total ?? 0,
      pay: (row.payment_method ?? 'COD') as PaymentMethod,
      status: (row.status ?? 'PENDING') as DbStatus,
      zoneId,
      zoneName: zoneId ? zoneNameById.get(zoneId) ?? 'Unknown' : 'Unknown',
      profit,
    };
  });

  // ---------- 6. Group by zone ----------
  const zoneMap = new Map<string, ZoneSection>();

  for (const o of orders) {
    const key = o.zoneName;
    if (!zoneMap.has(key)) {
      zoneMap.set(key, {
        zoneName: key,
        codCount: 0,
        tfCount: 0,
        totalOrders: 0,
        totalAmount: 0,
        totalProfit: 0,
        orders: [],
      });
    }
    const z = zoneMap.get(key)!;
    z.totalOrders += 1;
    z.totalAmount += o.total;
    z.totalProfit += o.profit;
    if (o.pay === 'COD') z.codCount += 1;
    else z.tfCount += 1;
    z.orders.push(o);
  }

  const zonesArray = Array.from(zoneMap.values()).sort((a, b) =>
    a.zoneName.localeCompare(b.zoneName),
  );

  const zonesToShow =
    zoneFilterTrimmed.length > 0
      ? zonesArray.filter((z) =>
          z.zoneName
            .toLowerCase()
            .includes(zoneFilterTrimmed.toLowerCase()),
        )
      : zonesArray;

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  // ---------- 7. Render ----------
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
              ORDERS LIST
            </h1>

            {/* Date + calendar icon */}
            <div className="flex items-center gap-3 text-sm text-emerald-300/80">
              <span>[ {formattedDate} ]</span>
              <DatePickerControl
                selectedDate={selectedDate}
                payFilter={payFilter}
                zoneFilter={zoneFilterTrimmed}
              />
            </div>

            {/* Filter COD / TF */}
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="text-emerald-300/80">
                Payment Method:
              </span>
              <a
                href={filterUrl(selectedDate, 'ALL', zoneFilterTrimmed)}
                className={filterBtnClass(payFilter === 'ALL')}
              >
                All
              </a>
              <a
                href={filterUrl(selectedDate, 'COD', zoneFilterTrimmed)}
                className={filterBtnClass(payFilter === 'COD')}
              >
                COD
              </a>
              <a
                href={filterUrl(
                  selectedDate,
                  'TRANSFER',
                  zoneFilterTrimmed,
                )}
                className={filterBtnClass(payFilter === 'TRANSFER')}
              >
                TF
              </a>
            </div>
          </div>
        </section>

        {/* Zone search bar (top-right, area you circled) */}
        <div className="mb-4 flex items-center justify-end">
          <ZoneSearchControl
            selectedDate={selectedDate}
            payFilter={payFilter}
            initialZone={zoneFilterTrimmed}
          />
        </div>

        {zonesToShow.length === 0 && (
          <p className="mt-4 text-center text-sm text-emerald-200/80">
            {orders.length === 0
              ? 'Belum ada order untuk tanggal ini.'
              : 'Tidak ada zone yang cocok dengan pencarian.'}
          </p>
        )}

        {zonesToShow.map((zone) => (
          <section
            key={zone.zoneName}
            className="mb-8 overflow-visible"
          >
            <h2 className="mb-4 text-sm text-emerald-100/90">
              <span className="text-3xl font-semibold">
                ZONE: {zone.zoneName}
              </span>{' '}
              <span className="text-sm font-medium text-emerald-200/90">
                ({zone.totalOrders} orders — {zone.codCount} COD,{' '}
                {zone.tfCount} TF – Rp{' '}
                {zone.totalAmount.toLocaleString('id-ID')} – Profit Rp{' '}
                {zone.totalProfit.toLocaleString('id-ID')})
              </span>
            </h2>

            <div className="relative rounded-2xl border border-[#23412d] bg-[#06170f] overflow-visible">
              <table className="w-full border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-[#1a3322] text-xs font-semibold uppercase tracking-wide text-emerald-100/80">
                    <th className="px-6 py-3 text-left">Nama</th>
                    <th className="px-3 py-3 text-left">Alamat</th>
                    <th className="px-3 py-3 text-left">Orders</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-center">Pay</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {zone.orders.map((o) => {
                    const itemsSummary =
                      o.items.length > 0
                        ? o.items
                            .map((it) => `${it.name} x${it.qty}`)
                            .join(', ')
                        : `${o.totalQty} item`;

                    return (
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
                        <td className="px-3 py-4 text-sm text-emerald-100/90">
                          {itemsSummary}
                        </td>
                        <td className="px-4 py-4 text-right">
                          Rp {o.total.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-4 text-center font-medium">
                          {o.pay}
                        </td>
                        <td className="px-3 py-4 text-center text-sm">
                          <StatusCell
                            orderId={o.id}
                            initialStatus={o.status}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
