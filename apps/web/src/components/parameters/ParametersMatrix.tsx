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
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Edit,
  History,
  Info,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import React, { useState } from 'react';
import { CalculationSettings } from './CalculationSettings';

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
    criterio: Criterion, // Adicione o tipo aqui para clareza
    sectorIdStr: string, // Mude o nome para evitar confusão com o objeto sectorId
    sectorData: any // Mantenha any por enquanto ou defina tipo específico
  ) => {
    const criterioId = String(criterio.id); // Mantenha se usado assim
    const hasCriterio =
      sectorData.criterios && criterioId in sectorData.criterios;
    const criterioData = hasCriterio ? sectorData.criterios[criterioId] : null;

    const currentSector =
      sectors.find((s) => s.id === parseInt(sectorIdStr)) || null;

    // Se não há dados para este critério/setor
    if (!criterioData) {
      return (
        <div className='flex flex-col items-center justify-center p-3 h-full min-h-[100px] bg-muted/5 rounded-md'>
          <div className='text-muted-foreground text-sm mb-2'>
            Sem meta definida
          </div>
          {isPlanejamento &&
            periodoAtual && ( // Adicione checagem para periodoAtual
              <div className='flex gap-2'>
                {onCreate && ( // Verifique se onCreate e onCalculate existem antes de chamar
                  <button
                    onClick={() => {
                      if (onCreate && periodoAtual) {
                        // Proteção extra
                        // TODO: Ajustar os parâmetros de onCreate para bater com ParametersPage
                        // Exemplo: onCreate(criterio, currentSector, periodoAtual)
                        // Por agora, vou manter a chamada original para focar no onCalculate
                        onCreate(
                          criterio.id,
                          parseInt(sectorIdStr),
                          criterio.nome
                        );
                      }
                    }}
                    className='text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition-colors'
                  >
                    Criar Meta
                  </button>
                )}
                {onCalculate && (
                  <button
                    onClick={() => {
                      if (onCalculate && periodoAtual) {
                        // Proteção extra
                        onCalculate(criterio, currentSector, periodoAtual); // <<< CHAMADA CORRIGIDA
                      }
                    }}
                    className='text-xs px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full transition-colors'
                  >
                    Calcular
                  </button>
                )}
              </div>
            )}
        </div>
      );
    }

    // Fase de Planejamento
    if (isPlanejamento) {
      // Extrair informações de cálculo (assumindo que esses dados estão disponíveis ou serão adicionados)
      const mediaUltimosMeses = criterioData.mediaUltimosMeses;
      const ajustePercentual = criterioData.ajustePercentual;
      const temCalculoDetalhado =
        mediaUltimosMeses !== undefined && ajustePercentual !== undefined;

      // Obter configurações de cálculo para este critério
      const settings = CalculationSettings[criterio.id];

      return (
        <div className='p-3 bg-blue-50 rounded-md border border-blue-100 transition-all hover:shadow-sm'>
          <div className='text-center'>
            <div className='text-lg font-semibold'>
              {criterioData.valorMeta !== null
                ? criterioData.valorMeta.toLocaleString('pt-BR')
                : '-'}
            </div>
            <div className='text-xs text-gray-500 mt-1'>Meta Proposta</div>
          </div>

          {/* Seção aprimorada com informações detalhadas */}
          <div className='mt-3 pt-2 border-t border-blue-100'>
            <div className='text-xs text-gray-600 flex justify-between'>
              <span>Meta Anterior:</span>
              <span className='font-medium'>
                {criterioData.metaAnterior !== undefined
                  ? criterioData.metaAnterior?.toLocaleString('pt-BR')
                  : '-'}
              </span>
            </div>

            {/* Usar o componente separado para exibir configurações de cálculo */}
            <CalculationSettings criterionId={criterio.id} />
          </div>

          {/* Botões de ação */}
          <div className='flex justify-between mt-3 pt-2'>
            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        // TODO: Ajustar os parâmetros de onEdit para bater com ParametersPage
                        // Exemplo: onEdit(criterio, currentSector, criterioData.valorMeta)
                        // Por agora, vou manter a chamada original para focar no onCalculate
                        onEdit({
                          criterioId: criterio.id,
                          criterioNome: criterio.nome,
                          setorId: parseInt(sectorIdStr),
                          setorNome: sectorData.setorNome,
                          valorMeta: criterioData.valorMeta,
                          metaAnterior: criterioData.metaAnterior,
                          mediaUltimosMeses: criterioData.mediaUltimosMeses,
                          ajustePercentual: criterioData.ajustePercentual,
                        });
                      }}
                      className='text-blue-600 hover:text-blue-800 transition-colors'
                    >
                      <Edit className='h-4 w-4' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar Meta</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {onCalculate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (onCalculate && periodoAtual) {
                          // Proteção extra
                          onCalculate(criterio, currentSector, periodoAtual); // <<< CHAMADA CORRIGIDA
                        }
                      }}
                      className='text-emerald-600 hover:text-emerald-800 transition-colors'
                    >
                      <Calculator className='h-4 w-4' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Calcular Meta Automaticamente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      // Implementar visualização de histórico
                      console.log('Ver histórico', {
                        criterioId: criterio.id,
                        setorId: parseInt(sectorId),
                      });
                    }}
                    className='text-gray-500 hover:text-gray-700 transition-colors'
                  >
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

    // Fase Ativa (Premiação em Andamento)
    if (isAtiva) {
      // Calcular cor com base no atingimento
      const atingimento = criterioData.percentualAtingimento || 0;
      const statusColor =
        atingimento >= 1
          ? 'bg-green-50 border-green-200'
          : atingimento >= 0.8
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200';

      // Determinar ícone de tendência (simulado, adicione lógica real conforme necessário)
      const tendencia = criterioData.tendencia || 0;
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
                {criterioData.valorMeta !== null
                  ? criterioData.valorMeta.toLocaleString('pt-BR')
                  : '-'}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Realizado:</span>
              <span>
                {criterioData.valorRealizado !== null
                  ? criterioData.valorRealizado.toLocaleString('pt-BR')
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
                  {criterioData.percentualAtingimento !== null
                    ? `${(criterioData.percentualAtingimento * 100).toFixed(1)}%`
                    : '-'}
                </span>
                {trendIcon}
              </div>
            </div>

            <div className='flex justify-between text-sm mt-1'>
              <span className='text-gray-600'>Pontos:</span>
              <span className='font-semibold'>
                {criterioData.pontos !== null ? criterioData.pontos : '-'}
              </span>
            </div>
          </div>

          {/* Apenas botão de histórico na fase ativa */}
          <div className='flex justify-center mt-3 pt-2'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      // Implementar visualização de histórico
                      console.log('Ver histórico', {
                        criterioId: criterio.id,
                        setorId: parseInt(sectorId),
                      });
                    }}
                    className='text-gray-500 hover:text-gray-700 transition-colors'
                  >
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
      const atingimento = criterioData.percentualAtingimento || 0;
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
                {criterioData.valorMeta !== null
                  ? criterioData.valorMeta.toLocaleString('pt-BR')
                  : '-'}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Realizado:</span>
              <span>
                {criterioData.valorRealizado !== null
                  ? criterioData.valorRealizado.toLocaleString('pt-BR')
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
                {criterioData.percentualAtingimento !== null
                  ? `${(criterioData.percentualAtingimento * 100).toFixed(1)}%`
                  : '-'}
              </span>
            </div>

            <div className='flex justify-between text-sm mt-1'>
              <span className='text-gray-600'>Pontos:</span>
              <span className='font-semibold'>
                {criterioData.pontos !== null ? criterioData.pontos : '-'}
              </span>
            </div>
          </div>

          <div className='flex justify-center mt-3 pt-2'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      // Implementar visualização de histórico
                      console.log('Ver histórico', {
                        criterioId: criterio.id,
                        setorId: parseInt(sectorId),
                      });
                    }}
                    className='text-gray-500 hover:text-gray-700 transition-colors'
                  >
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
              {criterioData.valorMeta !== null
                ? criterioData.valorMeta.toLocaleString('pt-BR')
                : '-'}
            </span>
          </div>
          {criterioData.valorRealizado !== null && (
            <div className='flex justify-between text-sm'>
              <span>Realizado:</span>
              <span>{criterioData.valorRealizado.toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>

        <div className='flex justify-center mt-3 pt-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    console.log('Ver histórico', {
                      criterioId: criterio.id,
                      setorId: parseInt(sectorId),
                    });
                  }}
                  className='text-gray-500 hover:text-gray-700 transition-colors'
                >
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
