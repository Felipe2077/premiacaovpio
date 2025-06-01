// src/components/parameters/ParametersMatrix.tsx
'use client';
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Criterion, Sector } from '@/hooks/useParametersData';
import { EntradaResultadoDetalhado } from '@sistema-premiacao/shared-types';
import {
  ChevronDown,
  ChevronUp,
  History,
  Info,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import React, { useState } from 'react';
import { PlanningCellCard } from './PlanningCellCard';

interface CompetitionPeriod {
  id: number;
  mesAno: string;
  status: 'ATIVA' | 'FECHADA' | 'PLANEJAMENTO';
  startDate: Date | string; // ou o tipo que você usa para startDate/dataInicio
  // Adicione outras propriedades que seu objeto CompetitionPeriod realmente tem
}
interface ParametersMatrixProps {
  uniqueCriteria: Criterion[];
  resultsBySector: any;
  sectors: Sector[]; //
  onEdit?: (
    criterion: Criterion,
    sector: Sector | null,
    currentParameterValue: string | number | null
  ) => void; // Ajustado para exemplo, revise a assinatura em ParametersPage
  onCreate?: (
    criterion: Criterion,
    sector: Sector | null,
    currentCompetitionPeriod: CompetitionPeriod
  ) => void;
  onCalculate?: (
    // <<< ASSINATURA CORRIGIDA
    criterion: Criterion,
    sector: Sector | null,
    currentCompetitionPeriod: CompetitionPeriod
  ) => void;
  isLoading?: boolean;
  periodoAtual?: CompetitionPeriod; // ANTES: tipo anônimo
  fetchHistoricalData: (
    criterionId: number,
    sectorId: number | null,
    currentPeriodYYYYMM: string,
    count: number
  ) => Promise<any[]>;
}

const ParametersMatrix: React.FC<ParametersMatrixProps> = ({
  uniqueCriteria,
  resultsBySector,
  onEdit,
  onCreate,
  onCalculate,
  isLoading,
  periodoAtual,
  sectors,
  fetchHistoricalData,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Verificar se os dados estão disponíveis
  if (isLoading) {
    return (
      <div className='flex justify-center items-center p-8 min-h-[200px]'>
        <div className='animate-pulse text-muted-foreground'>
          Carregando dados...
        </div>
      </div>
    );
  }

  if (!resultsBySector || Object.keys(resultsBySector).length === 0) {
    return (
      <div className='flex justify-center items-center p-8 min-h-[200px] border rounded-md bg-muted/10'>
        <div className='text-muted-foreground'>
          Nenhum dado disponível para exibição.
        </div>
      </div>
    );
  }

  if (!uniqueCriteria || uniqueCriteria.length === 0) {
    return (
      <div className='flex justify-center items-center p-8 min-h-[200px] border rounded-md bg-muted/10'>
        <div className='text-muted-foreground'>
          Nenhum critério disponível para exibição.
        </div>
      </div>
    );
  }

  // Determinar a fase atual (com fallback para 'ATIVA' se não for especificado)
  const currentStatus = periodoAtual?.status || 'ATIVA';
  const isPlanejamento = currentStatus === 'PLANEJAMENTO';
  const isAtiva = currentStatus === 'ATIVA';
  const isFechada = currentStatus === 'FECHADA';

  // Função para ordenar critérios
  const sortedCriteria = React.useMemo(() => {
    const sortableCriteria = [...uniqueCriteria];

    if (sortConfig !== null) {
      sortableCriteria.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Ordenação padrão por índice ou nome
      sortableCriteria.sort((a, b) => {
        if (a.index !== undefined && b.index !== undefined) {
          return a.index - b.index;
        }
        return a.nome.localeCompare(b.nome);
      });
    }

    return sortableCriteria;
  }, [uniqueCriteria, sortConfig]);

  // Função para alternar a ordenação
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Função para renderizar o ícone de ordenação
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'ascending' ? (
      <ChevronUp className='h-4 w-4 ml-1' />
    ) : (
      <ChevronDown className='h-4 w-4 ml-1' />
    );
  };

  // Função para renderizar o conteúdo da célula baseado na fase
  const renderCellContent = (
    criterio: FullCriterionType,
    sectorIdStr: string,
    sectorData: any
  ) => {
    const criterioIdMatrix = String(criterio.id);
    const currentSector =
      sectors.find((s) => s.id === parseInt(sectorIdStr)) || null;

    const cellApiData: EntradaResultadoDetalhado | null = // Esta é a variável correta
      sectorData.criterios && criterioIdMatrix in sectorData.criterios
        ? sectorData.criterios[criterioIdMatrix]
        : null;

    if (isPlanejamento && periodoAtual) {
      if (!cellApiData) {
        // Caso não haja NENHUMA entrada para este critério/setor no período de planejamento
        // (ex: se a API não retornar uma linha para ele, nem mesmo com nulos)
        // Aqui você pode manter o botão "Definir Meta" se fizer sentido
        return (
          <div className='flex flex-col items-center justify-center p-3 h-full min-h-[100px] bg-muted/5 rounded-md'>
            <div className='text-muted-foreground text-sm mb-2'>
              Meta a definir
            </div>
            {onCreate && currentSector && periodoAtual && (
              <button
                onClick={() => onCreate(criterio, currentSector, periodoAtual)}
                className='text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-full'
              >
                Definir Meta
              </button>
            )}
          </div>
        );
      }

      // Prepara as funções de callback para os botões dentro do card
      const handleEditInCard = () => {
        if (onEdit && currentSector && cellApiData) {
          // Adicionado check cellApiData aqui também
          onEdit(
            criterio,
            currentSector,
            cellApiData.metaPropostaPadrao || null
          );
        }
      };
      const handleCalculateInCard = () => {
        if (onCalculate && currentSector && periodoAtual) {
          onCalculate(criterio, currentSector, periodoAtual);
        }
      };

      return (
        <PlanningCellCard
          criterion={criterio}
          cellData={cellApiData}
          onEdit={handleEditInCard}
          onCalculate={handleCalculateInCard}
        />
      );
    }
    // --- CORREÇÕES PARA FASE ATIVA E FECHADA ---
    // Primeiro, verifique se cellApiData existe. Se não, não há o que mostrar.
    if (!cellApiData) {
      return (
        <div className='p-3 text-xs text-gray-400 min-h-[100px] flex justify-center items-center'>
          -
        </div>
      );
    }
    // Fase Ativa (Premiação em Andamento)
    if (isAtiva) {
      const atingimento = cellApiData.percentualAtingimento || 0;
      const statusColor =
        atingimento >= 1
          ? 'bg-green-50 border-green-200'
          : atingimento >= 0.8
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200';

      // Determinar ícone de tendência (simulado, adicione lógica real conforme necessário)
      const tendencia = cellApiData.tendencia || 0;
      const trendIcon =
        tendencia > 0 ? (
          <TrendingUp className='h-3 w-3 text-green-600' />
        ) : tendencia < 0 ? (
          <TrendingDown className='h-3 w-3 text-red-600' />
        ) : (
          <Minus className='h-3 w-3 text-gray-600' />
        );

      return (
        <div
          className={`p-3 rounded-md border ${statusColor} transition-all hover:shadow-sm`}
        >
          {/* Meta e Realizado */}
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Meta:</span>
              <span className='font-semibold'>
                {cellApiData.valorMeta !== null
                  ? cellApiData.valorMeta.toLocaleString('pt-BR')
                  : '-'}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Realizado:</span>
              <span>
                {cellApiData.valorRealizado !== null
                  ? cellApiData.valorRealizado.toLocaleString('pt-BR')
                  : '-'}
              </span>
            </div>
          </div>

          {/* Atingimento e Tendência */}
          <div className='mt-3 pt-2 border-t border-gray-100'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-600'>Atingimento:</span>
              <div className='flex items-center gap-1'>
                <span
                  className={
                    atingimento >= 1
                      ? 'text-green-600 font-semibold'
                      : atingimento >= 0.8
                        ? 'text-yellow-600 font-semibold'
                        : 'text-red-600 font-semibold'
                  }
                >
                  {cellApiData.percentualAtingimento !== null
                    ? `${(cellApiData.percentualAtingimento * 100).toFixed(1)}%`
                    : '-'}
                </span>
                {trendIcon}
              </div>
            </div>

            <div className='flex justify-between text-sm mt-1'>
              <span className='text-gray-600'>Pontos:</span>
              <span className='font-semibold'>
                {cellApiData.pontos !== null ? cellApiData.pontos : '-'}
              </span>
            </div>
          </div>

          {/* Apenas botão de histórico na fase ativa */}
          <div className='flex justify-center mt-3 pt-2'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className='text-gray-500 hover:text-gray-700 transition-colors'>
                    <History className='h-4 w-4' />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver Histórico</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    }

    // Fase Fechada (Período Encerrado)
    if (isFechada) {
      // Calcular cor com base no atingimento
      const atingimento = cellApiData.percentualAtingimento || 0;
      const statusColor =
        atingimento >= 1
          ? 'bg-green-50 border-green-200'
          : atingimento >= 0.8
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200';

      return (
        <div
          className={`p-3 rounded-md border ${statusColor} transition-all hover:shadow-sm opacity-90`}
        >
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Meta Final:</span>
              <span className='font-semibold'>
                {cellApiData.valorMeta !== null
                  ? cellApiData.valorMeta.toLocaleString('pt-BR')
                  : '-'}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Realizado:</span>
              <span>
                {cellApiData.valorRealizado !== null
                  ? cellApiData.valorRealizado.toLocaleString('pt-BR')
                  : '-'}
              </span>
            </div>
          </div>

          <div className='mt-3 pt-2 border-t border-gray-100'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Atingimento:</span>
              <span
                className={
                  atingimento >= 1
                    ? 'text-green-600 font-semibold'
                    : atingimento >= 0.8
                      ? 'text-yellow-600 font-semibold'
                      : 'text-red-600 font-semibold'
                }
              >
                {cellApiData.percentualAtingimento !== null
                  ? `${(cellApiData.percentualAtingimento * 100).toFixed(1)}%`
                  : '-'}
              </span>
            </div>

            <div className='flex justify-between text-sm mt-1'>
              <span className='text-gray-600'>Pontos:</span>
              <span className='font-semibold'>
                {cellApiData.pontos !== null ? cellApiData.pontos : '-'}
              </span>
            </div>
          </div>

          <div className='flex justify-center mt-3 pt-2'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className='text-gray-500 hover:text-gray-700 transition-colors'>
                    <History className='h-4 w-4' />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver Histórico</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    }

    // Fallback para outros estados - Simplificado para mostrar apenas os dados básicos
    return (
      <div className='p-3 bg-gray-50 rounded-md border border-gray-200'>
        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span>Meta:</span>
            <span className='font-semibold'>
              {cellApiData.valorMeta !== null
                ? cellApiData.valorMeta.toLocaleString('pt-BR')
                : '-'}
            </span>
          </div>
          {cellApiData.valorRealizado !== null && (
            <div className='flex justify-between text-sm'>
              <span>Realizado:</span>
              <span>{cellApiData.valorRealizado.toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>

        <div className='flex justify-center mt-3 pt-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className='text-gray-500 hover:text-gray-700 transition-colors'>
                  <History className='h-4 w-4' />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver Histórico</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };

  return (
    <div className='space-y-4'>
      {/* Cabeçalho informativo */}
      <div className='flex justify-between items-center'>
        <div>
          <h3 className='text-lg font-semibold'>
            Matriz de Parâmetros{' '}
            {periodoAtual?.mesAno && `- ${periodoAtual.mesAno}`}
          </h3>
          <p className='text-sm text-muted-foreground'>
            {isPlanejamento &&
              'Fase de Planejamento - Defina as metas para o próximo período.'}
            {isAtiva &&
              'Período Ativo - Acompanhe o desempenho em relação às metas.'}
            {isFechada && 'Período Fechado - Visualize os resultados finais.'}
            {!isPlanejamento &&
              !isAtiva &&
              !isFechada &&
              'Status do período não definido.'}
          </p>
        </div>

        <div className='text-sm text-muted-foreground'>
          {Object.keys(resultsBySector).length} setores •{' '}
          {uniqueCriteria.length} critérios
        </div>
      </div>

      {/* Tabela principal */}
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader className='bg-muted/30'>
            <TableRow>
              <TableHead
                className='font-semibold w-[180px] cursor-pointer hover:bg-muted/50 transition-colors'
                onClick={() => requestSort('nome')}
              >
                <div className='flex items-center'>
                  Critério {getSortIcon('nome')}
                </div>
              </TableHead>
              {Object.entries(resultsBySector).map(([sectorId, sectorData]) => (
                <TableHead
                  key={sectorId}
                  className='font-semibold text-center min-w-[200px]'
                >
                  {sectorData.setorNome}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCriteria.map((criterio: Criterion) => (
              <TableRow key={criterio.id} className='hover:bg-muted/10'>
                <TableCell className='font-medium'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className='flex items-center gap-1 cursor-help'>
                        <div>{criterio.nome}</div>
                        {criterio.descricao && (
                          <Info className='h-3.5 w-3.5 text-muted-foreground opacity-70' />
                        )}
                      </TooltipTrigger>
                      {criterio.descricao && (
                        <TooltipContent className='max-w-xs'>
                          <div className='space-y-1'>
                            <p className='font-medium'>{criterio.nome}</p>
                            <p className='text-xs'>{criterio.descricao}</p>
                            {criterio.sentido_melhor && (
                              <p className='text-xs'>
                                Sentido:{' '}
                                {criterio.sentido_melhor === 'MAIOR'
                                  ? 'Quanto maior, melhor'
                                  : 'Quanto menor, melhor'}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                {Object.entries(resultsBySector).map(
                  ([sectorIdStr, sectorData]) => (
                    <TableCell key={sectorIdStr} className='p-2'>
                      {renderCellContent(criterio, sectorIdStr, sectorData)}
                    </TableCell>
                  )
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Legenda */}
      {isAtiva && (
        <div className='flex gap-4 text-xs text-muted-foreground mt-2'>
          <div className='flex items-center gap-1'>
            <div className='w-3 h-3 rounded-full bg-green-100 border border-green-200'></div>
            <span>Meta atingida</span>
          </div>
          <div className='flex items-center gap-1'>
            <div className='w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200'></div>
            <span>Próximo da meta (≥80%)</span>
          </div>
          <div className='flex items-center gap-1'>
            <div className='w-3 h-3 rounded-full bg-red-100 border border-red-200'></div>
            <span>Abaixo da meta (&lt;80%)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParametersMatrix;
