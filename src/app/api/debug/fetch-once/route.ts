import { NextResponse } from 'next/server';
import { fetchAndSaveWaitTimes } from '@/lib/fetchWaitTimes';

// 開発用: 認証なしで Queue-Times API からデータを取得して Supabase に保存する
// 本番デプロイ後は Vercel Cron が代替するためこのエンドポイントは使用しない
export async function GET() {
  try {
    const result = await fetchAndSaveWaitTimes();
    return NextResponse.json({ message: 'OK', ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
