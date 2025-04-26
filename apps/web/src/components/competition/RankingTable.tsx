// apps/web/src/components/competition/RankingTable.tsx
'use client'; // Precisa ser client se usar hooks ou event handlers, ou se for usado em Client Components

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNumber } from '@/lib/utils'; // Importa a função de formatação
import { EntradaRanking } from '@sistema-premiacao/shared-types';

// Define as propriedades que o componente espera receber
interface RankingTableProps {
  data: EntradaRanking[] | undefined | null;
  isLoading: boolean;
  error: Error | null;
}

export function RankingTable({
  data: rankingData,
  isLoading,
}: RankingTableProps) {
  // Renderização condicional baseada nas props
  if (isLoading) {
    return (
      <div className='border rounded-md p-4 space-y-3'>
        {/* Simula Cabeçalho */}
        <div className='flex justify-between'>
          <Skeleton className='h-5 w-1/4' />
          <Skeleton className='h-5 w-1/4' />
          <Skeleton className='h-5 w-1/4' />
        </div>
        {/* Simula 4 Linhas */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className='flex justify-between space-x-2'>
            <Skeleton className='h-4 w-1/6' /> {/* Posição */}
            <Skeleton className='h-4 w-3/6' /> {/* Setor */}
            <Skeleton className='h-4 w-2/6' /> {/* Pontuação */}
          </div>
        ))}
        <Skeleton className='h-3 w-1/2 mt-2' /> {/* Simula Caption */}
      </div>
    );
  }

  // Se temos dados, renderiza a tabela
  return (
    <div className='border rounded-md'>
      <Table>
        <TableCaption>
          Classificação atual (Menor pontuação = Melhor posição).
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[80px]'>Posição</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead className='text-right'>Pontuação Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankingData.map((entry) => (
            // Destaque para o 1º lugar
            <TableRow
              key={entry.SETOR}
              className={
                entry.RANK === 1
                  ? 'bg-green-100/70 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
                  : ''
              }
            >
              <TableCell
                className={`font-medium text-lg ${entry.RANK === 1 ? 'text-green-600 dark:text-green-400' : ''}`}
              >
                {entry.RANK}º {entry.RANK === 1 ? '🏆' : ''}
              </TableCell>
              <TableCell
                className={`text-lg ${entry.RANK === 1 ? 'font-bold' : ''}`}
              >
                {entry.SETOR}
              </TableCell>
              <TableCell
                className={`text-right text-lg font-semibold ${entry.RANK === 1 ? 'text-green-600 dark:text-green-400' : ''}`}
              >
                {formatNumber(entry.PONTUACAO)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default RankingTable; // Exporta como default para facilitar importação
