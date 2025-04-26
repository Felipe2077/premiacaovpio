// apps/web/src/components/layout/Header.tsx
import Link from 'next/link';

export function Header() {
  return (
    <header className='bg-amber-100/70 text-black p-4 sticky top-0 z-50'>
      <nav className='container mx-auto flex flex-wrap gap-x-6 gap-y-2 items-center'>
        <Link href='/' className='font-bold text-2xl mr-auto'>
          Premiação Viação Pioneira🥇🥈🥉
        </Link>
        <Link
          href='/'
          className='text-sm sm:text-base hover:text-amber-300 transition-colors'
        >
          Visão Detalhada (B)
        </Link>

        {/* Links Placeholders */}
        <Link
          href='/visao-a'
          className='text-sm sm:text-base hover:text-amber-300 transition-colors'
        >
          Visão Detalhada (A)
        </Link>
        {/*
        <Link href="/visao-pbi" className="text-sm sm:text-base text-gray-500 cursor-not-allowed" aria-disabled="true" onClick={(e)=>e.preventDefault()}>
            Visão PBI
        </Link>
        */}

        <Link
          href='/admin'
          className='text-sm sm:text-base hover:text-amber-300 transition-colors'
        >
          Admin (Conceitual)
        </Link>
      </nav>
    </header>
  );
}

// Adicionar um export default se preferir ou precisar para alguma configuração
// export default Header;
