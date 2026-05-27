import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasNextPublicSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasCozeSupabaseUrl: !!process.env.COZE_SUPABASE_URL,
    hasCozeSupabaseAnonKey: !!process.env.COZE_SUPABASE_ANON_KEY,
    // 显示部分值用于调试（隐藏敏感信息）
    supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 30) || process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'not set',
    nodeEnv: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    netlify: !!process.env.NETLIFY,
  };

  return NextResponse.json({
    success: true,
    environment: envCheck,
    message: '请在 Netlify 中设置 SUPABASE_URL 和 SUPABASE_ANON_KEY（不带 NEXT_PUBLIC_ 前缀）'
  });
}
