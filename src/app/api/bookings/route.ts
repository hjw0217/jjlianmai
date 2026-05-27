import { NextResponse } from 'next/server';
import { getBookings, createBooking, cancelBooking, getBookingsByTimeSlot } from '@/lib/store';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapBooking(b: any) {
  return {
    id: b.id,
    bookingNo: b.booking_no,
    studentName: b.student_name,
    phone: b.phone,
    requirement: b.requirement,
    teacherName: b.teacher_name,
    teacher: b.teacher,
    date: b.date,
    timeSlot: b.time_slot,
    timeslotId: b.timeslot_id,
    status: b.status,
    createdAt: b.created_at,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeslotId = searchParams.get('timeslotId');

    if (timeslotId) {
      const bookings = await getBookingsByTimeSlot(timeslotId);
      return NextResponse.json({ success: true, data: bookings.map(mapBooking) });
    }

    const bookings = await getBookings();
    return NextResponse.json({ success: true, data: bookings.map(mapBooking) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询预约失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { studentName, phone, requirement, teacherName, timeSlotId } = body;
      if (!studentName || !phone || !timeSlotId) {
        return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
      }
      const booking = await createBooking({ studentName, phone, requirement: requirement || '', teacherName: teacherName || '', timeSlotId });
      return NextResponse.json({ success: true, data: mapBooking(booking) });
    }

    if (action === 'cancel') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: '缺少预约ID' }, { status: 400 });
      const booking = await cancelBooking(id);
      return NextResponse.json({ success: true, data: mapBooking(booking) });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失败';
    const isBusinessError = message.includes('已预约') || message.includes('仅限') || message.includes('不存在') || message.includes('已取消');
    return NextResponse.json({ error: message }, { status: isBusinessError ? 400 : 500 });
  }
}
