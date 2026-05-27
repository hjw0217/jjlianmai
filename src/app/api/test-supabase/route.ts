import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 基本信息
  const info: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasNextPublicSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
    },
    urlInfo: {
      fullUrl: url || 'not set',
      urlLength: url?.length || 0,
      urlEndsWithSupabaseCo: url?.endsWith('.supabase.co') || false,
      urlStartsWithHttps: url?.startsWith('https://') || false,
    },
    keyInfo: {
      keyLength: anonKey?.length || 0,
      keyPrefix: anonKey?.substring(0, 30) + '...' || 'not set',
      keyStartsWithEyJ: anonKey?.startsWith('eyJ') || false,
    }
  };

  if (!url || !anonKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing credentials',
      ...info,
    }, { status: 500 });
  }

  // 验证 URL 格式
  if (!url.endsWith('.supabase.co')) {
    return NextResponse.json({
      success: false,
      error: 'Invalid URL format: URL must end with .supabase.co',
      expectedFormat: 'https://your-project-id.supabase.co',
      currentUrl: url,
      ...info,
    }, { status: 500 });
  }

  try {
    // 测试连接 Supabase
    const response = await fetch(`${url}/rest/v1/timeslots?select=id&limit=1`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    
    info.response = {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: text.substring(0, 500),
    };

    return NextResponse.json({
      success: response.ok,
      ...info,
    });
  } catch (err) {
    info.error = {
      message: err instanceof Error ? err.message : 'Unknown error',
      name: err instanceof Error ? err.name : 'Unknown',
    };
    
    return NextResponse.json({
      success: false,
      ...info,
    }, { status: 500 });
  }
}
