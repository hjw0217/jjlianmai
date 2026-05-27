'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { CheckCircle2, Home, Clock, User, Calendar, AlertCircle, Mic, Phone, Copy } from 'lucide-react';
import Link from 'next/link';

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
  status: string;
  createdAt: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!booking) return;
    const text = `预约编号：${booking.bookingNo}
演唱曲目：${booking.requirement || '未填写'}
班主任名字：${booking.teacherName || '未填写'}
预约时间：${booking.date} ${booking.timeSlot}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/bookings`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const found = res.data.find((b: Booking) => b.id === id);
          setBooking(found || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-sm text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">未找到预约信息</p>
          <Link href="/" className="text-sm text-primary hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const maskedPhone = booking.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Success Header */}
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent-green/20 sm:mb-4 sm:h-16 sm:w-16">
            <CheckCircle2 className="h-7 w-7 text-accent-green sm:h-8 sm:w-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">预约成功！</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">您的连麦课程已成功预约，请按时上线</p>
        </div>

        {/* Confirmation Card */}
        <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-card shadow-float">
          {/* Top gradient bar */}
          <div className="h-2 bg-gradient-to-r from-primary via-accent-yellow to-accent-pink" />

          <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
            {/* Teacher Info */}
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
                <Mic className="h-4 w-4 text-primary" />
                讲师信息
              </h2>
              <div className="mt-3 rounded-lg bg-muted px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="text-xs text-muted-foreground sm:text-sm">讲师</div>
                <div className="text-sm font-semibold text-foreground sm:text-base">{booking.teacher}</div>
              </div>
            </div>

            {/* Time Info */}
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
                <Clock className="h-4 w-4 text-primary" />
                时间信息
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2 sm:px-3">
                  <Calendar className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">日期</div>
                    <div className="text-xs font-semibold text-foreground sm:text-sm">{booking.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2 sm:px-3">
                  <Clock className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">时段</div>
                    <div className="text-xs font-semibold text-foreground sm:text-sm">{booking.timeSlot}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Info */}
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
                <User className="h-4 w-4 text-primary" />
                学员信息
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-lg bg-muted px-2.5 py-2 sm:px-3">
                  <div className="text-[10px] text-muted-foreground sm:text-xs">微信昵称</div>
                  <div className="text-xs font-semibold text-foreground sm:text-sm">{booking.studentName}</div>
                </div>
                <div className="rounded-lg bg-muted px-2.5 py-2 sm:px-3">
                  <div className="text-[10px] text-muted-foreground sm:text-xs">电话</div>
                  <div className="text-xs font-semibold text-foreground sm:text-sm">{maskedPhone}</div>
                </div>
              </div>
              {booking.requirement && (
                <div className="mt-2 rounded-lg bg-muted px-2.5 py-2 sm:mt-3 sm:px-3">
                  <div className="text-[10px] text-muted-foreground sm:text-xs">演唱曲目</div>
                  <div className="text-xs font-semibold text-foreground sm:text-sm">{booking.requirement}</div>
                </div>
              )}
              {booking.teacherName && (
                <div className="mt-2 rounded-lg bg-muted px-2.5 py-2 sm:mt-3 sm:px-3">
                  <div className="text-[10px] text-muted-foreground sm:text-xs">班主任名字</div>
                  <div className="text-xs font-semibold text-foreground sm:text-sm">{booking.teacherName}</div>
                </div>
              )}
            </div>

            {/* Booking No & Status */}
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 sm:px-4 sm:py-3">
              <div>
                <div className="text-[10px] text-muted-foreground sm:text-xs">预约编号</div>
                <div className="text-xs font-semibold text-foreground sm:text-sm">#{booking.bookingNo}</div>
              </div>
              <span className="rounded-full bg-accent-green/20 px-2.5 py-1 text-[10px] font-semibold text-accent-green sm:px-3 sm:text-xs">
                已确认
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mx-auto mt-6 flex max-w-lg items-center justify-center gap-3 sm:mt-8 sm:gap-4">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-6 py-2.5 text-sm font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float sm:px-8 sm:py-3"
          >
            <Copy className="h-4 w-4" />
            {copied ? '已复制' : '复制信息'}
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float sm:px-8 sm:py-3"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Link>
        </div>

        {/* Tips */}
        <div className="mx-auto mt-6 max-w-lg sm:mt-8">
          <div className="rounded-xl bg-card p-4 shadow-card sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">温馨提示</h3>
            <ul className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <li className="flex items-center gap-1.5">
                <Mic className="h-3 w-3 shrink-0 text-primary" />
                请提前5分钟进入连麦房间
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0 text-primary" />
                确保网络稳定、麦克风正常
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-accent-green" />
                试听连麦课完全免费
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0 text-primary" />
                如需变更请联系客服
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
