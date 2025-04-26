// apps/web/src/components/competition/DetailedResultsTable.tsx
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
  TooltipProvider, // Importa aqui se for usar SÓ neste componente
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Criterio,
  EntradaResultadoDetalhado,
} from '@sistema-premiacao/shared-types';
// Importa as funções de utilitários, incluindo a de estilo
import { formatNumber, formatPercent } from '@/lib/utils';

// Estruturas de dados esperadas como props
interface SimpleSector {
  id: number;
  name: string;
}
interface CriterionResultMap {
  [criterionId: number]: EntradaResultadoDetalhado | undefined;
}
interface SectorData {
  sectorName: string;
  criteriaResults: CriterionResultMap;
}

// Define as propriedades que o componente espera receber
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
  activeCriteria, // Recebe como prop
  isLoading,
  error,
}: DetailedResultsTableProps) {
  const getPointsCellStyle = (
    points: number | null | undefined,
    criterionId: number | null | undefined
  ): string => {
    if (points === null || points === undefined)
      return 'text-gray-400 dark:text-gray-500';
    // Agora acessa 'activeCriteria' diretamente da prop do componente
    if (!activeCriteria || criterionId === null || criterionId === undefined)
      return 'text-foreground';

    const criterionIndex =
      activeCriteria.find((c) => c.id === criterionId)?.index ?? null;
    const useInvertedScale = criterionIndex === 10 || criterionIndex === 11;
    const baseStyle = 'font-semibold px-2 py-1 rounded text-xs sm:text-sm ';

    // ... (lógica das cores permanece a mesma) ...
    const isBestPoints = useInvertedScale ? points === 2.5 : points === 1.0;
    // ... (resto da lógica de cores) ...
    if (isBestPoints) return baseStyle + '...'; // green
    // ... etc ...
    return 'text-foreground';
  };

  // Se estiver carregando os dados (combinado da página pai), mostra mensagem
  if (isLoading) {
    return <p>Carregando detalhes...</p>;
  }

  // Se houver erro específico dos detalhes (vindo da página pai)
  if (error) {
    return (
      <p className='text-red-500'>Erro ao carregar detalhes: {error.message}</p>
    );
  }

  // Se não houver critérios ou dados por setor
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

  // Renderiza a tabela se tudo estiver ok
  return (
    // TooltipProvider pode ficar aqui ou no layout. Se só usar tooltip aqui, melhor aqui.
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
                      {sectorData.sectorName}
                    </TableCell>
                    {uniqueCriteria.map((criterion) => {
                      const result = sectorData.criteriaResults[criterion.id];
                      const pontos = result?.pontos;
                      // Chama getPointsCellStyle passando activeCriteria recebido via props
                      const cellStyle = getPointsCellStyle(
                        pontos,
                        criterion.id,
                        activeCriteria
                      );

                      return (
                        <TableCell
                          key={`${sectorIdStr}-${criterion.id}`}
                          className='text-center p-1 align-middle'
                        >
                          {result ? (
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
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
