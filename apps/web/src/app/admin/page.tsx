// apps/web/src/app/admin/page.tsx
'use client';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AdminDashboardPage() {
  return (
    <TooltipProvider>
      {/* Removi o container/main daqui pois o layout.tsx já tem */}
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Visão Geral - Admin</h1>
        <p className='mb-6 text-sm text-gray-600 italic dark:text-gray-400'>
          Status rápido do sistema de premiação.
        </p>
      </div>
    </TooltipProvider>
  );
}
