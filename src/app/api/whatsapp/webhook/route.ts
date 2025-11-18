import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

/* ========================= Helper kirim WhatsApp ========================= */

async function sendWhatsAppText(to: string, body: string) {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  await fetch(url, {
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
}

/* ========================= GET = verifikasi webhook ====================== */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    // Meta verify OK
    return new NextResponse(challenge ?? '', { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

/* ========================= Teks menu ====================== */

const WELCOME_MENU = [
  'Halo kak 👋, selamat datang di *Pak Sayur Bot* 🌿',
  '',
  'Balas dengan angka:',
  '1️⃣ Order lewat katalog',
  '2️⃣ Order ketik manual',
  '3️⃣ Chat ke CS (0851-9065-3341)',
].join('\n');

/* ========================= POST = handle chat ============================ */

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Safety: kalau bukan event WA, langsung ignore
  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  // Tidak ada message (misal cuma status delivery) → abaikan
  if (!message || message.type !== 'text') {
    return NextResponse.json({ status: 'no-text' }, { status: 200 });
  }

  const from = message.from as string;        // nomor pengirim (62…)
  const text = (message.text?.body || '') as string;

  const t = text.toLowerCase().trim();

  // ========== Routing logika sederhana ==========

  if (t === 'menu' || t === 'start' || t === 'halo') {
    await sendWhatsAppText(from, WELCOME_MENU);

  } else if (t === '1') {
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
        'Nanti ke depan kita kirim link katalog interaktif ya 🌿',
      ].join('\n')
    );

  } else if (t === '2') {
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
      ].join('\n')
    );

  } else if (t === '3') {
    await sendWhatsAppText(
      from,
      'Kalau mau chat langsung dengan CS manusia 👩‍🍳, klik: https://wa.me/6285190653341'
    );

  } else {
    // Fallback kalau user ngaco / pertama kali chat
    await sendWhatsAppText(
      from,
      [
        'Halo kak 👋',
        'Ketik *menu* untuk melihat pilihan di Pak Sayur Bot 🌿',
      ].join('\n')
    );
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
