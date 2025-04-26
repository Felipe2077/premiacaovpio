// apps/web/src/app/layout.tsx
import Providers from '@/components/Providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Premiação Filiais',
  description: 'Acompanhamento da Premiação',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='pt-BR'>
      {/* Adicionado flex layout para footer */}
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        {/* --- BARRA DE NAVEGAÇÃO SIMPLES --- */}
        <header className='bg-gray-800 text-white p-4 shadow-md  top-0 z-50 w-full'>
          {/* Sticky para fixar */}
          <nav className='container mx-auto flex flex-wrap gap-x-6 gap-y-2 items-center'>
            <Link href='/' className='font-bold text-lg mr-auto'>
              Premiação MVP
            </Link>
            <Link
              href='/'
              className='text-sm sm:text-base hover:text-gray-300 transition-colors'
            >
              Visão Detalhada (B)
            </Link>
            {/* --- ADICIONAR/DESCOMENTAR ESTE --- */}
            <Link
              href='/visao-a'
              className='text-sm sm:text-base hover:text-gray-300 transition-colors'
            >
              Visão Detalhada (A)
            </Link>
            {/* ----------------------------------- */}
            {/* <Link href="/visao-pbi" className="text-sm sm:text-base text-gray-500 cursor-not-allowed" aria-disabled="true" onClick={(e)=>e.preventDefault()}>Visão PBI</Link> */}
            <Link
              href='/admin'
              className='text-sm sm:text-base hover:text-gray-300 transition-colors'
            >
              Admin (Conceitual)
            </Link>
          </nav>
        </header>
        {/* ----------------------------------- */}

        {/* Conteúdo principal da página (com flex-grow) */}
        <main className='max-w-screen-3xl mx-auto p-4'>
          <Providers>{children}</Providers>
        </main>

        {/* Footer simples */}
        <footer className='bg-gray-200 text-center p-2 text-sm text-gray-600 mt-auto'>
          {/* mt-auto para empurrar para baixo */}
          Sistema de Premiação - MVP V1.7 - {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
