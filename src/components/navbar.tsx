'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mic } from 'lucide-react';

const navItems = [
  { href: '/', label: '预约连麦' },
  { href: '/admin', label: '管理后台' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-card shadow-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
          <Mic className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          <span className="text-base font-bold text-foreground sm:text-lg">声乐连麦</span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
