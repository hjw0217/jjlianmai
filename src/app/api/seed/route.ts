import { NextResponse } from 'next/server';
import { seedInitialData } from '@/lib/store';

export async function POST() {
  try {
    await seedInitialData();
    return NextResponse.json({ success: true, message: '数据初始化完成' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '初始化失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
