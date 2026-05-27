'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  LogOut,
  AlertCircle,
  Eye,
  Ban,
  Users,
  Mic,
  ClipboardCopy,
  Check,
} from 'lucide-react';

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  teacher: string;
  status: 'available' | 'booked' | 'expired';
  maxParticipants: number;
}

interface Booking {
  id: string;
  bookingNo: string;
  studentName: string;
  phone: string;
  requirement: string;
  teacherName: string;
  teacher: string;
  date: string;
  timeSlot: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
}

type TabType = 'slots' | 'bookings';

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('slots');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    teacher: '',
    maxParticipants: 10,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);

  // Copy roster for a timeslot
  const handleCopyRoster = (slot: TimeSlot) => {
    const slotBookings = bookings.filter(
      (b) => b.date === slot.date && b.timeSlot === `${slot.startTime}-${slot.endTime}` && b.status !== 'cancelled'
    );
    if (slotBookings.length === 0) {
      showMessage('error', '该时段暂无预约人员');
      return;
    }
    const lines = [
      `${slot.teacher} ${slot.date} ${slot.startTime}-${slot.endTime}`,
      ...slotBookings.map((b, i) => `${i + 1}. ${b.studentName} ${b.phone} ${b.requirement || ''} ${b.teacherName || ''}`),
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSlotId(slot.id);
      showMessage('success', `已复制 ${slotBookings.length} 人名单`);
      setTimeout(() => setCopiedSlotId(null), 2000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedSlotId(slot.id);
      showMessage('success', `已复制 ${slotBookings.length} 人名单`);
      setTimeout(() => setCopiedSlotId(null), 2000);
    });
  };

  // Check auth on mount
  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    if (!t) {
      router.replace('/admin-login');
      return;
    }
    setToken(t);
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setVerified(true);
        } else {
          localStorage.removeItem('admin_token');
          router.replace('/admin-login');
        }
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        router.replace('/admin-login');
      })
      .finally(() => setVerifying(false));
  }, [router]);

  // Load data
  const loadData = useCallback(async () => {
    const [slotsRes, bookingsRes] = await Promise.all([
      fetch('/api/timeslots').then((r) => r.json()),
      fetch('/api/bookings').then((r) => r.json()),
    ]);
    if (slotsRes.success) setTimeSlots(slotsRes.data);
    if (bookingsRes.success) setBookings(bookingsRes.data);
  }, []);

  useEffect(() => {
    if (verified) loadData();
  }, [verified, loadData]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/admin-login');
  };

  // TimeSlot CRUD
  const openAddModal = () => {
    setEditingSlot(null);
    setFormData({ date: '', startTime: '', endTime: '', teacher: '', maxParticipants: 10 });
    setShowModal(true);
  };

  const openEditModal = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      teacher: slot.teacher,
      maxParticipants: slot.maxParticipants || 10,
    });
    setShowModal(true);
  };

  const handleSaveSlot = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.teacher) {
      showMessage('error', '请填写完整信息');
      return;
    }

    try {
      if (editingSlot) {
        const res = await fetch('/api/timeslots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', token, id: editingSlot.id, ...formData }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showMessage('success', '时段已更新');
          setShowModal(false);
          loadData();
        } else {
          showMessage('error', data.error || '操作失败');
        }
      } else {
        const res = await fetch('/api/timeslots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', token, ...formData }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showMessage('success', '时段已添加');
          setShowModal(false);
          loadData();
        } else {
          showMessage('error', data.error || '操作失败');
        }
      }
    } catch (err) {
      console.error('保存时段失败:', err);
      showMessage('error', '网络错误，请稍后重试');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('确定要删除此时段吗？')) return;
    try {
      const res = await fetch('/api/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', token, id }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', '时段已删除');
        loadData();
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', '网络错误');
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('确定要取消此预约吗？')) return;
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', token, id }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', '预约已取消');
        loadData();
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', '网络错误');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: 'bg-accent-green/20 text-accent-green',
      booked: 'bg-primary/15 text-primary',
      expired: 'bg-muted text-muted-foreground',
      confirmed: 'bg-accent-green/20 text-accent-green',
      pending: 'bg-accent-yellow/20 text-warning',
      cancelled: 'bg-destructive/15 text-destructive',
    };
    const labels: Record<string, string> = {
      available: '可用',
      booked: '已预约',
      expired: '已过期',
      confirmed: '已确认',
      pending: '待确认',
      cancelled: '已取消',
    };
    return (
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] || 'bg-muted text-muted-foreground'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Get booking count for a timeslot
  const getSlotBookingCount = (slot: TimeSlot) => {
    return bookings.filter(
      (b) => b.date === slot.date && b.timeSlot === `${slot.startTime}-${slot.endTime}` && b.status !== 'cancelled'
    ).length;
  };

  // Stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.date === todayStr && b.status !== 'cancelled').length;
  const availableSlotCount = timeSlots.filter((s) => s.status === 'available').length;
  const totalBookings = bookings.filter((b) => b.status === 'confirmed').length;

  if (verifying || !verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">验证中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card shadow-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            <span className="text-base font-bold text-foreground sm:text-lg">声乐连麦</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                管
              </div>
              <span className="text-sm text-foreground">管理员</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Title */}
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">预约时段管理</h1>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-card sm:gap-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-11 sm:w-11">
              <CalendarCheck className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground sm:text-2xl">{todayBookings}</div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">今日预约</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-card sm:gap-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-green/20 sm:h-11 sm:w-11">
              <Clock className="h-4 w-4 text-accent-green sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground sm:text-2xl">{availableSlotCount}</div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">可用时段</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-card p-3 shadow-card sm:gap-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-yellow/20 sm:h-11 sm:w-11">
              <Users className="h-4 w-4 text-accent-yellow sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground sm:text-2xl">{totalBookings}</div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">累计连麦</div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-accent-green/10 text-accent-green'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {message.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-lg bg-muted p-1 sm:mt-6">
          <button
            onClick={() => setActiveTab('slots')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'slots'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            时段管理
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'bookings'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            预约列表
          </button>
        </div>

        {/* Slots Tab - Mobile: cards, Desktop: table */}
        {activeTab === 'slots' && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">时段列表</h2>
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 sm:px-4 sm:text-sm"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                新增
              </button>
            </div>

            {/* Mobile: Card list */}
            <div className="mt-3 space-y-2 sm:hidden">
              {timeSlots.map((slot) => {
                const bookingCount = getSlotBookingCount(slot);
                return (
                  <div key={slot.id} className="rounded-xl bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-foreground">{slot.teacher}</div>
                          {statusBadge(slot.status)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {slot.date} {slot.startTime}-{slot.endTime}
                        </div>
                        <div className={`text-xs ${bookingCount >= (slot.maxParticipants || 999) ? 'text-destructive' : 'text-primary'}`}>
                          已预约 {bookingCount}/{slot.maxParticipants || '-'} 人
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-1 border-t border-border/10 pt-3">
                      <button
                        onClick={() => handleCopyRoster(slot)}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                          copiedSlotId === slot.id
                            ? 'bg-accent-green/10 text-accent-green'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {copiedSlotId === slot.id ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
                        {copiedSlotId === slot.id ? '已复制' : '复制名单'}
                      </button>
                      <button
                        onClick={() => openEditModal(slot)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {timeSlots.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">暂无时段数据</div>
              )}
            </div>

            {/* Desktop: Table */}
            <div className="mt-4 hidden overflow-hidden rounded-xl border border-border/20 bg-card shadow-card sm:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">日期</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">时间段</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">讲师</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">状态</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">预约/上限</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot, idx) => {
                      const bookingCount = getSlotBookingCount(slot);
                      return (
                        <tr
                          key={slot.id}
                          className={`border-b border-border/10 transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                        >
                          <td className="px-4 py-3 text-sm text-foreground">{slot.date}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{slot.startTime}-{slot.endTime}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{slot.teacher}</td>
                          <td className="px-4 py-3">{statusBadge(slot.status)}</td>
                          <td className="px-4 py-3 text-center text-sm text-foreground">
                            <span className={bookingCount >= (slot.maxParticipants || 999) ? 'text-destructive font-medium' : bookingCount > 0 ? 'font-medium text-primary' : ''}>
                              {bookingCount}/{slot.maxParticipants || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleCopyRoster(slot)}
                                className={`rounded-md p-1.5 transition-colors ${
                                  copiedSlotId === slot.id
                                    ? 'bg-accent-green/10 text-accent-green'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                                title="复制名单"
                              >
                                {copiedSlotId === slot.id ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => openEditModal(slot)}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title="编辑"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="删除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {timeSlots.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          暂无时段数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab - Mobile: cards, Desktop: table */}
        {activeTab === 'bookings' && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">预约列表</h2>

            {/* Mobile: Card list */}
            <div className="mt-3 space-y-2 sm:hidden">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">#{b.bookingNo}</div>
                      <div className="text-xs text-muted-foreground">{b.studentName} · {b.phone}</div>
                      <div className="text-xs text-muted-foreground">{b.teacher}</div>
                      <div className="text-xs text-muted-foreground">{b.date} {b.timeSlot}</div>
                    </div>
                    <div>{statusBadge(b.status)}</div>
                  </div>
                  {b.status !== 'cancelled' && (
                    <div className="mt-3 flex justify-end gap-1 border-t border-border/10 pt-3">
                      <button
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Eye className="h-3 w-3" />
                        查看
                      </button>
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Ban className="h-3 w-3" />
                        取消
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {bookings.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">暂无预约记录</div>
              )}
            </div>

            {/* Desktop: Table */}
            <div className="mt-4 hidden overflow-hidden rounded-xl border border-border/20 bg-card shadow-card sm:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">预约编号</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">微信昵称</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">班主任</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">讲师</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">预约时间</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">状态</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b, idx) => (
                      <tr
                        key={b.id}
                        className={`border-b border-border/10 transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-foreground">#{b.bookingNo}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{b.studentName}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{b.teacherName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{b.teacher}</td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {b.date} {b.timeSlot}
                        </td>
                        <td className="px-4 py-3">{statusBadge(b.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="查看"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {b.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="取消预约"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          暂无预约记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-dialog sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between sm:mb-5">
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {editingSlot ? '编辑时段' : '新增时段'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">日期</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-lg border-none bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">开始时间</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full rounded-lg border-none bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">结束时间</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full rounded-lg border-none bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">讲师</label>
                <input
                  type="text"
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  placeholder="请输入讲师姓名"
                  className="w-full rounded-lg border-none bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">参与人数上限</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: Number(e.target.value) })}
                  placeholder="请输入参与人数上限"
                  className="w-full rounded-lg border-none bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3 sm:mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-high"
              >
                取消
              </button>
              <button
                onClick={handleSaveSlot}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
