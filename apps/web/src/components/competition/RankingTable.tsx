// apps/web/src/components/competition/RankingTable.tsx
'use client'; // Precisa ser client se usar hooks ou event handlers, ou se for usado em Client Components

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
    return <p>Carregando ranking...</p>;
  }

  if (!rankingData || rankingData.length === 0) {
    return (
      <div className='border rounded-md p-4 text-center text-gray-500'>
        Nenhum dado de ranking para exibir.
      </div>
    );
  }

  // Se temos dados, renderiza a tabela
  return (
    <div className='border rounded-md'>
      {/* Mantém a borda */}
      <Table>
        <TableCaption>
          Classificação final (Menor pontuação = Melhor posição).
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
                  ? 'bg-yellow-100/50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                  : ''
              }
            >
              <TableCell
                className={`font-medium text-lg ${entry.RANK === 1 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}
              >
                {entry.RANK}º {entry.RANK === 1 ? '🏆' : ''}
              </TableCell>
              <TableCell
                className={`text-lg ${entry.RANK === 1 ? 'font-bold' : ''}`}
              >
                {entry.SETOR}
              </TableCell>
              <TableCell
                className={`text-right text-lg font-semibold ${entry.RANK === 1 ? 'text-yellow-600 dark:text-yellow-400' : ''}`}
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
