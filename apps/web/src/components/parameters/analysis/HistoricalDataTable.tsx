// apps/web/src/components/parameters/analysis/HistoricalDataTable.tsx - VERSÃO COM TÍTULO PADRONIZADO
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface HistoricalData {
  sectorName: string;
  monthlyData: { [period: string]: number | null };
  average: number | null;
}

interface HistoricalDataTableProps {
  data: HistoricalData[];
  periods: string[];
  isLoading: boolean;
  criterionName: string;
  decimalPlaces: number;
  // ✅ NOVA PROP PARA O RÓTULO DO PERÍODO
  periodLabel: string;
}

export const HistoricalDataTable = ({
  data,
  periods,
  isLoading,
  criterionName,
  decimalPlaces,
  periodLabel, // ✅ RECEBE A NOVA PROP
}: HistoricalDataTableProps) => {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-48'>
        <Loader2 className='h-6 w-6 animate-spin' />
      </div>
    );
  }

  const numberFormatOptions = {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  };

  return (
    <div>
      {/* ✅ TÍTULO ATUALIZADO PARA O NOVO PADRÃO */}
      {/* <h3 className='text-lg font-semibold mb-2'>
        Histórico de Realizado:{' '}
        <span className='text-amber-600'>{criterionName}</span> - {periodLabel}
      </h3> */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader className='bg-amber-300/80 dark:bg-amber-950/20'>
            <TableRow>
              <TableHead className='font-bold text-base'>Filial</TableHead>
              {periods.map((period) => (
                <TableHead
                  key={period}
                  className='text-center text-base font-bold'
                >
                  {period}
                </TableHead>
              ))}
              <TableHead className='text-center text-base font-bold bg-amber-300/80'>
                Média
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.sectorName}>
                <TableCell>{row.sectorName}</TableCell>
                {periods.map((period) => (
                  <TableCell key={period} className='text-center text-base'>
                    {row.monthlyData[period]?.toLocaleString(
                      'pt-BR',
                      numberFormatOptions
                    ) ?? '-'}
                  </TableCell>
                ))}
                <TableCell className='text-center font-semibold bg-amber-100/80 text-base'>
                  {row.average?.toLocaleString('pt-BR', numberFormatOptions) ??
                    '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
