// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ==== ENV CONFIG ====
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
  console.warn(
    '[WhatsApp] ENV vars missing. Please set WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID'
  );
}

/* ===================== Types & Parser Manual Order ===================== */

// Tambah varian typo di sini kalau perlu
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

    // lanjutan alamat
    if (section === 'address') {
      addressLines.push(line);
    }
    // lanjutan order
    else if (section === 'order') {
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
    console.error('[WhatsApp] sendWhatsAppMenuButtons error', res.status, errText);
  }
}

async function handleMenuSelection(
  from: string,
  choice: 'catalog' | 'manual' | 'cs'
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
      ].join('\n')
    );
  } else if (choice === 'manual') {
    await sendWhatsAppText(
      from,
      [
        'Oke kak, *order ketik manual* ✍️',
        '',
        'Kirim dengan format (boleh huruf kecil / besar, boleh typo dikit):',
        'nama: ... (atau nm / nma)',
        'alamat: ... (atau almt / almat / alamt / alt)',
        'order: ... (atau ordr / odr)',
        '',
        'Contoh:',
        'nm: Budi',
        'almt graha family blok A2 no 5',
        'odr: Bayam x2 wortel 1',
      ].join('\n')
    );
  } else if (choice === 'cs') {
    await sendWhatsAppText(
      from,
      'Kalau mau chat langsung dengan CS manusia 👩‍🍳, klik: https://wa.me/6285190653341'
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
      const lowerFull = text.toLowerCase();

      // Deteksi manual order kalau ada salah satu varian nama + alamat + order
      const hasName = NAME_KEYS.some((k) => lowerFull.includes(k));
      const hasAddr = ADDRESS_KEYS.some((k) => lowerFull.includes(k));
      const hasOrder = ORDER_KEYS.some((k) => lowerFull.includes(k));

      if (hasName && hasAddr && hasOrder) {
        const parsed = parseManualOrderText(from, text);
        console.log(
          '[PakSayur] Manual order candidate:',
          JSON.stringify(parsed, null, 2)
        );
        await sendWhatsAppText(from, formatManualOrderConfirmation(parsed));
        return NextResponse.json(
          { status: 'ok-manual-order' },
          { status: 200 }
        );
      }

      const t = text.toLowerCase().trim();

      if (t === 'menu' || t === 'start' || t === 'halo') {
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

      await sendWhatsAppMenuButtons(from);
      return NextResponse.json(
        { status: 'ok-fallback-text' },
        { status: 200 }
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
