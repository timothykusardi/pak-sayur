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
    'Kalau sudah benar, balas:',
    '- *OK COD* (bayar di tempat), atau',
    '- *OK TRANSFER* (bayar via transfer).',
    '',
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

/* ===== Helper: ZONE RULES (ALIAS / SINGKATAN) ===== */

type ZoneRule = {
  code: string; // harus sama dengan zones.code di DB
  keywords: string[];
};

// Untuk alias / singkatan yang beda dengan nama di DB
const ZONE_RULES: ZoneRule[] = [
  {
    code: 'GRAHA_FAMILI',
    keywords: ['graha famili', 'graha family'],
  },
  {
    code: 'ROYAL_RESIDENCE',
    keywords: ['royal residence', 'royal residen'],
  },
  {
    code: 'DIAN_ISTANA',
    keywords: ['dian istana'],
  },
  {
    code: 'WISATA_BUKIT_MAS',
    keywords: ['wisata bukit mas', 'wbm'],
  },
  {
    code: 'VILLA_BUKIT_MAS',
    keywords: ['villa bukit mas', 'vbm'],
  },
  {
    code: 'GRAHA_NATURA',
    keywords: ['graha natura'],
  },
  {
    code: 'VILLA_BUKIT_REGENCY',
    keywords: ['villa bukit regency', 'vbr'],
  },
  // tambahan dari Codex patch
  {
    code: 'PURI_GALAXY',
    keywords: ['puri galaxy', 'pury galaxy', 'puri galaksi', 'pury galaksi'],
  },
  {
    code: 'GALAXY_BUMI_PERMAI',
    keywords: ['galaxy bumi permai', 'galaxi bumi permai', 'gbp'],
  },
  {
    code: 'KERTAJAYA_INDAH_REGENCY',
    keywords: [
      'kertajaya indah',
      'kertajaya indah regency',
      'kertajaya v1',
      'kertajaya v2',
      'kertajaya v3',
    ],
  },
  {
    code: 'PAKUWON_CITY',
    keywords: ['pakuwon city', 'pc'],
  },
];

type ZoneDetectResult = {
  zoneId: number | null;
  zoneCode: string | null;
  deliveryFeeDb: number | null; // null = free (no fee set)
};

// Row yang diambil dari Supabase.zones (dengan type aman)
type ZoneRow = {
  id: number | null;
  code: string | null;
  name: string | null;
  area_group: string | null;
  delivery_fee: number | null;
};

// Levenshtein distance sederhana untuk fuzzy match
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // delete
        dp[i][j - 1] + 1, // insert
        dp[i - 1][j - 1] + cost, // substitute
      );
    }
  }

  return dp[m][n];
}

// 1 = sama persis, 0 = beda jauh
function normalizedSimilarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(1, Math.max(a.length, b.length));
  return 1 - dist / maxLen;
}

// Normalisasi alamat: lowercase, buang tanda baca, buang kata "jl", "blok" dll
function normalizeAddressText(value: string): string {
  let normalized = value.toLowerCase();

  const replacements: Array<[RegExp, string]> = [
    [/\bpury\b/g, 'puri'],
    [/\bpuri\s+glx\b/g, 'puri galaxy'],
    [/\bgalaxi\b/g, 'galaxy'],
    [/\bgallaxy\b/g, 'galaxy'],
    [/\bgxy\b/g, 'galaxy'],
    [/\bgrah?ha\b/g, 'graha'],
    [/\broyal res\b/g, 'royal residence'],
    [/\bwbm\b/g, 'wisata bukit mas'],
    [/\bvbm\b/g, 'villa bukit mas'],
    [/\bvbr\b/g, 'villa bukit regency'],
    [/\bpc\b/g, 'pakuwon city'],
    [/\bkertajaya\s*v[123]\b/g, 'kertajaya indah'],
  ];

  normalized = normalized.normalize('NFKD');

  for (const [regex, repl] of replacements) {
    normalized = normalized.replace(regex, repl);
  }

  normalized = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(jl|jalan|gang|gg|rt|rw|blok|no|nomor|kel|kec)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

function buildNgrams(tokens: string[], min = 1, max = 3): string[] {
  const grams: string[] = [];
  for (let size = min; size <= max; size++) {
    for (let i = 0; i + size <= tokens.length; i++) {
      grams.push(tokens.slice(i, i + size).join(' '));
    }
  }
  return grams;
}

// Kumpulkan semua "kata kunci" untuk satu zona: name, area_group, code, plus alias dari ZONE_RULES
function collectZoneKeywords(zone: ZoneRow): string[] {
  const keywords = new Set<string>();

  const nameLower = zone.name ? zone.name.toLowerCase().trim() : '';
  const agLower = zone.area_group ? zone.area_group.toLowerCase().trim() : '';
  const codeWords = zone.code
    ? zone.code.toLowerCase().replace(/_/g, ' ')
    : '';

  [nameLower, agLower, codeWords].forEach((val) => {
    if (val) {
      keywords.add(normalizeAddressText(val));
    }
  });

  if (zone.code) {
    const extra = ZONE_RULES.find((r) => r.code === zone.code);
    extra?.keywords.forEach((kw) =>
      keywords.add(normalizeAddressText(kw)),
    );
  }

  return Array.from(keywords).filter(Boolean);
}

const GENERIC_TOKENS = new Set([
  'area',
  'residence',
  'residences',
  'city',
  'regency',
  'perumahan',
  'cluster',
  'other',
  'unknown',
]);

async function detectZoneInfo(
  address: string | undefined,
): Promise<ZoneDetectResult> {
  if (!address) {
    return { zoneId: null, zoneCode: null, deliveryFeeDb: null };
  }

  const normalizedAddr = normalizeAddressText(address);
  const addrTokens = normalizedAddr.split(/\s+/).filter((t) => t.length > 0);
  const addrNgrams = buildNgrams(addrTokens, 1, 3);

  let bestMatch:
    | (ZoneDetectResult & { score: number; debugFrom: string })
    | null = null;

  try {
    const { data: zones, error } = await supabase
      .from('zones')
      .select('id, code, name, area_group, delivery_fee');

    if (error) {
      console.error('[Supabase] error reading zones for detectZoneInfo', error);
    } else if (zones && Array.isArray(zones)) {
      const zoneRows: ZoneRow[] = (zones as any[]).map((raw) => ({
        id: typeof raw.id === 'number' ? raw.id : null,
        code: typeof raw.code === 'string' ? raw.code : null,
        name: typeof raw.name === 'string' ? raw.name : null,
        area_group:
          typeof raw.area_group === 'string' ? raw.area_group : null,
        delivery_fee:
          typeof raw.delivery_fee === 'number' &&
          !Number.isNaN(raw.delivery_fee)
            ? (raw.delivery_fee as number)
            : null,
      }));

      for (const z of zoneRows) {
        const id = z.id;
        const code = z.code;
        const deliveryFeeValue = z.delivery_fee;

        if (!code) continue;

        const candidates = collectZoneKeywords(z);
        if (candidates.length === 0) continue;

        for (const cand of candidates) {
          if (!cand) continue;

          // exact substring: "puri galaxy" ada di alamat
          if (normalizedAddr.includes(cand)) {
            const score = 1.0; // paling kuat
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = {
                zoneId: id,
                zoneCode: code,
                deliveryFeeDb: deliveryFeeValue,
                score,
                debugFrom: `substring:${cand}`,
              };
            }
            continue;
          }

          // fuzzy lewat n-gram
          let bestSim = 0;
          let bestNgram = '';

          for (const ngram of addrNgrams) {
            const sim = normalizedSimilarity(cand, ngram);
            if (sim > bestSim) {
              bestSim = sim;
              bestNgram = ngram;
            }
          }

          if (bestSim > 0) {
            const finalScore = bestSim; // 0..1
            if (!bestMatch || finalScore > bestMatch.score) {
              bestMatch = {
                zoneId: id,
                zoneCode: code,
                deliveryFeeDb: deliveryFeeValue,
                score: finalScore,
                debugFrom: `ngram:${cand}<->${bestNgram} (sim=${bestSim.toFixed(
                  2,
                )})`,
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[detectZoneInfo] error reading zones', e);
  }

  // Log supaya kelihatan di Vercel
  console.log('[ZONE_DEBUG]', {
    address: normalizedAddr,
    tokens: addrTokens,
    match: bestMatch
      ? {
          zoneId: bestMatch.zoneId,
          zoneCode: bestMatch.zoneCode,
          from: bestMatch.debugFrom,
          score: bestMatch.score,
        }
      : null,
  });

  // threshold agar nggak ngawur (0.7 cukup ketat)
  const MIN_SCORE = 0.7;

  // Kalau ada match dari DB dengan skor cukup, pakai itu
  if (bestMatch && bestMatch.score >= MIN_SCORE) {
    return {
      zoneId: bestMatch.zoneId,
      zoneCode: bestMatch.zoneCode,
      deliveryFeeDb: bestMatch.deliveryFeeDb,
    };
  }

  /* === Fallback ke ZONE_RULES (alias hardcode: graha famili, wbm, dll) === */

  const lower = normalizedAddr;
  for (const rule of ZONE_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      try {
        const { data: zr, error: zoneErr } = await supabase
          .from('zones')
          .select('id, code, delivery_fee')
          .eq('code', rule.code)
          .maybeSingle();

        if (zoneErr) {
          console.error('[Supabase] error reading zones by code', zoneErr);
        }

        if (zr?.id) {
          const dlv =
            typeof zr.delivery_fee === 'number' &&
            !Number.isNaN(zr.delivery_fee)
              ? zr.delivery_fee
              : null;
          console.log('[ZONE_DEBUG_FALLBACK_RULE]', {
            address: normalizedAddr,
            rule: rule.code,
            zoneId: zr.id,
          });
          return {
            zoneId: zr.id,
            zoneCode: zr.code ?? rule.code,
            deliveryFeeDb: dlv,
          };
        } else {
          console.log('[ZONE_DEBUG_FALLBACK_RULE_NO_DB]', {
            address: normalizedAddr,
            rule: rule.code,
          });
          return {
            zoneId: null,
            zoneCode: rule.code,
            deliveryFeeDb: null,
          };
        }
      } catch (e) {
        console.error('[detectZoneInfo] error zones by rule', e);
      }
    }
  }

  console.log('[ZONE_DEBUG_NO_MATCH]', { address: normalizedAddr });
  return { zoneId: null, zoneCode: null, deliveryFeeDb: null };
}

/* ===== Helper: resolve items ke product_aliases + products (Levenshtein) ===== */

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

  const { data: aliasRows, error: aliasErr } = await supabase
    .from('product_aliases')
    .select('alias, product_id, products(id, name, price)');

  if (aliasErr) {
    console.error('[Supabase] error reading product_aliases', aliasErr);
  }

  type AliasEntry = {
    aliasLower: string;
    productId: number;
    productName: string;
    price: number;
  };

  const aliasEntries: AliasEntry[] = [];
  const aliasMapExact = new Map<string, AliasEntry>();

  (aliasRows ?? []).forEach((row: any) => {
    if (!row || !row.alias || !row.products) return;
    const aliasLower = String(row.alias).toLowerCase();
    const entry: AliasEntry = {
      aliasLower,
      productId: row.products.id,
      productName: row.products.name,
      price: row.products.price,
    };
    aliasEntries.push(entry);
    aliasMapExact.set(aliasLower, entry);
  });

  const resolvedItems: ResolvedItem[] = [];

  for (const item of parsedItems) {
    const key = item.aliasText.toLowerCase();

    let chosen: AliasEntry | null = aliasMapExact.get(key) ?? null;

    // Kalau exact tidak ketemu → coba fuzzy
    if (!chosen) {
      let bestDist = Infinity;
      let bestEntry: AliasEntry | null = null;

      for (const entry of aliasEntries) {
        const dist = levenshtein(key, entry.aliasLower);
        const maxLen = Math.max(key.length, entry.aliasLower.length);
        if (maxLen < 4) continue; // terlalu pendek

        // threshold kecil: typo dikit ok, beda produk (besar vs kecil) nggak keambil
        const allowed = maxLen <= 5 ? 1 : 2;

        if (dist <= allowed && dist < bestDist) {
          bestDist = dist;
          bestEntry = entry;
        }
      }

      if (bestEntry) {
        chosen = bestEntry;
        console.log('[ALIAS_FUZZY_MATCH]', {
          input: key,
          match: bestEntry.aliasLower,
          product: bestEntry.productName,
          dist: bestDist,
        });
      }
    }

    if (!chosen) {
      errors.push(
        `Item "${item.raw}" tidak ditemukan di daftar product_aliases (alias: "${item.aliasText}").`,
      );
      continue;
    }

    const lineTotal = item.qty * chosen.price;

    resolvedItems.push({
      raw: item.raw,
      aliasText: item.aliasText,
      productId: chosen.productId,
      productName: chosen.productName,
      unitPrice: chosen.price,
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

/* ====== CREATE ORDER BENERAN DARI MANUAL (multi-item) ====== */

type PaymentMethod = 'COD' | 'TRANSFER';

async function createOrderFromResolvedManual(
  waPhone: string,
  waName: string | undefined,
  state: ManualOrderState,
  paymentMethod: PaymentMethod,
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

  // 2) Deteksi zona & ongkir dari DB
  const zoneInfo = await detectZoneInfo(parsed.address);
  const zoneId = zoneInfo.zoneId;
  const zoneCode = zoneInfo.zoneCode;
  const deliveryFeeDb = zoneInfo.deliveryFeeDb; // null = free (no fee set)

  // 3) Hitung total
  const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFeeForOrder = deliveryFeeDb ?? 0; // kolom orders.delivery_fee NOT NULL
  const discountTotal = 0;
  const grandTotal = subtotal + deliveryFeeForOrder - discountTotal;

  // 4) Insert ke orders
  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'PENDING',
      source_channel: 'whatsapp',
      address_text: parsed.address ?? '(alamat belum lengkap)',
      zone_id: zoneId,
      subtotal,
      delivery_fee: deliveryFeeForOrder,
      discount_total: discountTotal,
      grand_total: grandTotal,
      payment_method: paymentMethod,
    })
    .select('id')
    .single();

  if (orderErr || !orderRow) {
    throw new Error('Failed to insert order: ' + orderErr?.message);
  }

  const orderId = orderRow.id;

  // 5) Insert banyak order_items sekaligus
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

  // 6) Insert payments
  const { error: payErr } = await supabase.from('payments').insert({
    order_id: orderId,
    method: paymentMethod,
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
    deliveryFee: deliveryFeeForOrder, // numeric yang dipakai di orders
    deliveryFeeDb, // nullable: null = free (no fee set)
    paymentMethod,
    zoneCode,
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
        'Oke kak, *order ketik manual*✍️',
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
        '',
        'Setelah kami kirim ringkasan, kakak bisa balas:',
        '- *OK COD* (bayar di tempat), atau',
        '- *OK TRANSFER* (bayar via transfer).',
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

      /* ----- BRANCH: USER KONFIRMASI (OK / COD / TF / TRANSFER) ----- */

      const hasDraft = !!lastManualOrders[from];

      // compact string untuk baca typo: "ok coddd", "tff", "transf", dll
      const compact = normalized.replace(/[^a-z0-9]/g, ''); // hapus spasi & simbol

      const looksTransfer =
        compact.includes('tf') ||
        compact.includes('tff') ||
        compact.includes('trf') ||
        compact.includes('tfr') ||
        compact.includes('transfer') ||
        compact.includes('transf') ||
        compact.includes('trnsfr') ||
        compact.includes('trnsfer') ||
        compact.includes('trans');

      const looksCod =
        compact.includes('cod') ||
        compact.includes('c0d') ||
        compact.includes('k0d') ||
        compact.includes('kod') ||
        compact.includes('codd') ||
        compact.includes('coddd');

      const looksOk = compact.includes('ok');

      const hasConfirmKeyword = looksTransfer || looksCod || looksOk;

      if (hasDraft && hasConfirmKeyword) {
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

        // Default COD, kalau ada "transfer / tf / tff / transf / trnsfr" → TRANSFER
        let paymentMethod: PaymentMethod;
        if (looksTransfer) {
          paymentMethod = 'TRANSFER';
        } else {
          paymentMethod = 'COD';
        }

        try {
          const result = await createOrderFromResolvedManual(
            from,
            contactName,
            state,
            paymentMethod,
          );

          const itemsText = result.items
            .map(
              (i) =>
                `- ${i.productName} x ${i.qty}  (Rp ${i.lineTotal.toLocaleString(
                  'id-ID',
                )})`,
            )
            .join('\n');

          const payText =
            paymentMethod === 'COD'
              ? 'Metode bayar: COD (bayar di tempat)'
              : 'Metode bayar: Transfer';

          const addressText =
            state.parsed.address ?? '(alamat belum lengkap)';

          const zoneLine = result.zoneCode
            ? `Zona: ${result.zoneCode}`
            : 'Zona: (belum terdeteksi, nanti admin cek ya kak)';

          const lines: string[] = [
            '✅ Order berhasil dibuat di sistem.',
            '',
            `ID Order : ${result.orderId}`,
            '',
            'Item:',
            itemsText,
            '',
            `Alamat: ${addressText}`,
            zoneLine,
          ];

          // Ongkir hanya ditulis kalau di DB ada nilai (0 atau >0)
          if (result.deliveryFeeDb !== null) {
            lines.push(
              `Ongkir: Rp ${result.deliveryFee.toLocaleString('id-ID')}`,
            );
          }

          lines.push(
            payText,
            '',
            `Total : Rp ${result.grandTotal.toLocaleString('id-ID')}`,
            '',
            'Terima kasih kak 🙏',
          );

          await sendWhatsAppText(from, lines.join('\n'));

          return NextResponse.json(
            {
              status: 'ok-order-from-confirm',
              orderId: result.orderId,
              paymentMethod,
            },
            { status: 200 },
          );
        } catch (e) {
          console.error('[ORDER_FROM_CONFIRM] Error', e);
          await sendWhatsAppText(
            from,
            'Maaf kak, terjadi error saat membuat order dari konfirmasi. Nanti admin cek dulu ya 🙏',
          );
          return NextResponse.json(
            { status: 'error-order-from-confirm' },
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