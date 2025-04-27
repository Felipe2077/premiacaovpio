// apps/web/src/app/admin/layout.tsx
import AdminSidebar from '@/components/admin/AdminSidebar'; // Importa nosso sidebar
import React from 'react';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Usa Flexbox para criar layout de sidebar + conteúdo
    <div className='flex min-h-screen w-full'>
      {/* Garante altura e largura */}
      <AdminSidebar /> {/* Renderiza o menu lateral */}
      {/* Área de conteúdo principal que vai renderizar as páginas filhas */}
      <main className='flex-grow p-4 lg:p-6 bg-background'>
        {/* Ocupa espaço restante, adiciona padding */}
        {children} {/* Aqui entram page.tsx, parameters/page.tsx, etc. */}
      </main>
    </div>
  );
}
