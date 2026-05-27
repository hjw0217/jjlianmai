import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};

  // Check environment variables
  checks.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL ? 'OK' : 'MISSING (using local SQLite)';
  checks.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ? 'OK' : 'MISSING (using local SQLite)';
  checks.COZE_PROJECT_ENV = process.env.COZE_PROJECT_ENV || 'not set';

  // Try DB connection
  const dbCheck = await checkDatabaseConnection();
  checks.DB_CONNECTION = dbCheck.ok ? 'OK' : `ERROR: ${dbCheck.message}`;

  const isOk = dbCheck.ok;

  return NextResponse.json({ status: isOk ? 'healthy' : 'unhealthy', checks }, { status: isOk ? 200 : 500 });
}
