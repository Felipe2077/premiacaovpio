// apps/web/src/components/parameters/analysis/ComparisonDataTable.tsx - VERSÃO COM UI MELHORADA
'use client';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EntradaResultadoDetalhado } from '@/hooks/useParametersData';

interface ComparisonDataTableProps {
  data: EntradaResultadoDetalhado[];
  // ✅ NOVAS PROPS PARA CLAREZA
  period: string | null;
  criterionName: string;
  formattedPeriod: string;
}

export const ComparisonDataTable = ({
  data,
  period,
  criterionName,
  formattedPeriod,
}: ComparisonDataTableProps) => {
  if (!data || data.length === 0) {
    return (
      <div className='text-center text-muted-foreground py-8'>
        Não há dados de Meta vs. Realizado para o período de {formattedPeriod}.
      </div>
    );
  }

  return (
    <div>
      {/* ✅ TÍTULO ATUALIZADO PARA MAIOR CLAREZA */}
      {/* <h3 className='text-lg font-semibold mb-2'>
        Meta vs. Realizado:{' '}
        <span className='text-amber-600'>{criterionName}</span> -{' '}
        <span className='capitalize'>{formattedPeriod}</span>
      </h3> */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader className='bg-amber-300/80 dark:bg-amber-950/20'>
            <TableRow>
              <TableHead className='font-bold'>Filial</TableHead>
              <TableHead className='text-center font-bold'>
                Meta Definida
              </TableHead>
              <TableHead className='text-center font-bold'>Realizado</TableHead>
              <TableHead className='font-bold'>Atingimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.setorId}>
                <TableCell>{row.setorNome}</TableCell>
                <TableCell className='text-center'>
                  {row.valorMeta?.toLocaleString('pt-BR') ?? 'N/D'}
                </TableCell>
                <TableCell className='text-center'>
                  {row.valorRealizado?.toLocaleString('pt-BR') ?? '-'}
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <Progress
                      value={(row.percentualAtingimento ?? 0) * 100}
                      className='h-2 w-[80%]'
                    />
                    <span className='text-xs font-medium text-muted-foreground'>
                      {((row.percentualAtingimento ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
