// apps/web/src/app/admin/parameters/_components/columns-parameters.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ParameterValueAPI } from '@/hooks/useParameters';
import { formatDate } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { ParameterActionsCell } from './parameter-actions-cell'; // Importar o novo componente

interface CompetitionPeriodForActions {
  id: number;
  mesAno: string;
  status: string;
}

interface ColumnsParametersProps {
  onEdit: (parameter: ParameterValueAPI) => void;
  onDelete: (parameter: ParameterValueAPI) => void;
  onShowHistory: (parameter: ParameterValueAPI) => void;
  todayStr: string;
  competitionPeriods: CompetitionPeriodForActions[];
}

export const columnsParameters = ({
  onEdit,
  onDelete,
  onShowHistory,
  todayStr,
  competitionPeriods,
}: ColumnsParametersProps): ColumnDef<ParameterValueAPI>[] => [
  {
    accessorKey: 'nomeParametro',
    header: 'Nome do Parâmetro',
    cell: ({ row }) => (
      <div className='font-medium'>{row.original.nomeParametro}</div>
    ),
  },
  {
    accessorKey: 'valor',
    header: 'Valor',
  },
  {
    accessorKey: 'criterio.nome',
    header: 'Critério',
    cell: ({ row }) => row.original.criterio?.nome || '-',
  },
  {
    accessorKey: 'setor.nome',
    header: 'Setor',
    cell: ({ row }) => row.original.setor?.nome || 'Geral',
  },
  {
    accessorKey: 'dataInicioEfetivo',
    header: 'Início Vigência',
    cell: ({ row }) => formatDate(row.original.dataInicioEfetivo),
  },
  {
    accessorKey: 'dataFimEfetivo',
    header: 'Fim Vigência',
    cell: ({ row }) => {
      const dataFim = row.original.dataFimEfetivo;
      return dataFim ? (
        formatDate(dataFim)
      ) : (
        <span className='italic text-slate-500'>Vigente</span>
      );
    },
  },
  {
    id: 'statusMeta',
    header: 'Status',
    cell: ({ row }) => {
      const param = row.original;
      const isVigente =
        !param.dataFimEfetivo ||
        new Date(param.dataFimEfetivo) >= new Date(todayStr);
      return (
        <Badge
          variant={isVigente ? 'default' : 'outline'}
          className={
            isVigente
              ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
              : 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400'
          }
        >
          {isVigente ? 'Ativa' : 'Expirada'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'justificativa',
    header: 'Justificativa',
    cell: ({ row }) => {
      const justificativa = row.original.justificativa;
      if (!justificativa) return '-';
      const shortJustificativa = justificativa.substring(0, 25);
      return (
        <Tooltip>
          <TooltipTrigger className='cursor-help underline decoration-dotted decoration-slate-400 hover:decoration-slate-600'>
            {shortJustificativa}
            {justificativa.length > 25 ? '...' : ''}
          </TooltipTrigger>
          <TooltipContent className='max-w-xs whitespace-pre-wrap bg-background p-2 shadow-lg border rounded-md'>
            <p>{justificativa}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Ações</div>,
    cell: ({ row }) => (
      <ParameterActionsCell
        parameter={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onShowHistory={onShowHistory}
        todayStr={todayStr}
        competitionPeriods={competitionPeriods}
      />
    ),
  },
];
