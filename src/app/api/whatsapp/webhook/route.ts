const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// Helper: send a WhatsApp text message via Cloud API
async function sendWhatsAppText(to: string, text: string) {
  const url = `https://graph.facebook.com/v24.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      text: { body: text },
    }),
  });
}

// GET: webhook verification (Meta calls this once when you set the URL)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

// POST: handle incoming messages
export async function POST(req: Request) {
  const body = await req.json();
  console.log('Incoming WhatsApp webhook:', JSON.stringify(body, null, 2));

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages;
  const msg = messages?.[0];

  if (msg && msg.type === 'text') {
    const from = msg.from;           // e.g. "6281235601915"
    const text = msg.text?.body;     // user message text

    console.log('From:', from, 'Text:', text);

    await sendWhatsAppText(
      from,
      'Halo kak 👋 Ini Pak Sayur Bot. Sistem lagi dibangun, nanti semua order sayur bisa lewat bot ini ya 🌿'
    );
  }

  return new Response('OK', { status: 200 });
}
