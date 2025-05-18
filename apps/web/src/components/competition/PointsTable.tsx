// apps/web/src/components/competition/PointsTable.tsx
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Criterion } from '@/hooks/useParametersData';
import { formatNumber, formatPercent } from '@/lib/utils';
import { useMemo } from 'react';

interface PointsTableProps {
  resultsBySector: Record<number, any>;
  uniqueCriteria: Criterion[];
  activeCriteria: Criterion[];
  isLoading: boolean;
  error: Error | null;
}

export default function PointsTable({
  resultsBySector,
  uniqueCriteria,
  activeCriteria,
  isLoading,
  error,
}: PointsTableProps) {
  // Adicionar logs para depuração
  console.log('📊 PointsTable - Props recebidas:');
  console.log('📊 resultsBySector:', resultsBySector);
  console.log('📊 uniqueCriteria:', uniqueCriteria);
  console.log('📊 activeCriteria:', activeCriteria);
  console.log('📊 isLoading:', isLoading);
  console.log('📊 error:', error);

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

  console.log('📊 hasValidData:', hasValidData);

  // --- Função de Estilo COMPLETA ---
  const getPointsCellStyle = (
    points: number | null | undefined,
    criterionId: number | null | undefined
  ): string => {
    if (points === null || points === undefined)
      return 'text-gray-400 dark:text-gray-500';
    if (!activeCriteria || criterionId === null || criterionId === undefined)
      return 'text-foreground';

    const criterionIndex =
      activeCriteria.find((c) => c.id === criterionId)?.index ?? null;
    const useInvertedScale = criterionIndex === 0;
    const baseStyle = 'font-semibold px-2 py-1 rounded text-xs sm:text-sm ';

    const isBestPoints = useInvertedScale ? points === 2.5 : points === 1.0;
    const isGoodPoints = useInvertedScale ? points === 2.0 : points === 1.5;
    const isBadPoints = useInvertedScale ? points === 1.5 : points === 2.0;
    const isWorstPoints = useInvertedScale ? points === 1.0 : points === 2.5;

    // --- Bloco IF/ELSE IF que retorna as cores ---
    if (isBestPoints)
      return (
        baseStyle +
        'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'
      );
    if (isGoodPoints)
      return (
        baseStyle +
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
      );
    if (isBadPoints)
      return (
        baseStyle +
        'bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300'
      );
    if (isWorstPoints)
      return (
        baseStyle +
        'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
      );
    // --- Fim do Bloco ---

    return 'text-foreground'; // Fallback
  };
  // --------------------------------------

  if (isLoading) {
    // Simula algumas linhas e colunas genéricas
    const numMockRows = 4;
    const numMockCols = 6; // Número aproximado de colunas visíveis? Ou use uniqueCriteria.length se já tiver? Melhor fixo.
    return (
      <div className='border rounded-md p-4 space-y-3'>
        {/* Simula Cabeçalho */}
        <div className='flex space-x-2'>
          <Skeleton className='h-5 w-[150px]' /> {/* Coluna Setor */}
          {[...Array(numMockCols)].map((_, i) => (
            <Skeleton key={i} className='h-5 flex-1' />
          ))}
        </div>
        {/* Simula Linhas */}
        {[...Array(numMockRows)].map((_, i) => (
          <div key={i} className='flex space-x-2 mt-2'>
            <Skeleton className='h-4 w-[150px]' /> {/* Coluna Setor */}
            {[...Array(numMockCols)].map((_, j) => (
              <Skeleton key={j} className='h-4 flex-1' />
            ))}
          </div>
        ))}
        <Skeleton className='h-3 w-1/2 mt-2' /> {/* Simula Caption */}
      </div>
    );
  }

  if (error) {
    return (
      <div className='border rounded-md p-4 text-center text-red-500'>
        Erro ao carregar dados detalhados: {error.message}
      </div>
    );
  }

  if (!hasValidData) {
    return (
      <div className='border rounded-md p-4 text-center text-gray-500'>
        Nenhum dado detalhado para exibir no período.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 mb-3 items-center'>
        <span>Legenda (Posição no Critério):</span>
        <span className='flex items-center'>
          <span className='inline-block w-3 h-3 rounded-full bg-green-100 border border-green-300 mr-1'></span>
          1º (Melhor)
        </span>
        <span className='flex items-center'>
          <span className='inline-block w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300 mr-1'></span>
          2º
        </span>
        <span className='flex items-center'>
          <span className='inline-block w-3 h-3 rounded-full bg-orange-100 border border-orange-300 mr-1'></span>
          3º
        </span>
        <span className='flex items-center'>
          <span className='inline-block w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-1'></span>
          4º (Pior)
        </span>
        <span className='text-gray-400'>
          (Nota: Escala pode inverter dependendo do critério)
        </span>
      </div>
      <div className='overflow-x-auto border rounded-md'>
        <Table>
          <TableCaption>
            Pontuação por critério/filial. Passe o mouse sobre os pontos para
            ver detalhes.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className='sticky left-0 bg-background z-10 font-semibold min-w-[100px] px-2 sm:px-4'>
                Setor
              </TableHead>
              {uniqueCriteria.map((criterion) => (
                <TableHead
                  key={criterion.id}
                  className='text-center font-semibold min-w-[90px] px-1 py-2 text-xs whitespace-normal align-top'
                >
                  {criterion.nome}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(resultsBySector).map(([sectorId, sectorData]) => {
              // Verificar se sectorData e criteriaResults existem
              if (!sectorData || !sectorData.criteriaResults) {
                console.log('📊 Setor sem criteriaResults:', sectorId);
                return null; // Pular este setor
              }

              // Calcular pontuação total
              const totalPoints = Object.values(
                sectorData.criteriaResults || {}
              ).reduce((sum, result) => sum + (result?.pontos || 0), 0);

              return (
                <TableRow key={sectorId}>
                  <TableCell className='font-semibold sticky left-0 bg-background z-10'>
                    {sectorData.setorNome}
                  </TableCell>
                  {uniqueCriteria.map((criterion) => {
                    // Verificar se o critério existe nos resultados do setor
                    const result = sectorData.criteriaResults[criterion.id] || {
                      valorRealizado: 0,
                      valorMeta: 0,
                      percentualAtingimento: 0,
                      pontos: 0,
                    };

                    const pontos = result?.pontos;
                    // Chama a função getPointsCellStyle COMPLETA
                    const cellStyle = getPointsCellStyle(pontos, criterion.id);

                    return (
                      <TableCell
                        key={`${sectorId}-${criterion.id}`}
                        className='text-center p-1 align-middle'
                      >
                        {result ? (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              {/* Aplica o estilo CORRETO */}
                              <span
                                className={`cursor-default inline-block ${cellStyle}`}
                              >
                                {formatNumber(pontos)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className='text-xs bg-popover text-popover-foreground shadow-md p-2 rounded'>
                              <p>
                                Valor: {formatNumber(result.valorRealizado)}
                              </p>
                              <p>Meta: {formatNumber(result.valorMeta)}</p>
                              <p>
                                % Ating.:{' '}
                                {formatPercent(result.percentualAtingimento)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className='text-gray-400'>-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
