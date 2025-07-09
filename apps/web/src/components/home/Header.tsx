// apps/web/src/components/layout/Header.tsx (VERSÃO ATUALIZADA)
'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, LayoutList, UserCog } from 'lucide-react'; // Ícones
import Image from 'next/image'; // Importa o componente de Imagem do Next.js
import Link from 'next/link';

export default function Header() {
  return (
    <header className='w-full bg-black text-white shadow-lg border-b-2 border-yellow-400/50'>
      <TooltipProvider>
        <nav className='container mx-auto flex items-center justify-between p-3'>
          {/* Lado Esquerdo: Logo da Empresa */}
          <Link href='/' aria-label='Página Inicial'>
            <Image
              src='/logo.png' // Caminho para a logo na pasta /public
              alt='Logo da Empresa'
              width={160} // Largura original para evitar pulos de layout
              height={45} // Altura original
              className='h-11 w-auto' // Tamanho responsivo
              priority // Carrega a logo com prioridade
            />
          </Link>
          <div>
            <h1 className='text-3xl font-bold text-white'>
              Premiação - Viação Pioneira
            </h1>
          </div>
          {/* Lado Direito: Navegação por Ícones e Botão de Admin */}
          <div className='flex items-center gap-2'>
            {/* Ícone para "Como funciona?" com Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href='/como-funciona'>
                  <Button variant='ghost' size='icon'>
                    <HelpCircle className='h-5 w-5 text-gray-300 hover:text-white transition-colors' />
                    <span className='sr-only'>Como funciona?</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Como funciona?</p>
              </TooltipContent>
            </Tooltip>

            {/* Ícone para "Changelog" com Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href='/changelog'>
                  <Button variant='ghost' size='icon'>
                    <LayoutList className='h-5 w-5 text-gray-300 hover:text-white transition-colors' />
                    <span className='sr-only'>Changelog</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Changelog</p>
              </TooltipContent>
            </Tooltip>

            {/* Botão de Acesso Administrativo */}
            <Link href='/login'>
              <Button className='bg-yellow-400 text-black hover:bg-yellow-500'>
                <UserCog className='mr-2 h-4 w-4' />
                Admin
              </Button>
            </Link>
          </div>
        </nav>
      </TooltipProvider>
    </header>
  );
}
