import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    const result = authenticateUser(username, password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, token: result.token });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
