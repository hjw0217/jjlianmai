import { NextResponse } from 'next/server';
import { getTimeSlots } from '@/lib/store';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSlot(s: any) {
  return {
    id: s.id,
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
    teacher: s.teacher,
    maxParticipants: Number(s.max_participants) || 1,
    currentBookings: Number(s.current_bookings) || 0,
    status: s.status,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const slots = await getTimeSlots(date);
    const mapped = slots.map(mapSlot);
    return NextResponse.json({ success: true, data: mapped });
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询时段失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body.token as string | undefined;
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const { verifyAuthToken } = await import('@/lib/store');
    if (!verifyAuthToken(token)) {
      return NextResponse.json({ error: '认证已过期，请重新登录' }, { status: 401 });
    }

    const action = body.action as string | undefined;

    if (action === 'delete') {
      const { deleteTimeSlot } = await import('@/lib/store');
      const id = body.id as string;
      if (!id) {
        return NextResponse.json({ error: '缺少时段 ID' }, { status: 400 });
      }
      await deleteTimeSlot(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'update') {
      const { updateTimeSlot } = await import('@/lib/store');
      const id = body.id as string;
      const { date, startTime, endTime, teacher, maxParticipants, status } = body;
      if (!id) {
        return NextResponse.json({ error: '缺少时段 ID' }, { status: 400 });
      }
      const slot = await updateTimeSlot(id, {
        ...(date && { date }),
        ...(startTime && { start_time: startTime }),
        ...(endTime && { end_time: endTime }),
        ...(teacher !== undefined && { teacher }),
        ...(maxParticipants !== undefined && { max_participants: String(maxParticipants) }),
        ...(status && { status }),
      });
      return NextResponse.json({ success: true, data: mapSlot(slot) });
    }

    // 默认：新增时段 (action === 'add' 或未指定 action)
    const { addTimeSlot } = await import('@/lib/store');
    const { date, startTime, endTime, teacher, maxParticipants } = body;
    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: '缺少必填字段（日期、开始时间、结束时间）' }, { status: 400 });
    }

    console.log('[API] Creating timeslot:', { date, startTime, endTime, teacher, maxParticipants });

    // 不传入 id，让数据库自动生成整数 ID
    const slot = await addTimeSlot({
      date, start_time: startTime, end_time: endTime,
      teacher: teacher || '',
      max_participants: String(maxParticipants || 1),
      status: 'available',
    });
    console.log('[API] Timeslot created successfully:', slot.id);
    return NextResponse.json({ success: true, data: mapSlot(slot) });
  } catch (err) {
    console.error('[API] Error in POST /api/timeslots:', err);
    const message = err instanceof Error ? err.message : '操作失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { verifyAuthToken, updateTimeSlot } = await import('@/lib/store');
    if (!verifyAuthToken(body.token)) {
      return NextResponse.json({ error: '认证已过期，请重新登录' }, { status: 401 });
    }

    const { id, date, startTime, endTime, teacher, status } = body;
    if (!id) return NextResponse.json({ error: '缺少时段ID' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (date) updates.date = date;
    if (startTime) updates.start_time = startTime;
    if (endTime) updates.end_time = endTime;
    if (teacher) updates.teacher = teacher;
    if (status) updates.status = status;

    const slot = await updateTimeSlot(id, updates);
    return NextResponse.json({ success: true, data: mapSlot(slot) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { verifyAuthToken, deleteTimeSlot } = await import('@/lib/store');
    if (!verifyAuthToken(body.token)) {
      return NextResponse.json({ error: '认证已过期，请重新登录' }, { status: 401 });
    }

    const { id } = body;
    if (!id) return NextResponse.json({ error: '缺少时段ID' }, { status: 400 });

    await deleteTimeSlot(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
