// apps/web/src/app/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
// Importa componentes da Tabela Shadcn (ajuste o caminho se diferente)
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'; // Assumindo que @/components/ui/table existe após 'add table'

// Interface para nossos dados mockados (PODEMOS MOVER PARA shared-types DEPOIS!)
interface RankingEntry {
  RANK: number;
  SETOR: string;
  PONTUACAO: number;
}

const fetchRankingData = async (): Promise<RankingEntry[]> => {
  const res = await fetch('http://localhost:3001/api/poc-data'); // Continua chamando a mesma API
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao buscar dados da API`);
  }
  return res.json();
};

export default function HomePage() {
  const {
    data: rankingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['rankingData'], // Mudei a chave para clareza
    queryFn: fetchRankingData,
  });

  return (
    <main className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>
        Premiação Filiais - Ranking MVP
      </h1>

      {isLoading && <p className='text-blue-600'>Carregando ranking...</p>}
      {error && (
        <p className='text-red-500'>Erro ao buscar ranking: {error.message}</p>
      )}

      {rankingData && (
        <Table>
          <TableCaption>
            Ranking da Premiação (MVP com dados simulados).
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[100px]'>Posição</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead className='text-right'>Pontuação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankingData.map((entry) => (
              <TableRow key={entry.SETOR}>
                <TableCell className='font-medium'>{entry.RANK}º</TableCell>
                <TableCell>{entry.SETOR}</TableCell>
                {/* Formatando pontuação com 2 casas decimais */}
                <TableCell className='text-right'>
                  {entry.PONTUACAO.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
