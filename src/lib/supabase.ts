import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 読み取り専用（フロントエンド・APIルート共用）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 書き込み用（Cronジョブ・サーバーサイドのみ）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
