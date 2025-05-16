// apps/web/src/app/admin/parameters/_components/parameter-actions-cell.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ParameterValueAPI } from '@/hooks/useParameters';
import { Edit, History, MoreHorizontal, Trash2 } from 'lucide-react';

interface CompetitionPeriodForActions {
  id: number;
  mesAno: string;
  status: string;
}

interface ParameterActionsCellProps {
  parameter: ParameterValueAPI;
  onEdit: (parameter: ParameterValueAPI) => void;
  onDelete: (parameter: ParameterValueAPI) => void;
  onShowHistory: (parameter: ParameterValueAPI) => void;
  todayStr: string;
  competitionPeriods: CompetitionPeriodForActions[];
}

export function ParameterActionsCell({
  parameter,
  onEdit,
  onDelete,
  onShowHistory,
  todayStr,
  competitionPeriods,
}: ParameterActionsCellProps) {
  const periodOfParam = competitionPeriods.find(
    (p) => p.id === parameter.competitionPeriodId
  );
  const isMetaExpired =
    parameter.dataFimEfetivo &&
    new Date(parameter.dataFimEfetivo) < new Date(todayStr);
  const canModify = periodOfParam?.status === 'PLANEJAMENTO' && !isMetaExpired;

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
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
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
}
