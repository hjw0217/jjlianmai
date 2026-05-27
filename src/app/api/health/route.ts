import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};

  // Check environment variables
  checks.SUPABASE_URL = process.env.COZE_SUPABASE_URL || process.env.SUPABASE_URL ? 'OK' : 'MISSING';
  checks.SUPABASE_ANON_KEY = process.env.COZE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ? 'OK' : 'MISSING (optional)';
  checks.SUPABASE_SERVICE_ROLE_KEY = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING';
  checks.COZE_PROJECT_ENV = process.env.COZE_PROJECT_ENV || 'not set';

  // Try DB connection
  let dbStatus = 'OK';
  try {
    const { getTimeSlots } = await import('@/lib/store');
    await getTimeSlots();
  } catch (e) {
    dbStatus = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }
  checks.DB_CONNECTION = dbStatus;

  const isOk = checks.SUPABASE_URL === 'OK' && checks.SUPABASE_SERVICE_ROLE_KEY === 'OK' && dbStatus === 'OK';

  return NextResponse.json({ status: isOk ? 'healthy' : 'unhealthy', checks }, { status: isOk ? 200 : 500 });
}
