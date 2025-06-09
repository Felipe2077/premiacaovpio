// apps/web/src/components/competition/PerformanceTable.tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
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
import { Criterion } from '@/hooks/useParametersData';
import { formatNumber, formatPercent } from '@/lib/utils';
import { useMemo } from 'react';

interface PerformanceTableProps {
  resultsBySector: Record<number, any>;
  uniqueCriteria: Criterion[];
  activeCriteria: Criterion[];
  isLoading: boolean;
  error: Error | null;
}

export default function PerformanceTable({
  resultsBySector,
  uniqueCriteria,
  activeCriteria,
  isLoading,
  error,
}: PerformanceTableProps) {
  // Adicionar logs para depuração

  // Verificar se temos dados válidos
  const hasValidData = useMemo(() => {
    if (!resultsBySector || Object.keys(resultsBySector).length === 0)
      return false;
    if (!uniqueCriteria || uniqueCriteria.length === 0) return false;

    // Verificar se pelo menos um setor tem criteriaResults
    return Object.values(resultsBySector).some(
      (sector) =>
        sector &&
        sector.criteriaResults &&
        Object.keys(sector.criteriaResults).length > 0
    );
  }, [resultsBySector, uniqueCriteria]);

  // Função para calcular o estilo da barra de progresso
  const getProgressStyle = (
    valorRealizado?: number,
    valorMeta?: number,
    criterionId?: number
  ) => {
    if (!valorRealizado || !valorMeta || valorMeta === 0) {
      return {
        width: '0%',
        backgroundColor: 'bg-gray-300',
      };
    }

    // Encontrar o critério para determinar se "menos é melhor" ou "mais é melhor"
    const criterion = uniqueCriteria.find((c) => c.id === criterionId);
    const menosEMelhor = criterion && criterion.sentido_melhor === 'MENOR';

    // Lista de critérios onde "mais é melhor"
    const maisEMelhorCriterios = ['IPK', 'MEDIA KM/L'];
    const maisEMelhorPorNome =
      criterion && maisEMelhorCriterios.includes(criterion.nome);

    // Determinar se para este critério específico, mais é melhor
    const maisEMelhor =
      maisEMelhorPorNome || (criterion && criterion.sentido_melhor === 'MAIOR');

    const percentage = (valorRealizado / valorMeta) * 100;
    const width = `${Math.min(Math.max(percentage, 0), 100)}%`;
    let color = 'bg-yellow-400';

    if (maisEMelhor) {
      // Para critérios onde MAIS é melhor (IPK, MEDIA KM/L)
      if (percentage >= 100) {
        color = 'bg-green-500';
      } else if (percentage >= 90) {
        color = 'bg-green-400';
      } else if (percentage >= 80) {
        color = 'bg-yellow-500';
      } else if (percentage < 80) {
        color = 'bg-red-500';
      }
    } else {
      // Para critérios onde MENOS é melhor (todos os outros)
      if (percentage <= 50) {
        color = 'bg-green-500';
      } else if (percentage <= 60) {
        color = 'bg-green-400';
      } else if (percentage <= 70) {
        color = 'bg-yellow-500';
      } else if (percentage <= 90) {
        color = 'bg-yellow-600';
      } else if (percentage > 100) {
        color = 'bg-red-500';
      }
    }

    return {
      width,
      backgroundColor: color,
    };
  };

  if (isLoading) {
    return (
      <div className='border rounded-md p-4 space-y-3'>
        {/* Simula Cabeçalho */}
        <div className='flex justify-between'>
          <Skeleton className='h-5 w-1/4' />
          <Skeleton className='h-5 w-1/4' />
          <Skeleton className='h-5 w-1/4' />
        </div>
        {/* Simula 4 Linhas */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className='flex justify-between space-x-2'>
            <Skeleton className='h-4 w-1/6' />
            <Skeleton className='h-4 w-3/6' />
            <Skeleton className='h-4 w-2/6' />
          </div>
        ))}
        <Skeleton className='h-3 w-1/2 mt-2' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='border rounded-md p-4 text-center text-red-500'>
        Erro ao carregar dados de desempenho: {error.message}
      </div>
    );
  }

  if (!hasValidData) {
    return (
      <div className='border rounded-md p-4 text-center text-gray-500'>
        Nenhum dado de desempenho.
      </div>
    );
  }

  return (
    <div className='border rounded-md overflow-auto'>
      <Table>
        <TableCaption>
          Desempenho atual vs. metas estabelecidas por setor.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[200px]'>Setor</TableHead>
            {activeCriteria.map((criterion) => (
              <TableHead key={criterion.id} className='min-w-[150px]'>
                {criterion.nome}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(resultsBySector).map(([sectorId, sectorData]) => {
            // Verificar se sectorData e criteriaResults existem
            if (!sectorData || !sectorData.criteriaResults) {
              return null; // Pular este setor
            }

            return (
              <TableRow key={sectorId}>
                <TableCell className='font-medium'>
                  {sectorData.setorNome}
                </TableCell>
                {uniqueCriteria.map((criterion) => {
                  // Verificar se o critério existe nos resultados do setor
                  const result = sectorData.criteriaResults[criterion.id] || {
                    valorRealizado: 0,
                    valorMeta: 0,
                    percentualAtingimento: 0,
                  };

                  const progress = getProgressStyle(
                    result.valorRealizado,
                    result.valorMeta,
                    criterion.id
                  );

                  return (
                    <TableCell key={criterion.id} className='p-2'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='space-y-1'>
                            <div className='flex justify-between text-xs flex-col gap-1'>
                              <span>
                                Realizado:
                                {formatNumber(result.valorRealizado || 0)}
                              </span>

                              <span className='text-gray-500'>
                                Meta: {formatNumber(result.valorMeta || 0)}
                              </span>
                            </div>
                            <div className='w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700'>
                              <div
                                className={`h-2.5 rounded-full ${progress.backgroundColor} `}
                                style={{ width: progress.width }}
                              ></div>
                            </div>
                            <div className='text-xs text-right'>
                              {formatPercent(result.percentualAtingimento || 0)}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            <strong>Realizado:</strong>
                            {formatNumber(result.valorRealizado || 0)}
                          </p>
                          <p>
                            <strong>Meta:</strong>
                            {formatNumber(result.valorMeta || 0)}
                          </p>
                          <p>
                            <strong>Atingimento:</strong>
                            {formatPercent(result.percentualAtingimento || 0)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
