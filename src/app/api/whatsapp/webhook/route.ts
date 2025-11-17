// src/app/api/whatsapp/webhook/route.ts
import { NextRequest } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// GET: dipakai Meta sekali saja untuk verifikasi webhook
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    // Kalau token cocok, kirim balik challenge ke Meta
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// POST: semua pesan WhatsApp dari Meta akan masuk ke sini
export async function POST(req: NextRequest) {
  const bodyText = await req.text(); // simpan raw text (nanti bisa dipakai cek signature)
  console.log("Incoming WhatsApp webhook:", bodyText);

  // Untuk sementara cukup balas sukses supaya Meta senang
  return new Response("EVENT_RECEIVED", { status: 200 });
}
