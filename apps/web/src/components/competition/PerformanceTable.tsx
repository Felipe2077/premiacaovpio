// apps/web/src/components/competition/PerformanceTable.tsx
'use client';

import { Progress } from '@/components/ui/progress'; // Importa Progress
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

// Tipos auxiliares e Props Interface (similar ao PointsTable/DetailedResultsTable)
interface SimpleSector {
  id: number;
  name: string;
}
interface CriterionResultMap {
  [criterionId: number]: EntradaResultadoDetalhado | undefined;
}
interface SectorData {
  setorNome: string;
  criteriaResults: CriterionResultMap;
}

interface PerformanceTableProps {
  resultsBySector: Record<number, SectorData>;
  uniqueCriteria: Pick<Criterio, 'id' | 'nome'>[];
  activeCriteria:
    | Pick<Criterio, 'id' | 'index' | 'sentido_melhor'>[]
    | undefined
    | null; // Precisa do sentido_melhor
  isLoading: boolean;
  error: Error | null;
}

export function PerformanceTable({
  resultsBySector,
  uniqueCriteria,
  activeCriteria, // Recebe critérios com 'sentido_melhor'
  isLoading,
  error,
}: PerformanceTableProps) {
  // Função para calcular valor da barra de progresso (0 a 100) e cor
  const getProgressStyle = (
    value: number | null | undefined,
    target: number | null | undefined,
    criterionId: number | null | undefined
  ): { value: number; className: string } => {
    if (
      value === null ||
      value === undefined ||
      target === null ||
      target === undefined ||
      target === 0
    ) {
      return { value: 0, className: 'bg-gray-300' }; // Barra neutra/vazia
    }
    if (!activeCriteria || criterionId === null || criterionId === undefined) {
      return { value: 0, className: 'bg-gray-300' }; // Não sabe o sentido
    }

    const criterion = activeCriteria.find((c) => c.id === criterionId);
    const ratio = value / target;
    let progressValue = 0;
    let className = 'bg-gray-300'; // Default

    if (criterion?.sentido_melhor === 'MAIOR') {
      // Se maior é melhor, progresso é a razão (limitado a 100% ou mais?)
      progressValue = Math.min(ratio * 100, 150); // Limita a 150% para visualização
      if (ratio >= 1)
        className = 'bg-green-500'; // Atingiu/Passou (Verde)
      else if (ratio >= 0.85)
        className = 'bg-yellow-500'; // Perto (Amarelo)
      else className = 'bg-red-500'; // Longe (Vermelho)
    } else {
      // MENOR é melhor
      // Se menor é melhor, progresso é o inverso da razão (1 / ratio)? Ou 1 - desvio?
      // Exemplo: Se ratio é 0.8 (bom), progresso é alto. Se ratio é 1.2 (ruim), progresso é baixo.
      // Usar 1/ratio pode dar valores muito altos se o valor for muito baixo.
      // Vamos usar uma escala onde 100% = meta atingida, <100% = abaixo (bom), >100% = acima (ruim)
      progressValue = Math.min((target / value) * 100, 150); // Inverso limitado
      // Ou mostrar o desvio: se valor=80, meta=100 -> 80% da meta (Bom) -> Barra 80% Verde?
      // Se valor=120, meta=100 -> 120% da meta (Ruim) -> Barra 100% Vermelho?
      // Vamos tentar a % da meta atingida (ratio) e colorir
      progressValue = Math.max(0, ratio * 100); // Percentual da meta
      if (ratio <= 1)
        className = 'bg-green-500'; // Atingiu/Abaixo (Verde)
      else if (ratio <= 1.15)
        className = 'bg-yellow-500'; // Pouco acima (Amarelo)
      else className = 'bg-red-500'; // Muito acima (Vermelho)
    }
    // Garante que o valor esteja entre 0 e 100 para o componente Progress padrão
    // Ou podemos ter barras maiores que 100 e só usar a cor
    progressValue = Math.max(0, Math.min(progressValue, 100)); // Clamp 0-100

    return { value: progressValue, className };
  };

  // Loading/Error/Empty states (similar ao PointsTable)
  if (isLoading) {
    return <p>Carregando dados de desempenho...</p>;
  }
  if (error) {
    return <p className='text-red-500'>Erro: {error.message}</p>;
  }
  if (
    !uniqueCriteria ||
    uniqueCriteria.length === 0 ||
    !resultsBySector ||
    Object.keys(resultsBySector).length === 0
  ) {
    return (
      <div className='border rounded-md p-4 text-center text-gray-500'>
        Nenhum dado de desempenho.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className='overflow-x-auto border rounded-md'>
        <Table>
          <TableCaption>
            Desempenho Realizado vs Meta e % Atingimento.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className='sticky left-0 bg-background z-10 font-semibold min-w-[150px] px-2 sm:px-4'>
                Setor
              </TableHead>
              {uniqueCriteria.map((criterion) => (
                <TableHead
                  key={criterion.id}
                  className='text-center font-semibold min-w-[120px] px-1 py-2 text-xs whitespace-normal align-top'
                >
                  {criterion.name} <br />
                  <span className='text-muted-foreground font-normal'>
                    (Valor / Meta / %)
                  </span>
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
                      const progress = getProgressStyle(
                        result?.valorRealizado,
                        result?.valorMeta,
                        criterion.id
                      );
                      return (
                        <TableCell
                          key={`<span class="math-inline">\{sectorId\}\-</span>{criterion.id}`}
                          className='text-center p-1 align-middle'
                        >
                          {result ? (
                            <div className='flex flex-col items-center gap-1'>
                              {/* Mostra Valor / Meta */}
                              <span className='text-xs'>
                                {formatNumber(result.valorRealizado)} /
                                {formatNumber(result.valorMeta)}
                              </span>
                              {/* Mostra % Atingimento */}
                              <span
                                className={`text-sm font-medium ${progress.className.includes('red') ? 'text-red-600' : progress.className.includes('green') ? 'text-green-600' : ''}`}
                              >
                                {formatPercent(result.percentualAtingimento)}
                              </span>
                              {/* Barra de Progresso Visual */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Progress
                                    value={progress.value}
                                    className={`h-2 w-20 [&>*]:${progress.className}`} // Aplica cor ao indicador
                                    aria-label={`Progresso ${formatPercent(result.percentualAtingimento)}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent className='text-xs'>
                                  {formatPercent(result.percentualAtingimento)}
                                  da meta
                                </TooltipContent>
                              </Tooltip>
                            </div>
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

export default PerformanceTable;
