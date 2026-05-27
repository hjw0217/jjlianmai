import { getSupabaseClient } from '@/storage/database/supabase-client';

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

// ========== TimeSlots ==========

function getClient() {
  return getSupabaseClient();
}

export async function getTimeSlots(date?: string): Promise<TimeSlot[]> {
  const client = getClient();
  let query = client.from('timeslots').select('*').order('date').order('start_time');
  if (date) {
    query = query.eq('date', date);
  }
  const { data, error } = await query;
  if (error) throw new Error(`查询时段失败: ${error.message}`);
  return (data as TimeSlot[]) || [];
}

export async function getTimeSlotById(id: string): Promise<TimeSlot | null> {
  const client = getClient();
  const { data, error } = await client.from('timeslots').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`查询时段失败: ${error.message}`);
  return data as TimeSlot | null;
}

export async function addTimeSlot(slot: Omit<TimeSlot, 'id' | 'created_at' | 'updated_at'>): Promise<TimeSlot> {
  const client = getClient();
  const { data, error } = await client.from('timeslots').insert(slot).select().single();
  if (error) throw new Error(`添加时段失败: ${error.message}`);
  return data as TimeSlot;
}

export async function updateTimeSlot(id: string, updates: Partial<Pick<TimeSlot, 'date' | 'start_time' | 'end_time' | 'teacher' | 'status' | 'max_participants'>>): Promise<TimeSlot> {
  const client = getClient();
  const { data, error } = await client.from('timeslots').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(`更新时段失败: ${error.message}`);
  return data as TimeSlot;
}

export async function deleteTimeSlot(id: string): Promise<void> {
  const client = getClient();
  // 先删除关联的预约记录
  const { error: bookingError } = await client.from('bookings').delete().eq('timeslot_id', id);
  if (bookingError) throw new Error(`删除关联预约失败: ${bookingError.message}`);
  // 再删除时段
  const { error } = await client.from('timeslots').delete().eq('id', id);
  if (error) throw new Error(`删除时段失败: ${error.message}`);
}

// ========== Bookings ==========

export async function getBookings(): Promise<Booking[]> {
  const client = getClient();
  const { data, error } = await client.from('bookings').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`查询预约失败: ${error.message}`);
  return (data as Booking[]) || [];
}

export async function createBooking(params: {
  studentName: string;
  phone: string;
  requirement: string;
  teacherName: string;
  timeSlotId: string;
}): Promise<Booking> {
  // Get timeslot first
  const slot = await getTimeSlotById(params.timeSlotId);
  if (!slot) throw new Error('时间段不存在');
  if (slot.status === 'booked') throw new Error('该时段已被预约');

  // Check if timeslot has already started
  const now = new Date();
  const slotStart = new Date(`${slot.date}T${slot.start_time}:00`);
  if (now >= slotStart) throw new Error('该时段已开始，无法预约');

  // Check monthly booking limit: two bookings per phone per month
  const client = getClient();
  const [sy, sm] = slot.date.split('-').map(Number);
  const monthStart = `${sy}-${String(sm).padStart(2, '0')}-01`;
  const nextMonth = sm === 12 ? `${sy + 1}-01-01` : `${sy}-${String(sm + 1).padStart(2, '0')}-01`;

  const { data: existingBookings, error: checkError } = await client
    .from('bookings')
    .select('id')
    .eq('phone', params.phone)
    .eq('status', 'confirmed')
    .gte('date', monthStart)
    .lt('date', nextMonth);

  if (checkError) throw new Error(`查询预约记录失败: ${checkError.message}`);
  if (existingBookings && existingBookings.length >= 2) {
    throw new Error('该手机号本月预约已达上限，每人每月限预约两次');
  }

  // Check if this phone has already booked this time slot
  const { data: sameSlotBooking, error: sameSlotError } = await client
    .from('bookings')
    .select('id')
    .eq('phone', params.phone)
    .eq('timeslot_id', slot.id)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (sameSlotError) throw new Error(`查询预约记录失败: ${sameSlotError.message}`);
  if (sameSlotBooking) {
    throw new Error('该手机号已预约过此时间段，请勿重复预约');
  }

  // Check max participants limit
  const { data: currentBookings } = await client
    .from('bookings')
    .select('id')
    .eq('timeslot_id', slot.id)
    .eq('status', 'confirmed');
  const currentCount = currentBookings?.length || 0;
  const maxParticipants = Number(slot.max_participants) || 1;
  if (currentCount >= maxParticipants) {
    throw new Error('该时段预约人数已满');
  }

  const bookingId = `bk-${Date.now().toString(36)}`;
  const bookingNo = `TR${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const booking: Omit<Booking, 'created_at' | 'updated_at'> = {
    id: bookingId,
    booking_no: bookingNo,
    student_name: params.studentName,
    phone: params.phone,
    requirement: params.requirement || null,
    teacher_name: params.teacherName || null,
    teacher: slot.teacher,
    date: slot.date,
    time_slot: `${slot.start_time}-${slot.end_time}`,
    timeslot_id: slot.id,
    status: 'confirmed',
  };

  // Update timeslot status: mark as 'booked' only when max participants reached
  const newStatus = currentCount + 1 >= maxParticipants ? 'booked' : 'available';
  const { error: slotError } = await client.from('timeslots').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', slot.id);
  if (slotError) throw new Error(`更新时段状态失败: ${slotError.message}`);

  // Create booking
  const { data, error } = await client.from('bookings').insert(booking).select().single();
  if (error) {
    // Rollback timeslot status
    const rollbackStatus = currentCount > 0 ? 'available' : 'available';
    await client.from('timeslots').update({ status: rollbackStatus, updated_at: new Date().toISOString() }).eq('id', slot.id);
    throw new Error(`创建预约失败: ${error.message}`);
  }

  return data as Booking;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const client = getClient();

  const { data: booking, error: fetchError } = await client.from('bookings').select('*').eq('id', id).maybeSingle();
  if (fetchError) throw new Error(`查询预约失败: ${fetchError.message}`);
  if (!booking) throw new Error('预约不存在');

  const updatedBooking = booking as Booking;

  // Update booking status
  const { data, error } = await client.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(`取消预约失败: ${error.message}`);

  // Restore timeslot status
  if (updatedBooking.timeslot_id) {
    await client.from('timeslots').update({ status: 'available', updated_at: new Date().toISOString() }).eq('id', updatedBooking.timeslot_id);
  }

  return data as Booking;
}

export async function getBookingsByTimeSlot(timeslotId: string): Promise<Booking[]> {
  const client = getClient();
  const { data, error } = await client.from('bookings').select('*').eq('timeslot_id', timeslotId).neq('status', 'cancelled');
  if (error) throw new Error(`查询预约失败: ${error.message}`);
  return (data as Booking[]) || [];
}

// ========== Seed Data ==========

export async function seedInitialData(): Promise<void> {
  const client = getClient();

  // Check if data already exists
  const { count, error: countError } = await client.from('timeslots').select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`检查数据失败: ${countError.message}`);
  if (count && count > 0) return; // Data already seeded

  const teachers = ['王老师', '李老师', '张老师', '陈老师'];
  const slots: Omit<TimeSlot, 'created_at' | 'updated_at'>[] = [];

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
      slots.push({
        id: `ts-${String(slotIndex).padStart(3, '0')}`,
        date: dateStr,
        start_time: ts.start,
        end_time: ts.end,
        teacher: teachers[teacherIdx],
        status: 'available',
        max_participants: '10',
      });
      slotIndex++;
    }
  }

  const { error } = await client.from('timeslots').insert(slots);
  if (error) throw new Error(`初始化数据失败: ${error.message}`);
}
