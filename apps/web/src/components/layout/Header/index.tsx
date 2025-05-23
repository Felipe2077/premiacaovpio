// apps/web/src/components/layout/Header.tsx
import { Settings } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className='bg-amber-100 text-black p-4 sticky top-0 z-50'>
      <nav className='container mx-auto flex flex-wrap gap-x-6 gap-y-2 items-center'>
        <Link href='/' className='font-bold text-2xl mr-auto'>
          Premiação Viação Pioneira🥇🥈🥉
        </Link>

        {/*
        <Link href="/visao-pbi" className="text-sm sm:text-base text-gray-500 cursor-not-allowed" aria-disabled="true" onClick={(e)=>e.preventDefault()}>
            Visão PBI
        </Link>
        */}

       <Link
         href='/admin'
         className='group flex items-center gap-2 bg-amber-100 hover:bg-amber-200 active:bg-amber-300
           px-4 py-2 rounded-md transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
      aria-label='Abrir configurações'
>
  <Settings className='h-4 w-4 text-amber-800 group-hover:rotate-45 transition-transform duration-300' />
  <span className='font-medium text-amber-900'>Ajustes</span>
</Link>
      </nav>
    </header>
  );
}

// Adicionar um export default se preferir ou precisar para alguma configuração
// export default Header;
