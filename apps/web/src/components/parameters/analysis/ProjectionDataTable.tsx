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
  currentPeriodData: EntradaResultadoDetalhado[];
  period: CompetitionPeriod;
  // ✅ NOVAS PROPS PARA CLAREZA
  criterionName: string;
  formattedPeriod: string;
}

export const ProjectionDataTable = ({
  currentPeriodData,
  period,
  criterionName,
  formattedPeriod,
}: ProjectionDataTableProps) => {
  const projectionData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(period.dataInicio);

    const effectiveToday =
      today > new Date(period.dataFim) ? new Date(period.dataFim) : today;

    if (effectiveToday < startDate) return [];

    const daysElapsed = Math.ceil(
      (effectiveToday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalDaysInMonth = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0
    ).getDate();

    if (daysElapsed <= 0) return [];

    return currentPeriodData.map((item) => {
      const dailyAverage = (item.valorRealizado ?? 0) / daysElapsed;
      const projection = dailyAverage * totalDaysInMonth;
      return {
        sectorName: item.setorNome,
        currentValue: item.valorRealizado,
        projectedValue: projection,
      };
    });
  }, [currentPeriodData, period]);

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
                  {row.currentValue?.toLocaleString('pt-BR') ?? '-'}
                </TableCell>
                <TableCell className='text-right font-semibold'>
                  {Math.round(row.projectedValue).toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
