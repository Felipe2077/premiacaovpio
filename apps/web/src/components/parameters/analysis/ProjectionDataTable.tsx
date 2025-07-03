// apps/web/src/components/parameters/analysis/ProjectionDataTable.tsx - VERSÃO COM UI MELHORADA
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CompetitionPeriod,
  EntradaResultadoDetalhado,
} from '@/hooks/useParametersData';
import { useMemo } from 'react';

interface ProjectionDataTableProps {
  projectionData: {
    sectorName: string;
    realizadoNoPeriodo: number | null;
    valorProjetado: number;
  }[];
  period: CompetitionPeriod;
  criterionName: string;
  formattedPeriod: string;
}

export const ProjectionDataTable = ({
  projectionData,
  period,
  criterionName,
  formattedPeriod,
}: ProjectionDataTableProps) => {
  if (!projectionData.length) return null;

  return (
    <div>
      {/* ✅ TÍTULO ATUALIZADO PARA MAIOR CLAREZA */}
      <h3 className='text-lg font-semibold mb-2'>
        Projeção de <span className='text-amber-600'>{criterionName}</span> para{' '}
        <span className='capitalize'>{formattedPeriod}</span>
      </h3>
      <div className='rounded-md border'>
        <Table>
          <TableHeader className='bg-amber-300/80 dark:bg-amber-950/20'>
            <TableRow>
              <TableHead className='font-bold'>Filial</TableHead>
              <TableHead className='text-right font-bold'>
                Realizado Atual
              </TableHead>
              <TableHead className='text-right font-bold'>
                Projeção Fim do Mês
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectionData.map((row) => (
              <TableRow key={row.sectorName}>
                <TableCell>{row.sectorName}</TableCell>
                <TableCell className='text-right'>
                  {row.realizadoNoPeriodo?.toLocaleString('pt-BR') ?? '-'}
                </TableCell>
                <TableCell className='text-right font-semibold'>
                  {Math.round(row.valorProjetado).toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
