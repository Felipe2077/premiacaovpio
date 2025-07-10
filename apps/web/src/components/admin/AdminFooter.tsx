// apps/web/src/components/admin/AdminFooter.tsx
'use client';

import { Mail } from 'lucide-react';

export function AdminFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-t border-amber-500/20 mt-12'>
      {/* Gradiente sutil de transição */}
      <div className='h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent'></div>

      <div className='px-4 sm:px-6 lg:px-8 py-3'>
        <div className='max-w-7xl mx-auto'>
          {/* Conteúdo do Footer - Layout Simples */}
          <div className='flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 text-sm'>
            {/* Copyright */}
            <div className='text-slate-300'>
              © {currentYear} Viação Pioneira. Todos os direitos reservados.
            </div>

            {/* Versão e Suporte */}
            <div className='flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6 text-slate-400'>
              {/* Versão */}
              <div className='text-xs'>Sistema v1.0.0</div>

              {/* Email de Suporte */}
              <div className='flex items-center space-x-2'>
                <Mail className='h-3 w-3 text-amber-400' />
                <a
                  href='mailto:suporte@viacaopionieira.com.br'
                  className='text-slate-300 hover:text-amber-400 transition-colors text-xs'
                >
                  suporte@viacaopionieira.com.br
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
