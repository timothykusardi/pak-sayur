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

/* ===================== Types & Parser Manual Order ===================== */

// Kata kunci + typo yang masih diterima parser
const NAME_KEYS = ['nama', 'nm', 'nma'];
const ADDRESS_KEYS = ['alamat', 'almt', 'almat', 'alamt', 'alt', 'alm'];
const ORDER_KEYS = ['order', 'ordr', 'odr', 'oder'];

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

// Payload yang nanti dikirim ke backend / Ryo
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

/* ====================== TEST ORDER (SUPABASE) ======================== */

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
        '- Bayam x2',
        '- Brokoli x1',
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
        '- Bayam x2',
        '- Wortel 500gr',
        '',
        'Contoh:',
        'NAMA: Budi',
        'ALAMAT: Graha Family, Jl. XYZ No. 10',
        'ORDER:',
        '- Bayam x2',
        '- Brokoli x1',
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
        text,
        trimmed,
        normalized,
      });

      /* ----- BRANCH: TEST BAYAM N (langsung buat order TEST) ----- */

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
              '✅ Order TEST berhasil dibuat di sistem.',
              '',
              `ID Order : ${result.orderId}`,
              `Item     : ${result.productName} x ${result.qty}`,
              `Total    : Rp ${result.grandTotal.toLocaleString('id-ID')}`,
              '',
              'Ini hanya order TEST, tidak akan dikirim ya kak 🙏',
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
          '[PakSayur] OrderDraftPayload:',
          JSON.stringify(draft, null, 2),
        );

        // Sekarang hanya kirim ringkasan + instruksi OK
        await sendWhatsAppText(from, formatManualOrderConfirmation(parsed));
        return NextResponse.json(
          { status: 'ok-manual-order' },
          { status: 200 },
        );
      }

      /* ----- BRANCH: USER BALAS "OK" SETELAH RINGKASAN ----- */

      if (normalized === 'ok' || normalized === 'ok kak') {
        // Versi TEST: setiap "OK" → buat 1 order TEST PS-BAYAM x2
        try {
          const result = await createTestOrderInSupabase({
            waPhone: from,
            waName: contactName,
            originalText: trimmed,
            qty: 2, // sementara fix 2; nanti bisa dihubungkan ke parser item
          });

          await sendWhatsAppText(
            from,
            [
              '✅ Order TEST berhasil dibuat di sistem.',
              '',
              `ID Order : ${result.orderId}`,
              `Item     : ${result.productName} x ${result.qty}`,
              `Total    : Rp ${result.grandTotal.toLocaleString('id-ID')}`,
              '',
              'Ini hanya order TEST, tidak akan dikirim ya kak 🙏',
            ].join('\n'),
          );

          return NextResponse.json(
            { status: 'ok-test-order-from-ok' },
            { status: 200 },
          );
        } catch (e) {
          console.error('[TEST_ORDER_OK] Error', e);
          await sendWhatsAppText(
            from,
            'Maaf kak, terjadi error saat membuat order TEST dari balasan OK. Nanti admin cek dulu ya 🙏',
          );
          return NextResponse.json(
            { status: 'error-test-order-from-ok' },
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
