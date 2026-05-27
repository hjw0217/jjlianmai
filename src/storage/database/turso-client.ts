import { createClient, Client } from '@libsql/client';
import { execSync } from 'child_process';

const isVercel = !!process.env.VERCEL;
const isNetlify = !!process.env.NETLIFY;

let envLoaded = false;

interface TursoCredentials {
  url: string;
  authToken: string;
}

function loadEnv(): void {
  if (envLoaded || (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)) {
    return;
  }

  try {
    try {
      require('dotenv').config();
      if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
        envLoaded = true;
        return;
      }
    } catch {
      // dotenv not available
    }

    // Skip Coze platform env loading on Vercel/Netlify
    if (isVercel || isNetlify) {
      envLoaded = true;
      return;
    }

    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    envLoaded = true;
  } catch {
    // Silently fail
  }
}

function getTursoCredentials(): TursoCredentials {
  loadEnv();

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // For local development without Turso, use local SQLite
  if (!url || !authToken) {
    console.log('[Turso] No Turso credentials found, using local SQLite for development');
    return {
      url: 'file:local.db',
      authToken: '',
    };
  }

  console.log('[Turso] Credentials loaded successfully, URL:', url.substring(0, 30) + '...');
  return { url, authToken };
}

let client: Client | null = null;
let initialized = false;

function getTursoClient(): Client {
  if (client) return client;

  const { url, authToken } = getTursoCredentials();

  client = createClient({
    url,
    authToken: authToken || undefined,
  });

  return client;
}

// Initialize database tables
async function initDatabase(): Promise<void> {
  if (initialized) return;

  const db = getTursoClient();

  // Create timeslots table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS timeslots (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      teacher TEXT NOT NULL,
      max_participants TEXT DEFAULT '1' NOT NULL,
      status TEXT DEFAULT 'available' NOT NULL,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT
    )
  `);

  // Create bookings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY NOT NULL,
      booking_no TEXT NOT NULL UNIQUE,
      student_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      requirement TEXT,
      teacher_name TEXT,
      teacher TEXT NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      timeslot_id TEXT NOT NULL,
      status TEXT DEFAULT 'confirmed' NOT NULL,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (timeslot_id) REFERENCES timeslots(id)
    )
  `);

  // Create indexes
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_timeslots_date ON timeslots(date)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_timeslots_status ON timeslots(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_timeslot_id ON bookings(timeslot_id)`);
  } catch {
    // Indexes may already exist
  }

  // Create health_check table for connection testing
  await db.execute(`
    CREATE TABLE IF NOT EXISTS health_check (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  initialized = true;
  console.log('[Turso] Database initialized successfully');
}

// Get client with auto-initialization
async function getClient(): Promise<Client> {
  await initDatabase();
  return getTursoClient();
}

export { loadEnv, getTursoCredentials, getClient, initDatabase };
