// apps/web/src/components/competition/DetailedResultsTable.tsx (VERSÃO CORRIGIDA V2)
'use client';

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
import { formatNumber, formatPercent } from '@/lib/utils';
import {
  Criterio,
  EntradaResultadoDetalhado,
} from '@sistema-premiacao/shared-types';

// Interfaces locais (mantidas para este componente)

interface CriterionResultMap {
  [criterionId: number]: EntradaResultadoDetalhado | undefined;
}
interface SectorData {
  setorNome: string;
  criteriaResults: CriterionResultMap;
}

interface DetailedResultsTableProps {
  resultsBySector: Record<number, SectorData>;
  uniqueCriteria: Pick<Criterio, 'id' | 'nome'>[];
  activeCriteria: Pick<Criterio, 'id' | 'index'>[] | undefined | null;
  isLoading: boolean;
  error: Error | null;
}

export function DetailedResultsTable({
  resultsBySector,
  uniqueCriteria,
  activeCriteria,
  isLoading,
  error,
}: DetailedResultsTableProps) {
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
    const useInvertedScale = criterionIndex === 10 || criterionIndex === 11;
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
    return <p>Carregando detalhes...</p>;
  }
  if (error) {
    return (
      <p className='text-red-500'>Erro ao carregar detalhes: {error.message}</p>
    );
  }
  if (
    !uniqueCriteria ||
    uniqueCriteria.length === 0 ||
    !resultsBySector ||
    Object.keys(resultsBySector).length === 0
  ) {
    return (
      <div className='border rounded-md p-4 text-center text-gray-500'>
        Nenhum dado detalhado para exibir no período.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className='overflow-x-auto border rounded-md'>
        <Table>
          <TableCaption>
            Pontuação por critério/filial. Passe o mouse sobre os pontos para
            ver detalhes.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className='sticky left-0 bg-background z-10 font-semibold min-w-[150px] px-2 sm:px-4'>
                Setor
              </TableHead>
              {uniqueCriteria.map((criterion) => (
                <TableHead
                  key={criterion.id}
                  className='text-center font-semibold min-w-[90px] px-1 py-2 text-xs whitespace-normal align-top'
                >
                  {criterion.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(resultsBySector).map(
              ([sectorIdStr, sectorData]) => {
                const sectorId = parseInt(sectorIdStr, 10);
                return (
                  <TableRow key={sectorId}>
                    <TableCell className='font-semibold sticky left-0 bg-background z-10'>
                      {sectorData.setorNome}
                    </TableCell>
                    {uniqueCriteria.map((criterion) => {
                      const result = sectorData.criteriaResults[criterion.id];
                      const pontos = result?.pontos;
                      // Chama a função getPointsCellStyle COMPLETA
                      const cellStyle = getPointsCellStyle(
                        pontos,
                        criterion.id
                      );

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
              }
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

export default DetailedResultsTable;
