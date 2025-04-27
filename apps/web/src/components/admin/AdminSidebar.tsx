// apps/web/src/components/admin/AdminSidebar.tsx
'use client'; // Necessário se usar hooks como usePathname no futuro para destacar link ativo

import { Separator } from '@/components/ui/separator'; // Shadcn Separator
import { History, LayoutDashboard, ShieldAlert, Wrench } from 'lucide-react'; // Ícones
import Link from 'next/link';

// Poderia receber props no futuro, como o pathname atual para destacar link ativo
export function AdminSidebar() {
  // Lista de links da navegação admin
  const navLinks = [
    { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
    { href: '/admin/parameters', label: 'Parâmetros', icon: Wrench }, // Wrench como ícone para parâmetros/config
    { href: '/admin/expurgos', label: 'Expurgos', icon: ShieldAlert },
    { href: '/admin/audit-logs', label: 'Logs de Auditoria', icon: History },
    // { href: '/admin/users', label: 'Usuários', icon: Users }, // Exemplo para futuro
  ];

  return (
    <aside className='w-60 h-screen sticky top-0 border-r bg-muted/40 p-4 flex flex-col'>
      {' '}
      {/* Largura fixa, altura tela, fixa no topo, borda, fundo sutil, padding */}
      <h2 className='text-lg font-semibold mb-4 pl-2'>Painel Admin</h2>
      <Separator className='mb-4' />
      <nav className='flex flex-col gap-2'>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            // Adicionar lógica de 'active' state depois com usePathname()
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted`} // Estilo Shadcn/inspirado
          >
            <link.icon className='h-4 w-4' />
            {link.label}
          </Link>
        ))}
      </nav>
      {/* Pode adicionar mais itens no sidebar depois */}
    </aside>
  );
}

export default AdminSidebar;
