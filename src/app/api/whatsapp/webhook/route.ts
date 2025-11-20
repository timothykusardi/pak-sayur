// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/* ======================= ENV CONFIG ======================= */

// WhatsApp
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
  console.warn(
    '[WhatsApp] ENV vars missing. Please set WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID',
  );
}

// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[Supabase] ENV vars missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ====== STATE SEDERHANA UNTUK SIMPAN DRAFT MANUAL PER NOMOR ====== */

type ManualOrderItem = {
  raw: string;
};

type ManualOrderPayload = {
  customer_phone: string;
  raw_text: string;
  name?: string;
  address?: string;
  items: ManualOrderItem[];
};

type ParsedItem = {
  raw: string;
  aliasText: string;
  qty: number;
};

type ResolvedItem = {
  raw: string;
  aliasText: string;
  productId: number;
  productName: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
};

type ManualOrderState = {
  parsed: ManualOrderPayload;
  resolvedItems: ResolvedItem[];
};

// map: nomor WA (628xx) -> draft manual terakhir (parsed + resolved)
const lastManualOrders: Record<string, ManualOrderState> = {};

/* ===================== Parser Manual Order ===================== */

// Kata kunci + typo yang masih diterima parser
const NAME_KEYS = ['nama', 'nm', 'nma'];
const ADDRESS_KEYS = ['alamat', 'almt', 'almat', 'alamt', 'alt', 'alm'];
const ORDER_KEYS = ['order', 'ordr', 'odr', 'oder'];

// Payload yang nanti bisa dikirim ke backend lain (kalau mau)
type OrderDraftPayload = {
  source_channel: 'whatsapp';
  wa_phone: string;
  customer_name?: string;
  address_text?: string;
  manual_raw_text: string;
  items_raw: string[];
};

function matchKeyword(line: string, keywords: string[]): string | null {
  const lower = line.toLowerCase().trimStart();
  for (const k of keywords) {
    if (lower.startsWith(k)) {
      return k;
    }
  }
  return null;
}

function extractAfterKeyword(line: string, keyword: string): string {
  const lower = line.toLowerCase();
  const idx = lower.indexOf(keyword);
  if (idx < 0) return '';
  let rest = line.slice(idx + keyword.length);
  // buang spasi / titik dua / dash setelah keyword
  rest = rest.replace(/^[\s:.-]+/, '');
  return rest.trim();
}

function parseManualOrderText(from: string, text: string): ManualOrderPayload {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let section: 'none' | 'name' | 'address' | 'order' = 'none';
  let name = '';
  const addressLines: string[] = [];
  const items: ManualOrderItem[] = [];

  for (const line of lines) {
    const nameKey = matchKeyword(line, NAME_KEYS);
    const addrKey = matchKeyword(line, ADDRESS_KEYS);
    const orderKey = matchKeyword(line, ORDER_KEYS);

    if (nameKey) {
      name = extractAfterKeyword(line, nameKey);
      section = 'name';
      continue;
    }

    if (addrKey) {
      const val = extractAfterKeyword(line, addrKey);
      if (val) addressLines.push(val);
      section = 'address';
      continue;
    }

    if (orderKey) {
      const val = extractAfterKeyword(line, orderKey);
      if (val) items.push({ raw: val });
      section = 'order';
      continue;
    }

    if (section === 'address') {
      addressLines.push(line);
    } else if (section === 'order') {
      const cleaned = line.replace(/^[-•\s]+/, '').trim();
      if (cleaned) items.push({ raw: cleaned });
    }
  }

  return {
    customer_phone: from,
    raw_text: text,
    name: name || undefined,
    address: addressLines.join(' ').trim() || undefined,
    items,
  };
}

function buildOrderDraft(parsed: ManualOrderPayload): OrderDraftPayload {
  return {
    source_channel: 'whatsapp',
    wa_phone: parsed.customer_phone,
    customer_name: parsed.name,
    address_text: parsed.address,
    manual_raw_text: parsed.raw_text,
    items_raw: parsed.items.map((i) => i.raw),
  };
}

function formatManualOrderConfirmation(order: ManualOrderPayload): string {
  const name = order.name || '(belum diisi)';
  const address = order.address || '(belum diisi)';
  const itemsText = order.items.length
    ? order.items.map((i) => `- ${i.raw}`).join('\n')
    : '- (belum ada item)';

  return [
    'Terima kasih kak, berikut ringkasan order kakak 👇',
    '',
    `Nama: ${name}`,
    `Alamat: ${address}`,
    '',
    'Order:',
    itemsText,
    '',
    'Kalau sudah benar, balas: *OK* ya kak 🙏',
    'Kalau mau revisi, silakan kirim ulang format NAMA / ALAMAT / ORDER.',
  ].join('\n');
}

/* ===== Helper: parsing 1 baris item → aliasText + qty ===== */

const UNIT_WORDS = [
  'x',
  'pcs',
  'pc',
  'ikat',
  'kg',
  'gr',
  'g',
  'ons',
  'buah',
  'btg',
  'batang',
  'bks',
  'bungkus',
  'pack',
  'pak',
  'sachet',
];

function parseItemLine(raw: string): ParsedItem | null {
  const lower = raw.toLowerCase();

  // cari angka pertama di string (bisa 2, 2.5, 2,5)
  const numMatch = lower.match(/(\d+(?:[.,]\d+)?)/);
  let qty = 1;

  if (numMatch) {
    qty = Number(numMatch[1].replace(',', '.'));
    if (Number.isNaN(qty) || qty <= 0) {
      return null;
    }
  }

  // buang angka & unit word untuk dapat aliasText kira-kira
  const tokens = lower.split(/\s+/).filter((tok) => {
    const cleaned = tok.replace(/[.,]/g, '');
    if (!cleaned) return false;
    if (!Number.isNaN(Number(cleaned))) return false; // angka
    if (UNIT_WORDS.includes(cleaned)) return false;
    return true;
  });

  if (tokens.length === 0) {
    return null;
  }

  const aliasText = tokens.join(' ').trim(); // contoh: "bayam", "sayur bayam"

  return {
    raw,
    aliasText,
    qty,
  };
}

/* ===== Helper: resolve items ke product_aliases + products ===== */

type ResolveResult =
  | {
      ok: true;
      state: ManualOrderState;
    }
  | {
      ok: false;
      errors: string[];
    };

async function resolveManualOrder(
  parsed: ManualOrderPayload,
): Promise<ResolveResult> {
  if (parsed.items.length === 0) {
    return { ok: false, errors: ['Belum ada item di bagian ORDER.'] };
  }

  const parsedItems: ParsedItem[] = [];
  const errors: string[] = [];

  for (const item of parsed.items) {
    const p = parseItemLine(item.raw);
    if (!p) {
      errors.push(`Item tidak terbaca: "${item.raw}"`);
      continue;
    }
    parsedItems.push(p);
  }

  if (parsedItems.length === 0) {
    errors.push('Tidak ada item valid di ORDER.');
    return { ok: false, errors };
  }

  const uniqueAliases = Array.from(
    new Set(parsedItems.map((i) => i.aliasText.trim().toLowerCase())),
  );

  const { data: aliasRows, error: aliasErr } = await supabase
    .from('product_aliases')
    .select('alias, product_id, products(id, name, price)')
    .in('alias', uniqueAliases);

  if (aliasErr) {
    console.error('[Supabase] error reading product_aliases', aliasErr);
    throw aliasErr;
  }

  const aliasMap = new Map<
    string,
    { product_id: number; product_name: string; price: number }
  >();

  (aliasRows ?? []).forEach((row: any) => {
    const key = String(row.alias).toLowerCase();
    const prod = row.products;
    if (!prod) return;
    aliasMap.set(key, {
      product_id: prod.id,
      product_name: prod.name,
      price: prod.price,
    });
  });

  const resolvedItems: ResolvedItem[] = [];

  for (const item of parsedItems) {
    const key = item.aliasText.toLowerCase();

    const aliasInfo = aliasMap.get(key);
    if (!aliasInfo) {
      errors.push(
        `Item "${item.raw}" tidak ditemukan di daftar product_aliases (alias: "${item.aliasText}").`,
      );
      continue;
    }

    const lineTotal = item.qty * aliasInfo.price;

    resolvedItems.push({
      raw: item.raw,
      aliasText: item.aliasText,
      productId: aliasInfo.product_id,
      productName: aliasInfo.product_name,
      unitPrice: aliasInfo.price,
      qty: item.qty,
      lineTotal,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (resolvedItems.length === 0) {
    return {
      ok: false,
      errors: [
        'Semua item gagal di-resolve. Cek lagi penulisan nama sayur dan jumlahnya ya kak 🙏',
      ],
    };
  }

  const state: ManualOrderState = {
    parsed,
    resolvedItems,
  };

  return { ok: true, state };
}

/* ====================== TEST ORDER (PS-BAYAM) ======================== */

type TestOrderPayload = {
  waPhone: string; // 6281xxxx
  waName?: string;
  originalText?: string;
  qty?: number; // qty dinamis, default 2
};

async function createTestOrderInSupabase(payload: TestOrderPayload) {
  const { waPhone, waName } = payload;

  // 1) Cari / buat customer
  let customerId: number;

  {
    const { data: existing, error: findErr } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', waPhone)
      .maybeSingle();

    if (findErr) {
      console.error('[Supabase] find customer error', findErr);
    }

    if (existing?.id) {
      customerId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('customers')
        .insert({
          phone: waPhone,
          name: waName ?? null,
          default_zone_id: null,
          address_text: null,
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        throw new Error('Failed to insert customer: ' + insertErr?.message);
      }

      customerId = inserted.id;
    }
  }

  // 2) Ambil produk PS-BAYAM
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('sku', 'PS-BAYAM')
    .single();

  if (prodErr || !product) {
    throw new Error('Product PS-BAYAM not found: ' + prodErr?.message);
  }

  const qty = payload.qty && payload.qty > 0 ? payload.qty : 2;
  const unitPrice = product.price as number;
  const lineTotal = qty * unitPrice;
  const subtotal = lineTotal;
  const deliveryFee = 0;
  const discountTotal = 0;
  const grandTotal = subtotal + deliveryFee - discountTotal;

  // 3) Insert ke orders
  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'PENDING', // order_status enum
      source_channel: 'whatsapp',
      address_text: '(TEST ORDER – belum ada alamat)',
      zone_id: null,
      subtotal,
      delivery_fee: deliveryFee,
      discount_total: discountTotal,
      grand_total: grandTotal,
      payment_method: 'COD', // payment_method_enum
    })
    .select('id')
    .single();

  if (orderErr || !orderRow) {
    throw new Error('Failed to insert order: ' + orderErr?.message);
  }

  const orderId = orderRow.id;

  // 4) Insert ke order_items
  const { error: itemsErr } = await supabase.from('order_items').insert({
    order_id: orderId,
    product_id: product.id,
    qty,
    unit_price: unitPrice,
    line_total: lineTotal,
  });

  if (itemsErr) {
    throw new Error('Failed to insert order_items: ' + itemsErr.message);
  }

  // 5) Insert ke payments
  const { error: payErr } = await supabase.from('payments').insert({
    order_id: orderId,
    method: 'COD',
    status: 'PENDING', // payment_status_enum
    amount: grandTotal,
  });

  if (payErr) {
    throw new Error('Failed to insert payment: ' + payErr.message);
  }

  return {
    orderId,
    subtotal,
    grandTotal,
    productName: product.name,
    qty,
  };
}

/* ====== CREATE ORDER BENERAN DARI MANUAL (multi-item) ====== */

async function createOrderFromResolvedManual(
  waPhone: string,
  waName: string | undefined,
  state: ManualOrderState,
) {
  const { parsed, resolvedItems } = state;

  if (!resolvedItems || resolvedItems.length === 0) {
    throw new Error('No resolved items in manual order state');
  }

  // 1) Cari / buat customer
  let customerId: number;

  {
    const { data: existing, error: findErr } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', waPhone)
      .maybeSingle();

    if (findErr) {
      console.error('[Supabase] find customer error', findErr);
    }

    if (existing?.id) {
      customerId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('customers')
        .insert({
          phone: waPhone,
          name: waName ?? parsed.name ?? null,
          default_zone_id: null,
          address_text: parsed.address ?? null,
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        throw new Error('Failed to insert customer: ' + insertErr?.message);
      }

      customerId = inserted.id;
    }
  }

  // 2) Hitung total
  const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = 0; // TODO: nanti isi pakai logic zone
  const discountTotal = 0;
  const grandTotal = subtotal + deliveryFee - discountTotal;

  // 3) Insert ke orders
  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'PENDING', // setelah OK, kita anggap PENDING/CONFIRMED
      source_channel: 'whatsapp',
      address_text: parsed.address ?? '(alamat belum lengkap)',
      zone_id: null, // TODO: nanti diisi setelah ada logic zones
      subtotal,
      delivery_fee: deliveryFee,
      discount_total: discountTotal,
      grand_total: grandTotal,
      payment_method: 'COD', // sementara default COD
    })
    .select('id')
    .single();

  if (orderErr || !orderRow) {
    throw new Error('Failed to insert order: ' + orderErr?.message);
  }

  const orderId = orderRow.id;

  // 4) Insert banyak order_items sekaligus
  const itemsPayload = resolvedItems.map((item) => ({
    order_id: orderId,
    product_id: item.productId,
    qty: item.qty,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
  }));

  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(itemsPayload);

  if (itemsErr) {
    throw new Error('Failed to insert order_items: ' + itemsErr.message);
  }

  // 5) Insert payments
  const { error: payErr } = await supabase.from('payments').insert({
    order_id: orderId,
    method: 'COD',
    status: 'PENDING',
    amount: grandTotal,
  });

  if (payErr) {
    throw new Error('Failed to insert payment: ' + payErr.message);
  }

  return {
    orderId,
    subtotal,
    grandTotal,
    items: resolvedItems,
  };
}

/* ====================== Helpers kirim pesan WA ======================== */

async function sendWhatsAppText(to: string, body: string) {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[WhatsApp] sendWhatsAppText error', res.status, errText);
  }
}

async function sendWhatsAppMenuButtons(to: string) {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: [
            'Halo kak 👋, selamat datang di *Pak Sayur Bot* 🌿',
            '',
            'Silakan pilih salah satu:',
          ].join('\n'),
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: { id: 'order_catalog', title: 'Order katalog' },
            },
            {
              type: 'reply',
              reply: { id: 'order_manual', title: 'Order manual' },
            },
            {
              type: 'reply',
              reply: { id: 'chat_cs', title: 'Chat CS' },
            },
          ],
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(
      '[WhatsApp] sendWhatsAppMenuButtons error',
      res.status,
      errText,
    );
  }
}

async function handleMenuSelection(
  from: string,
  choice: 'catalog' | 'manual' | 'cs',
) {
  if (choice === 'catalog') {
    await sendWhatsAppText(
      from,
      [
        'Oke kak, untuk *order lewat katalog* 📖',
        '',
        'Saat ini katalog masih versi awal.',
        'Ketik saja dulu daftar sayur yang mau dibeli, contoh:',
        '',
        '- Bayam 2 ikat',
        '- Brokoli 1',
        '',
        'Ke depan akan ada link katalog interaktif ya 🌿',
      ].join('\n'),
    );
  } else if (choice === 'manual') {
    await sendWhatsAppText(
      from,
      [
        'Oke kak, *order ketik manual* ✍️',
        '',
        'Kirim dengan format:',
        'NAMA:',
        'ALAMAT LENGKAP:',
        'ORDER:',
        '- Bayam 2 ikat',
        '- Wortel 500gr',
        '',
        'Contoh:',
        'NAMA: Budi',
        'ALAMAT: Graha Family, Jl. XYZ No. 10',
        'ORDER:',
        '- Bayam 2 ikat',
        '- Brokoli 1',
      ].join('\n'),
    );
  } else if (choice === 'cs') {
    await sendWhatsAppText(
      from,
      'Kalau mau chat langsung dengan CS manusia 👩‍🍳, klik: https://wa.me/6285190653341',
    );
  }
}

/* ============================ GET: verify ============================= */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

/* ============================ POST: webhook =========================== */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ status: 'no-message' }, { status: 200 });
    }

    const from = message.from as string;
    const contactName: string | undefined =
      value?.contacts?.[0]?.profile?.name;

    // 1) Interactive buttons
    if (
      message.type === 'interactive' &&
      message.interactive?.type === 'button_reply'
    ) {
      const reply = message.interactive.button_reply;
      const id = reply.id as string;

      if (id === 'order_catalog') {
        await handleMenuSelection(from, 'catalog');
      } else if (id === 'order_manual') {
        await handleMenuSelection(from, 'manual');
      } else if (id === 'chat_cs') {
        await handleMenuSelection(from, 'cs');
      }

      return NextResponse.json({ status: 'ok-button' }, { status: 200 });
    }

    // 2) Text messages
    if (message.type === 'text') {
      const text = (message.text?.body || '') as string;
      const trimmed = text.trim();
      const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');

      console.log('[DEBUG] incoming text', {
        from,
        text,
        trimmed,
        normalized,
      });

      /* ----- BRANCH: TEST BAYAM N (langsung buat order TEST PS-BAYAM) ----- */

      const testMatch = normalized.match(/^(tes|test) bayam(?:\s+(\d+))?$/);

      if (testMatch) {
        const qty =
          testMatch[2] && !Number.isNaN(Number(testMatch[2]))
            ? Number(testMatch[2])
            : 2;

        try {
          const result = await createTestOrderInSupabase({
            waPhone: from,
            waName: contactName,
            originalText: trimmed,
            qty,
          });

          await sendWhatsAppText(
            from,
            [
              '✅ Order TEST (PS-BAYAM) berhasil dibuat di sistem.',
              '',
              `ID Order : ${result.orderId}`,
              `Item     : ${result.productName} x ${result.qty}`,
              `Total    : Rp ${result.grandTotal.toLocaleString('id-ID')}`,
              '',
              'Ini hanya order TEST internal, tidak akan dikirim ya kak 🙏',
            ].join('\n'),
          );

          return NextResponse.json(
            { status: 'ok-test-order' },
            { status: 200 },
          );
        } catch (e) {
          console.error('[TEST_ORDER] Error', e);
          await sendWhatsAppText(
            from,
            'Maaf kak, terjadi error saat membuat order TEST. Nanti admin cek dulu ya 🙏',
          );
          return NextResponse.json(
            { status: 'error-test-order' },
            { status: 200 },
          );
        }
      }

      /* ----- BRANCH: ORDER MANUAL (NAMA / ALAMAT / ORDER) ----- */

      const lowerFull = text.toLowerCase();
      const hasName = NAME_KEYS.some((k) => lowerFull.includes(k));
      const hasAddr = ADDRESS_KEYS.some((k) => lowerFull.includes(k));
      const hasOrder = ORDER_KEYS.some((k) => lowerFull.includes(k));

      if (hasName && hasAddr && hasOrder) {
        const parsed = parseManualOrderText(from, text);
        const draft = buildOrderDraft(parsed);

        console.log(
          '[PakSayur] OrderDraftPayload (raw):',
          JSON.stringify(draft, null, 2),
        );

        // resolve ke product_aliases + products
        const resolution = await resolveManualOrder(parsed);

        if (!resolution.ok) {
          const msg = [
            'Maaf kak, ada beberapa masalah saat membaca order kakak:',
            '',
            ...resolution.errors.map((e) => `- ${e}`),
            '',
            'Silakan revisi ORDER dan kirim ulang format NAMA / ALAMAT / ORDER ya kak 🙏',
          ].join('\n');

          await sendWhatsAppText(from, msg);

          return NextResponse.json(
            { status: 'manual-order-resolve-error', errors: resolution.errors },
            { status: 200 },
          );
        }

        // simpan draft resolved di memory
        lastManualOrders[from] = resolution.state;

        await sendWhatsAppText(from, formatManualOrderConfirmation(parsed));
        return NextResponse.json(
          { status: 'ok-manual-order-resolved' },
          { status: 200 },
        );
      }

      /* ----- BRANCH: USER BALAS "OK" SETELAH RINGKASAN ----- */

      if (normalized === 'ok' || normalized === 'ok kak') {
        const state = lastManualOrders[from];

        if (!state || !state.resolvedItems || state.resolvedItems.length === 0) {
          await sendWhatsAppText(
            from,
            'Maaf kak, belum ada order manual yang bisa dikonfirmasi. Silakan kirim dulu format NAMA / ALAMAT / ORDER ya 🙏',
          );
          return NextResponse.json(
            { status: 'ok-no-draft' },
            { status: 200 },
          );
        }

        try {
          const result = await createOrderFromResolvedManual(
            from,
            contactName,
            state,
          );

          const itemsText = result.items
            .map(
              (i) =>
                `- ${i.productName} x ${i.qty}  (Rp ${i.lineTotal.toLocaleString(
                  'id-ID',
                )})`,
            )
            .join('\n');

          await sendWhatsAppText(
            from,
            [
              '✅ Order berhasil dibuat di sistem.',
              '',
              `ID Order : ${result.orderId}`,
              '',
              'Item:',
              itemsText,
              '',
              `Total : Rp ${result.grandTotal.toLocaleString('id-ID')}`,
              '',
              'Terima kasih kak 🙏',
            ].join('\n'),
          );

          return NextResponse.json(
            { status: 'ok-order-from-ok', orderId: result.orderId },
            { status: 200 },
          );
        } catch (e) {
          console.error('[ORDER_FROM_OK] Error', e);
          await sendWhatsAppText(
            from,
            'Maaf kak, terjadi error saat membuat order dari balasan OK. Nanti admin cek dulu ya 🙏',
          );
          return NextResponse.json(
            { status: 'error-order-from-ok' },
            { status: 200 },
          );
        }
      }

      /* ----- BRANCH: keyword menu / angka 1-3 ----- */

      const t = trimmed.toLowerCase();

      if (t === 'menu' || t === 'start' || t === 'halo' || t === 'helo') {
        await sendWhatsAppMenuButtons(from);
        return NextResponse.json({ status: 'ok-menu' }, { status: 200 });
      }

      if (t === '1') {
        await handleMenuSelection(from, 'catalog');
        return NextResponse.json({ status: 'ok-1' }, { status: 200 });
      }
      if (t === '2') {
        await handleMenuSelection(from, 'manual');
        return NextResponse.json({ status: 'ok-2' }, { status: 200 });
      }
      if (t === '3') {
        await handleMenuSelection(from, 'cs');
        return NextResponse.json({ status: 'ok-3' }, { status: 200 });
      }

      // fallback text → kirim menu lagi
      await sendWhatsAppMenuButtons(from);
      return NextResponse.json(
        { status: 'ok-fallback-text' },
        { status: 200 },
      );
    }

    // 3) Tipe pesan lain (gambar, audio, dll) → kirim menu
    await sendWhatsAppMenuButtons(from);
    return NextResponse.json({ status: 'ok-other-type' }, { status: 200 });
  } catch (err) {
    console.error('[WhatsApp] Webhook error', err);
    return NextResponse.json({ status: 'error-but-ack' }, { status: 200 });
  }
}
