import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    url: url,
  };

  // 解码 JWT 获取项目信息
  if (anonKey && anonKey.startsWith('eyJ')) {
    try {
      const parts = anonKey.split('.');
      if (parts.length === 3) {
        // Base64Url 解码
        const payload = Buffer.from(
          parts[1].replace(/-/g, '+').replace(/_/g, '/'),
          'base64'
        ).toString('utf-8');
        
        const decoded = JSON.parse(payload);
        result.jwtPayload = decoded;
        
        // 检查 ref (项目 ID)
        if (decoded.ref) {
          result.projectIdFromKey = decoded.ref;
          result.urlContainsProjectId = url?.includes(decoded.ref) || false;
          
          if (!url?.includes(decoded.ref)) {
            result.mismatchError = `URL 项目 ID 与 Key 不匹配！Key 中的项目 ID 是 "${decoded.ref}"，但 URL 中没有这个 ID`;
          }
        }
      }
    } catch (e) {
      result.jwtDecodeError = e instanceof Error ? e.message : 'Unknown error';
    }
  }

  // 测试直接访问 Supabase
  if (url) {
    try {
      // 测试基本的网络连通性
      const testUrl = `${url}/rest/v1/`;
      result.testingUrl = testUrl;
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000), // 10秒超时
      });
      
      result.supabaseResponseStatus = response.status;
      result.supabaseResponseOk = response.ok;
    } catch (err) {
      result.supabaseConnectionError = err instanceof Error ? err.message : 'Unknown error';
      result.supabaseConnectionErrorName = err instanceof Error ? err.name : 'Unknown';
      
      // 检查是否是 DNS 解析问题
      if (err instanceof Error && err.message.includes('ENOTFOUND')) {
        result.dnsError = true;
        result.possibleCause = '项目 ID 不存在或项目已被删除';
      }
      // 检查是否是连接超时
      if (err instanceof Error && (err.message.includes('ETIMEDOUT') || err.name === 'TimeoutError')) {
        result.timeoutError = true;
        result.possibleCause = '网络连接超时，可能是 Supabase 服务问题或防火墙限制';
      }
    }
  }

  return NextResponse.json(result, { status: 200 });
}
