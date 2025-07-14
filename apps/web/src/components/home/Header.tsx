// apps/web/src/components/home/Header.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Award, HelpCircle, LayoutList, Sparkles, UserCog } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className='w-full bg-gradient-to-r from-black via-gray-900 to-black text-white shadow-xl border-b-4 border-yellow-400'>
      <TooltipProvider>
        <nav className='container mx-auto flex items-center justify-between p-4 gap-4'>
          {/* Lado Esquerdo: Logo da Empresa */}
          <Link
            href='/'
            aria-label='Página Inicial'
            className='flex items-center space-x-2 md:space-x-4 group transition-all duration-300 hover:scale-105 min-w-0 flex-shrink'
          >
            <div className='relative flex-shrink-0'>
              <div className='absolute inset-0 bg-yellow-400 rounded-full blur-sm opacity-20 group-hover:opacity-40 transition-opacity duration-300'></div>
              <Image
                src='/logo.png'
                alt='Logo da Empresa'
                width={160}
                height={45}
                className='h-8 md:h-12 w-auto relative z-10'
                priority
              />
            </div>
            <div className='flex flex-col min-w-0'>
              <div className='flex items-center space-x-1 md:space-x-2'>
                <Award className='h-4 w-4 md:h-6 md:w-6 text-yellow-400 flex-shrink-0' />
                <h1 className='text-lg md:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent tracking-wide leading-tight'>
                  Viação Pioneira
                </h1>
              </div>
              <p className='text-xs md:text-sm text-gray-300 font-normal tracking-wide leading-tight'>
                Sistema de Premiação
              </p>
            </div>
          </Link>

          {/* Lado Direito: Navegação - Layout Responsivo */}
          <div className='flex items-center gap-1 md:gap-3 flex-shrink-0'>
            {/* Ícones de navegação - Ocultos em mobile muito pequeno */}
            <div className='hidden sm:flex items-center gap-1 md:gap-3'>
              {/* Ícone para "Como funciona?" */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href='/como-funciona'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='relative group hover:bg-yellow-400/10 hover:border-yellow-400/30 border border-transparent transition-all duration-300 h-8 w-8 md:h-10 md:w-10'
                    >
                      <HelpCircle className='h-4 w-4 md:h-5 md:w-5 text-gray-300 group-hover:text-yellow-400 transition-colors duration-300' />
                      <span className='sr-only'>Como funciona?</span>
                      <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-400/0 to-yellow-400/0 group-hover:from-yellow-400/5 group-hover:to-yellow-400/10 transition-all duration-300'></div>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className='bg-gray-800 text-white border-yellow-400/30'>
                  <p>Como funciona o sistema?</p>
                </TooltipContent>
              </Tooltip>

              {/* Ícone para "Changelog" */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href='/changelog'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='relative group hover:bg-yellow-400/10 hover:border-yellow-400/30 border border-transparent transition-all duration-300 h-8 w-8 md:h-10 md:w-10'
                    >
                      <LayoutList className='h-4 w-4 md:h-5 md:w-5 text-gray-300 group-hover:text-yellow-400 transition-colors duration-300' />
                      <span className='sr-only'>Changelog</span>
                      <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-400/0 to-yellow-400/0 group-hover:from-yellow-400/5 group-hover:to-yellow-400/10 transition-all duration-300'></div>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className='bg-gray-800 text-white border-yellow-400/30'>
                  <p>Novidades e atualizações</p>
                </TooltipContent>
              </Tooltip>

              {/* Separador visual - Oculto em mobile */}
              <div className='hidden md:block h-8 w-px bg-gradient-to-b from-transparent via-yellow-400/30 to-transparent'></div>
            </div>

            {/* Botão de Acesso Administrativo - Responsivo */}
            <Link href='/login'>
              <Button className='relative cursor-pointer group bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold hover:from-yellow-500 hover:to-yellow-600 shadow-lg hover:shadow-yellow-400/25 transition-all duration-300 rounded-lg overflow-hidden text-xs md:text-sm px-2 md:px-6 py-1.5 md:py-2 h-8 md:h-auto'>
                <div className='absolute inset-0 bg-gradient-to-r from-yellow-300/0 via-white/20 to-yellow-300/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700'></div>
                <div className='relative flex items-center space-x-1 md:space-x-2'>
                  <UserCog className='h-3 w-3 md:h-4 md:w-4 flex-shrink-0' />
                  <span className='hidden sm:inline'>Área Administrativa</span>
                  <span className='sm:hidden'>Admin</span>
                  <Sparkles className='h-2.5 w-2.5 md:h-3 md:w-3 opacity-60 hidden md:inline' />
                </div>
              </Button>
            </Link>
          </div>
        </nav>
      </TooltipProvider>
    </header>
  );
}
