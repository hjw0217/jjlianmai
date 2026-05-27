import { getClient, initDatabase } from '@/storage/database/turso-client';
import type { Client } from '@libsql/client';

// ========== Types ==========

export interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  teacher: string;
  status: 'available' | 'booked';
  max_participants: string;
  created_at: string;
  updated_at: string | null;
}

export interface Booking {
  id: string;
  booking_no: string;
  student_name: string;
  phone: string;
  requirement: string | null;
  teacher_name: string | null;
  teacher: string;
  date: string;
  time_slot: string;
  timeslot_id: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string | null;
}

// ========== Auth ==========

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const TOKEN_SECRET = 'vocal_link_admin_2026';

function signToken(username: string, timestamp: number): string {
  const payload = `${username}:${timestamp}`;
  const signature = Buffer.from(`${payload}:${TOKEN_SECRET}`).toString('base64url');
  return `${username}:${timestamp}.${signature}`;
}

function verifyToken(token: string): boolean {
  try {
    const [payload, signature] = token.split('.');
    const decoded = Buffer.from(signature, 'base64url').toString();
    const expected = decoded.split(':').slice(0, -1).join(':') + ':' + decoded.split(':').pop();
    const [username, timestamp] = payload.split(':');
    const expectedSignature = Buffer.from(`${username}:${timestamp}:${TOKEN_SECRET}`).toString('base64url');
    if (signature !== expectedSignature) return false;
    const ts = parseInt(timestamp);
    if (Date.now() - ts > 24 * 60 * 60 * 1000) return false;
    return username === ADMIN_USERNAME;
  } catch {
    return false;
  }
}

export function authenticateUser(username: string, password: string): { success: boolean; token?: string; error?: string } {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = signToken(username, Date.now());
    return { success: true, token };
  }
  return { success: false, error: '用户名或密码错误' };
}

export function verifyAuthToken(token: string): boolean {
  return verifyToken(token);
}

// ========== Database Helpers ==========

async function db(): Promise<Client> {
  return getClient();
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

// ========== TimeSlots ==========

export async function getTimeSlots(date?: string): Promise<TimeSlot[]> {
  const client = await db();
  let sql = 'SELECT * FROM timeslots ORDER BY date, start_time';
  const params: string[] = [];
  
  if (date) {
    sql = 'SELECT * FROM timeslots WHERE date = ? ORDER BY date, start_time';
    params.push(date);
  }
  
  const result = await client.execute({
    sql,
    args: params,
  });
  
  return result.rows as unknown as TimeSlot[];
}

export async function getTimeSlotById(id: string): Promise<TimeSlot | null> {
  const client = await db();
  const result = await client.execute({
    sql: 'SELECT * FROM timeslots WHERE id = ?',
    args: [id],
  });
  
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as TimeSlot;
}

export async function addTimeSlot(slot: Omit<TimeSlot, 'id' | 'created_at' | 'updated_at'>): Promise<TimeSlot> {
  const client = await db();
  const id = `ts-${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
  await client.execute({
    sql: `INSERT INTO timeslots (id, date, start_time, end_time, teacher, max_participants, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, slot.date, slot.start_time, slot.end_time, slot.teacher, slot.max_participants, slot.status],
  });
  
  const result = await client.execute({
    sql: 'SELECT * FROM timeslots WHERE id = ?',
    args: [id],
  });
  
  return result.rows[0] as unknown as TimeSlot;
}

export async function updateTimeSlot(id: string, updates: Partial<Pick<TimeSlot, 'date' | 'start_time' | 'end_time' | 'teacher' | 'status' | 'max_participants'>>): Promise<TimeSlot> {
  const client = await db();
  const setClauses: string[] = [];
  const args: (string | null)[] = [];
  
  if (updates.date !== undefined) {
    setClauses.push('date = ?');
    args.push(updates.date);
  }
  if (updates.start_time !== undefined) {
    setClauses.push('start_time = ?');
    args.push(updates.start_time);
  }
  if (updates.end_time !== undefined) {
    setClauses.push('end_time = ?');
    args.push(updates.end_time);
  }
  if (updates.teacher !== undefined) {
    setClauses.push('teacher = ?');
    args.push(updates.teacher);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    args.push(updates.status);
  }
  if (updates.max_participants !== undefined) {
    setClauses.push('max_participants = ?');
    args.push(updates.max_participants);
  }
  
  setClauses.push('updated_at = datetime("now")');
  args.push(id);
  
  await client.execute({
    sql: `UPDATE timeslots SET ${setClauses.join(', ')} WHERE id = ?`,
    args,
  });
  
  const result = await client.execute({
    sql: 'SELECT * FROM timeslots WHERE id = ?',
    args: [id],
  });
  
  return result.rows[0] as unknown as TimeSlot;
}

export async function deleteTimeSlot(id: string): Promise<void> {
  const client = await db();
  
  // Delete associated bookings first
  await client.execute({
    sql: 'DELETE FROM bookings WHERE timeslot_id = ?',
    args: [id],
  });
  
  // Delete the timeslot
  await client.execute({
    sql: 'DELETE FROM timeslots WHERE id = ?',
    args: [id],
  });
}

// ========== Bookings ==========

export async function getBookings(): Promise<Booking[]> {
  const client = await db();
  const result = await client.execute({
    sql: 'SELECT * FROM bookings ORDER BY created_at DESC',
    args: [],
  });
  
  return result.rows as unknown as Booking[];
}

export async function createBooking(params: {
  studentName: string;
  phone: string;
  requirement: string;
  teacherName: string;
  timeSlotId: string;
}): Promise<Booking> {
  const client = await db();
  
  // Get timeslot first
  const slot = await getTimeSlotById(params.timeSlotId);
  if (!slot) throw new Error('时间段不存在');
  if (slot.status === 'booked') throw new Error('该时段已被预约');

  // Check if timeslot has already started
  const now = new Date();
  const slotStart = new Date(`${slot.date}T${slot.start_time}:00`);
  if (now >= slotStart) throw new Error('该时段已开始，无法预约');

  // Check monthly booking limit: two bookings per phone per month
  const [sy, sm] = slot.date.split('-').map(Number);
  const monthStart = `${sy}-${String(sm).padStart(2, '0')}-01`;
  const nextMonth = sm === 12 ? `${sy + 1}-01-01` : `${sy}-${String(sm + 1).padStart(2, '0')}-01`;

  const monthlyBookings = await client.execute({
    sql: `SELECT id FROM bookings WHERE phone = ? AND status = 'confirmed' AND date >= ? AND date < ?`,
    args: [params.phone, monthStart, nextMonth],
  });

  if (monthlyBookings.rows.length >= 2) {
    throw new Error('该手机号本月预约已达上限，每人每月限预约两次');
  }

  // Check if this phone has already booked this time slot
  const sameSlotBooking = await client.execute({
    sql: `SELECT id FROM bookings WHERE phone = ? AND timeslot_id = ? AND status = 'confirmed'`,
    args: [params.phone, slot.id],
  });

  if (sameSlotBooking.rows.length > 0) {
    throw new Error('该手机号已预约过此时间段，请勿重复预约');
  }

  // Check max participants limit
  const currentBookings = await client.execute({
    sql: `SELECT id FROM bookings WHERE timeslot_id = ? AND status = 'confirmed'`,
    args: [slot.id],
  });
  
  const currentCount = currentBookings.rows.length;
  const maxParticipants = Number(slot.max_participants) || 1;
  if (currentCount >= maxParticipants) {
    throw new Error('该时段预约人数已满');
  }

  const bookingId = `bk-${Date.now().toString(36)}`;
  const bookingNo = `TR${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  // Create booking
  await client.execute({
    sql: `INSERT INTO bookings (id, booking_no, student_name, phone, requirement, teacher_name, teacher, date, time_slot, timeslot_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      bookingId,
      bookingNo,
      params.studentName,
      params.phone,
      params.requirement || null,
      params.teacherName || null,
      slot.teacher,
      slot.date,
      `${slot.start_time}-${slot.end_time}`,
      slot.id,
      'confirmed',
    ],
  });

  // Update timeslot status: mark as 'booked' only when max participants reached
  const newStatus = currentCount + 1 >= maxParticipants ? 'booked' : 'available';
  await client.execute({
    sql: `UPDATE timeslots SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [newStatus, slot.id],
  });

  const result = await client.execute({
    sql: 'SELECT * FROM bookings WHERE id = ?',
    args: [bookingId],
  });

  return result.rows[0] as unknown as Booking;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const client = await db();

  const bookingResult = await client.execute({
    sql: 'SELECT * FROM bookings WHERE id = ?',
    args: [id],
  });
  
  if (bookingResult.rows.length === 0) {
    throw new Error('预约不存在');
  }
  
  const booking = bookingResult.rows[0] as unknown as Booking;

  // Update booking status
  await client.execute({
    sql: `UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
    args: [id],
  });

  // Restore timeslot status
  if (booking.timeslot_id) {
    await client.execute({
      sql: `UPDATE timeslots SET status = 'available', updated_at = datetime('now') WHERE id = ?`,
      args: [booking.timeslot_id],
    });
  }

  const result = await client.execute({
    sql: 'SELECT * FROM bookings WHERE id = ?',
    args: [id],
  });

  return result.rows[0] as unknown as Booking;
}

export async function getBookingsByTimeSlot(timeslotId: string): Promise<Booking[]> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT * FROM bookings WHERE timeslot_id = ? AND status != 'cancelled'`,
    args: [timeslotId],
  });
  
  return result.rows as unknown as Booking[];
}

// ========== Seed Data ==========

export async function seedInitialData(): Promise<void> {
  await initDatabase();
  const client = await db();

  // Check if data already exists
  const countResult = await client.execute('SELECT COUNT(*) as count FROM timeslots');
  const count = Number((countResult.rows[0] as unknown as { count: number | bigint }).count);
  if (count > 0) return; // Data already seeded

  const teachers = ['王老师', '李老师', '张老师', '陈老师'];
  
  let slotIndex = 1;
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay();

    const timeSlots = [
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
      { start: '14:00', end: '15:00' },
    ];

    for (const ts of timeSlots) {
      if (dayOfWeek === 0 && ts.start === '14:00') continue; // Sunday afternoon off
      const teacherIdx = slotIndex % teachers.length;
      
      await client.execute({
        sql: `INSERT INTO timeslots (id, date, start_time, end_time, teacher, max_participants, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `ts-${String(slotIndex).padStart(3, '0')}`,
          dateStr,
          ts.start,
          ts.end,
          teachers[teacherIdx],
          '10',
          'available',
        ],
      });
      
      slotIndex++;
    }
  }

  console.log('[Turso] Initial data seeded successfully');
}

// ========== Health Check ==========

export async function checkDatabaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await initDatabase();
    const client = await db();
    await client.execute('SELECT 1');
    return { ok: true, message: 'Database connection successful' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, message: `Database connection failed: ${message}` };
  }
}
