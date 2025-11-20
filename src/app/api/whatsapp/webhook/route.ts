// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ============ ENV CONFIG ============

// WhatsApp (sudah kamu set di Vercel)
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// Supabase (baru kamu tambah)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
  console.warn(
    '[WhatsApp] ENV vars missing. Please set WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID',
  );
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[Supabase] ENV vars missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============ HELPERS – WHATSAPP ============

async function sendWhatsAppText(to: string, body: string) {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('[WhatsApp] Failed to send text', await res.text());
  }
}

async function sendWhatsAppMenuButtons(to: string) {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'Halo kak 👋\nSilakan pilih menu di bawah ini:',
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'ORDER_SAYUR',
              title: '🛒 Order sayur',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'LIHAT_MENU',
              title: '📋 Lihat menu hari ini',
            },
          },
        ],
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('[WhatsApp] Failed to send menu', await res.text());
  }
}

// ============ HELPER – TEST ORDER SUPABASE ============

type TestOrderPayload = {
  waPhone: string; // 6281xxxx
  waName?: string;
  originalText?: string;
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

  const qty = 2; // karena TEST BAYAM 2
  const unitPrice = product.price as number;
  const lineTotal = qty * unitPrice;
  const subtotal = lineTotal;
  const deliveryFee = 0;
  const discountTotal = 0;
  const grandTotal = subtotal + deliveryFee - discountTotal;

  // 3) Insert ke orders (schema dari Ryo)
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

// ============ GET – VERIFICATION ============

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    return new Response(challenge ?? '', { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

// ============ POST – HANDLE MESSAGES ============

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[WhatsApp] Webhook body:', JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const messages = value?.messages;
    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'no-messages' }, { status: 200 });
    }

    const msg = messages[0];
    const from = msg.from as string; // nomor WA 628...
    const type = msg.type as string;
    const contactName: string | undefined =
      value?.contacts?.[0]?.profile?.name;

    let textBody: string = '';

    if (type === 'text') {
      textBody = (msg.text?.body ?? '').trim();
    } else if (type === 'button') {
      textBody = (msg.button?.text ?? '').trim();
    } else if (type === 'interactive') {
      const iid = msg.interactive?.button_reply?.id;
      textBody = iid ?? '';
    }

    // ========== BRANCH 1: TEST ORDER ==========
    if (textBody.toUpperCase() === 'TEST BAYAM 2') {
      try {
        const result = await createTestOrderInSupabase({
          waPhone: from,
          waName: contactName,
          originalText: textBody,
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
      } catch (e: any) {
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

    // ========== BRANCH 2: MENU BUTTONS / TEXT BIASA ==========

    // Kalau user pilih tombol pertama
    if (textBody === 'ORDER_SAYUR') {
      await sendWhatsAppText(
        from,
        'Kak, silakan tulis order kakak (contoh: "bayam 2 ikat, kangkung 1 ikat, alamat di Graha Family blok SS 5").\n\nUntuk sementara, kami masih proses manual ya 🙏',
      );
      return NextResponse.json({ status: 'ok-order-prompt' }, { status: 200 });
    }

    if (textBody === 'LIHAT_MENU') {
      await sendWhatsAppText(
        from,
        'Menu hari ini masih dummy ya kak. Nanti kalau sudah tersambung ke katalog, tombol ini akan kirim daftar sayur otomatis 🥬',
      );
      return NextResponse.json(
        { status: 'ok-menu-placeholder' },
        { status: 200 },
      );
    }

    // Kalau pesan text biasa → kirim balasan simple + menu
    if (type === 'text') {
      await sendWhatsAppText(
        from,
        `Halo ${contactName ?? 'kak'} 👋\nPesan kakak: "${textBody}".\n\nUntuk mulai, kakak bisa ketik *TEST BAYAM 2* (test order ke sistem), atau tekan tombol di bawah ini.`,
      );
      await sendWhatsAppMenuButtons(from);

      return NextResponse.json(
        { status: 'ok-fallback-text' },
        { status: 200 },
      );
    }

    // Tipe pesan lain (gambar, audio, dsb) → kirim menu
    await sendWhatsAppMenuButtons(from);
    return NextResponse.json({ status: 'ok-other-type' }, { status: 200 });
  } catch (err) {
    console.error('[WhatsApp] Webhook error', err);
    return NextResponse.json({ status: 'error-but-ack' }, { status: 200 });
  }
}
