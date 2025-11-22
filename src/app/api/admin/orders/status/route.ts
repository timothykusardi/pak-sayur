// src/app/api/admin/orders/status/route.ts
import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type DbStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'ON_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = Number(body.orderId);
    const status = String(body.status || '') as DbStatus;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId atau status kosong' },
        { status: 400 },
      );
    }

    // update ke tabel orders
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select('id, status')
      .single();

    if (error) {
      console.error('[ADMIN_STATUS_UPDATE] Supabase error', error);
      return NextResponse.json(
        { error: error.message ?? 'Supabase error' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, order: data });
  } catch (err: any) {
    console.error('[ADMIN_STATUS_UPDATE] exception', err);
    return NextResponse.json(
      { error: 'Server error saat update status' },
      { status: 500 },
    );
  }
}
