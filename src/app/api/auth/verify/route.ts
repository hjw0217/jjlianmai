import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const valid = verifyAuthToken(token);
    if (!valid) {
      return NextResponse.json({ error: '认证已过期，请重新登录' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
