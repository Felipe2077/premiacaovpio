// apps/web/src/app/admin/parameters/_components/columns-parameters.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ParameterValueAPI } from '@/hooks/useParameters'; // Do seu hook
import { formatDate } from '@/lib/utils'; // Sua função utilitária
import { ColumnDef } from '@tanstack/react-table';
import { Edit, History, MoreHorizontal, Trash2 } from 'lucide-react';

// Interface para os períodos, para checar o status
interface CompetitionPeriodForActions {
  id: number;
  mesAno: string;
  status: string;
}

// Props para a função que define as colunas
interface ColumnsParametersProps {
  onEdit: (parameter: ParameterValueAPI) => void;
  onDelete: (parameter: ParameterValueAPI) => void;
  onShowHistory: (parameter: ParameterValueAPI) => void;
  todayStr: string; // Data de hoje no formato YYYY-MM-DD
  competitionPeriods: CompetitionPeriodForActions[]; // Lista de períodos para verificar o status
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
      <div className='font-medium'>{row.getValue('nomeParametro')}</div>
    ),
  },
  {
    accessorKey: 'valor',
    header: 'Valor',
  },
  {
    accessorKey: 'criterio.nome',
    header: 'Critério',
    cell: ({ row }) => {
      const parameter = row.original;
      return parameter.criterio?.nome || '-';
    },
  },
  {
    accessorKey: 'setor.nome',
    header: 'Setor',
    cell: ({ row }) => {
      const parameter = row.original;
      return parameter.setor?.nome || 'Geral';
    },
  },
  {
    accessorKey: 'dataInicioEfetivo',
    header: 'Início Vigência',
    cell: ({ row }) => formatDate(row.getValue('dataInicioEfetivo')),
  },
  {
    accessorKey: 'dataFimEfetivo',
    header: 'Fim Vigência',
    cell: ({ row }) => {
      const dataFim = row.getValue('dataFimEfetivo') as string | null;
      return dataFim ? (
        formatDate(dataFim)
      ) : (
        <span className='text-slate-500 italic'>Vigente</span>
      );
    },
  },
  {
    id: 'statusMeta', // ID único para a coluna
    header: 'Status',
    cell: ({ row }) => {
      const param = row.original;
      // Uma meta é vigente se não tem data de fim OU se a data de fim é hoje ou no futuro
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
      const justificativa = row.getValue('justificativa') as
        | string
        | null
        | undefined;
      if (!justificativa) return '-';
      const shortJustificativa = justificativa.substring(0, 25);
      return (
        <Tooltip>
          <TooltipTrigger className='cursor-help underline decoration-dotted decoration-slate-400 hover:decoration-slate-600'>
            {shortJustificativa}
            {justificativa.length > 25 ? '...' : ''}
          </TooltipTrigger>
          <TooltipContent className='max-w-xs whitespace-pre-wrap bg-background border shadow-lg rounded-md p-2'>
            <p>{justificativa}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Ações</div>,
    cell: ({ row }) => {
      const parameter = row.original;
      const periodOfParam = competitionPeriods.find(
        (p) => p.id === parameter.competitionPeriodId
      );
      const isMetaExpired =
        parameter.dataFimEfetivo &&
        new Date(parameter.dataFimEfetivo) < new Date(todayStr);

      // Permite modificar (editar ou expirar) apenas se o período da meta estiver em 'PLANEJAMENTO'
      // E se a meta em si ainda não estiver expirada (dataFimEfetivo no passado)
      const canModify =
        periodOfParam?.status === 'PLANEJAMENTO' && !isMetaExpired;

      return (
        <div className='text-right'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Abrir menu de ações</span>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Ações da Meta</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onShowHistory(parameter)}>
                <History className='mr-2 h-4 w-4' /> Ver Histórico
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onEdit(parameter)}
                disabled={!canModify}
              >
                <Edit className='mr-2 h-4 w-4' /> Editar Meta
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(parameter)}
                disabled={!canModify}
                className='text-red-600 focus:text-red-600 dark:focus:text-red-400 dark:focus:bg-red-900/50'
              >
                <Trash2 className='mr-2 h-4 w-4' /> Expirar Meta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
