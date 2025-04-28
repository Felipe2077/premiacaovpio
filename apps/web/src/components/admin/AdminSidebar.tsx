// apps/web/src/components/admin/AdminSidebar.tsx
'use client';

import { Separator } from '@/components/ui/separator';
import {
  CalendarDays,
  History,
  LayoutDashboard,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminSidebar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
    { href: '/admin/parameters', label: 'Parâmetros', icon: Wrench },
    { href: '/admin/expurgos', label: 'Expurgos', icon: ShieldAlert },
    { href: '/admin/audit-logs', label: 'Logs de Auditoria', icon: History },
  ];

  const currentPeriod = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const formattedPeriod =
    currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1);

  return (
    <aside className='w-60 h-screen fixed left-0 border-r bg-muted/40 p-4 flex flex-col'>
      <h2 className='text-lg font-semibold mb-4 pl-2'>Painel Admin</h2>
      <div className='flex items-center gap-2 text-sm text-green-600 mb-3 pl-2'>
        <CalendarDays className='h-4 w-4' />
        <span>{'Vigência: ' + formattedPeriod}</span>
      </div>
      <Separator className='mb-4' />
      <nav className='flex flex-col gap-2'>
        {navLinks.map((link) => {
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all
                ${
                  isActive
                    ? 'bg-amber-100 text-primary font-medium'
                    : 'text-muted-foreground hover:text-primary hover:bg-amber-50'
                }`}
            >
              <link.icon className='h-4 w-4' />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
