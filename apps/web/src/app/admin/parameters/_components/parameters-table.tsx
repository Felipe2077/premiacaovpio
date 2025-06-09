// apps/web/src/app/admin/parameters/_components/parameters-table.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ParameterValueAPI } from '@/hooks/useParameters'; // Do seu hook
import { formatDate } from '@/lib/utils';
import {
  AlertCircle,
  Edit,
  History,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';

// Interface para os períodos, para checar o status (simplificada)
interface CompetitionPeriodForTable {
  id: number;
  mesAno: string;
  status: string;
}

interface ParametersTableProps {
  parameters: ParameterValueAPI[] | undefined;
  isLoading: boolean;
  error: Error | null;
  selectedPeriodMesAno: string;
  todayStr: string;
  competitionPeriods: CompetitionPeriodForTable[];
  onEdit: (parameter: ParameterValueAPI) => void;
  onDelete: (parameter: ParameterValueAPI) => void;
  onShowHistory: (parameter: ParameterValueAPI) => void;
}

export function ParametersTable({
  parameters,
  isLoading,
  error,
  selectedPeriodMesAno,
  todayStr,
  competitionPeriods,
  onEdit,
  onDelete,
  onShowHistory,
}: ParametersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Metas para o período:
          {selectedPeriodMesAno || 'Nenhum período selecionado'}
        </CardTitle>
        <CardDescription>
          Lista de metas de negócio definidas para a premiação no período
          selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className='space-y-2 mt-2'>
            {[...Array(5)].map((_, i) => (
              <TableRow key={`skel-row-${i}`} className='flex w-full'>
                <TableCell className='p-2 flex-1'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
                <TableCell className='p-2 w-20'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
                <TableCell className='p-2 w-32'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
                <TableCell className='p-2 w-32'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
                <TableCell className='p-2 w-24'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
                <TableCell className='p-2 w-24'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
                <TableCell className='p-2 w-24'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
                <TableCell className='p-2 w-40'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
                <TableCell className='p-2 w-28 text-right'>
                  <Skeleton className='h-5 w-full' />
                </TableCell>
              </TableRow>
            ))}
          </div>
        )}
        {!isLoading && error && (
          <Alert variant='destructive' className='mt-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Erro ao Carregar Metas!</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && parameters && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[250px]'>Nome do Parâmetro</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Critério</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Início Vigência</TableHead>
                <TableHead>Fim Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='max-w-[200px]'>Justificativa</TableHead>
                <TableHead className='text-right w-[120px]'>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className='h-24 text-center'>
                    Nenhuma meta encontrada para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
              {parameters.map((param) => {
                const isCurrentlyActive =
                  !param.dataFimEfetivo ||
                  new Date(param.dataFimEfetivo) >= new Date(todayStr);
                const periodOfParam = competitionPeriods.find(
                  (p) => p.id === param.competitionPeriodId
                );
                const canModify =
                  periodOfParam?.status === 'PLANEJAMENTO' && isCurrentlyActive;

                return (
                  <TableRow
                    key={param.id}
                    className={
                      !param.dataFimEfetivo
                        ? 'bg-sky-50 dark:bg-sky-900/30'
                        : ''
                    }
                  >
                    <TableCell className='font-medium'>
                      {param.nomeParametro}
                    </TableCell>
                    <TableCell>{param.valor}</TableCell>
                    <TableCell>{param.criterio?.nome || '-'}</TableCell>
                    <TableCell>{param.setor?.nome || 'Geral'}</TableCell>
                    <TableCell>{formatDate(param.dataInicioEfetivo)}</TableCell>
                    <TableCell>
                      {param.dataFimEfetivo ? (
                        formatDate(param.dataFimEfetivo)
                      ) : (
                        <span className='italic text-slate-500'>Vigente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isCurrentlyActive ? 'default' : 'outline'}
                        className={
                          isCurrentlyActive
                            ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-800 dark:text-green-200'
                            : 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                        }
                      >
                        {isCurrentlyActive ? 'Ativa' : 'Expirada'}
                      </Badge>
                    </TableCell>
                    <TableCell className='max-w-[150px] truncate text-xs'>
                      <Tooltip>
                        <TooltipTrigger className='cursor-help hover:underline'>
                          {param.justificativa
                            ? `${param.justificativa.substring(0, 30)}${param.justificativa.length > 30 ? '...' : ''}`
                            : '-'}
                        </TooltipTrigger>
                        <TooltipContent className='max-w-xs whitespace-pre-wrap bg-background p-2 shadow-lg border rounded-md'>
                          <p>{param.justificativa || 'Sem justificativa.'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-8 w-8 p-0'>
                            <span className='sr-only'>Abrir menu de ações</span>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onShowHistory(param)}
                          >
                            <History className='mr-2 h-4 w-4' /> Ver Histórico
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onEdit(param)}
                            disabled={!canModify}
                          >
                            <Edit className='mr-2 h-4 w-4' /> Editar Meta
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(param)}
                            disabled={!canModify}
                            className='text-red-600 focus:text-red-600 dark:focus:text-red-400 dark:focus:bg-red-900/50'
                          >
                            <Trash2 className='mr-2 h-4 w-4' /> Expirar Meta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
