// src/app/admin/parameters/_components/parameter-table.tsx
'use client';

import {
  Alert,
  AlertCircle,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ParameterValueAPI } from '@/hooks/useParameters';
import { formatDate } from '@/lib/utils';
import { Edit, History, Trash2 } from 'lucide-react';

interface ParameterTableProps {
  parameters?: ParameterValueAPI[];
  isLoading: boolean;
  error: Error | null;
  onShowHistory: (param: ParameterValueAPI) => void;
  onEditParameter: (param: ParameterValueAPI) => void;
  onDeleteParameter?: (param: ParameterValueAPI) => void;
}

export function ParameterTable({
  parameters,
  isLoading,
  error,
  onShowHistory,
  onEditParameter,
  onDeleteParameter,
}: ParameterTableProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <div className='space-y-3 mt-2'>
        <Skeleton className='h-8 w-1/4 mb-2' />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className='h-10 w-full mb-1' />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant='destructive'>
        <AlertCircle className='h-4 w-4' />
        <AlertTitle>Erro!</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Critério</TableHead>
          <TableHead>Setor</TableHead>
          <TableHead>Início</TableHead>
          <TableHead>Fim</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Justificativa</TableHead>
          <TableHead className='text-right'>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(!parameters || parameters.length === 0) && (
          <TableRow>
            <TableCell colSpan={9} className='text-center h-24'>
              Nenhuma meta encontrada para este período.
            </TableCell>
          </TableRow>
        )}
        {parameters?.map((param) => {
          const isVigente =
            !param.dataFimEfetivo ||
            new Date(param.dataFimEfetivo) >= new Date(todayStr);
          return (
            <TableRow key={param.id}>
              <TableCell className='font-medium'>
                {param.nomeParametro}
              </TableCell>
              <TableCell>{param.valor}</TableCell>
              <TableCell>{param.criterio?.nome || '-'}</TableCell>
              <TableCell>{param.setor?.nome || 'Geral'}</TableCell>
              <TableCell>{formatDate(param.dataInicioEfetivo)}</TableCell>
              <TableCell>
                {param.dataFimEfetivo
                  ? formatDate(param.dataFimEfetivo)
                  : 'Vigente'}
              </TableCell>
              <TableCell>
                <Badge variant={isVigente ? 'default' : 'outline'}>
                  {isVigente ? 'Ativa' : 'Expirada'}
                </Badge>
              </TableCell>
              <TableCell className='max-w-[150px] truncate'>
                <Tooltip>
                  <TooltipTrigger className='cursor-help'>
                    {param.justificativa?.substring(0, 20) || '-'}
                    {param.justificativa && param.justificativa.length > 20
                      ? '...'
                      : ''}
                  </TooltipTrigger>
                  <TooltipContent>{param.justificativa}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className='text-right'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => onShowHistory(param)}
                  aria-label='Histórico'
                >
                  <History className='h-4 w-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => onEditParameter(param)}
                  aria-label='Editar'
                >
                  <Edit className='h-4 w-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  disabled={!onDeleteParameter}
                  onClick={
                    onDeleteParameter
                      ? () => onDeleteParameter(param)
                      : undefined
                  }
                  aria-label='Deletar'
                >
                  <Trash2 className='h-4 w-4 text-red-500' />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
