// apps/web/src/components/competition/PerformanceTable.tsx (ATUALIZADO COM RESPONSIVIDADE)
'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Criterion } from '@/hooks/useParametersData';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react'; // Importados useState e useEffect

interface PerformanceTableProps {
  resultsBySector: Record<number, any>;
  uniqueCriteria: Criterion[];
  activeCriteria: Criterion[];
  isLoading: boolean;
  error: Error | null;
}

// Configuração de critérios - determina se é soma ou média
const CRITERION_CALCULATION_TYPE: Record<string, 'sum' | 'average'> = {
  ATRASO: 'sum',
  'FURO POR VIAGEM': 'sum',
  QUEBRA: 'sum',
  DEFEITO: 'sum',
  'FALTA FUNC': 'sum',
  COLISÃO: 'sum',
  IPK: 'average',
  'ATESTADO FUNC': 'sum',
  'FALTA FROTA': 'sum',
  PEÇAS: 'sum',
  PNEUS: 'sum',
  COMBUSTIVEL: 'sum',
  'MEDIA KM/L': 'average',
  'KM OCIOSA': 'average',
  'FURO POR ATRASO': 'sum',
};

// Função para obter cor baseada na pontuação
const getPontuacaoColor = (pontos: number) => {
  if (pontos === 1.0) return 'bg-green-500';
  if (pontos === 1.5) return 'bg-green-400';
  if (pontos === 2.0) return 'bg-yellow-500';
  if (pontos === 2.5) return 'bg-red-500';
  return 'bg-gray-400';
};

// Função para obter ícone de posição
const getPosicaoIcon = (posicao: number) => {
  if (posicao === 1) return '🏆';
  if (posicao === 2)
    return <span className='w-4 h-4 text-gray-400 font-bold'>2°</span>;
  if (posicao === 3)
    return <span className='w-4 h-4 text-amber-600 font-bold'>3°</span>;
  return <span className='w-4 h-4 text-gray-600 font-bold'>{posicao}°</span>;
};

// Função para formatar números baseado no critério
const formatNumberByCriterion = (
  num: number | undefined | null,
  criterionName: string
): string => {
  if (num === null || num === undefined) return '0';

  const normalizedName = criterionName.toUpperCase().trim();
  // Não arredondar aqui, a menos que seja especificamente para o caso de dinheiro ou litros
  // Para valores gerais, manter a precisão original antes de formatar
  const numToFormat = Number(num);

  // Formatação para valores monetários (arredondado)
  if (normalizedName.includes('PNEUS') || normalizedName.includes('PEÇAS')) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal', // Use decimal para apenas o número
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numToFormat); // Aplicar o formatador ao número original
  }

  // Formatação para litros (arredondado)
  if (normalizedName.includes('COMBUSTIVEL')) {
    return `${numToFormat.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L`;
  }

  // Formatação padrão para outros números
  if (numToFormat % 1 === 0) {
    return numToFormat.toLocaleString('pt-BR');
  }
  return numToFormat.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
};

// Função para determinar se critério deve usar soma ou média
const getCalculationType = (criterionName: string): 'sum' | 'average' => {
  const normalizedName = criterionName.toUpperCase().trim();
  return CRITERION_CALCULATION_TYPE[normalizedName] || 'sum';
};

const getPointsColorByRank = (rank: number): string => {
  if (rank === 1) return 'text-green-600'; // Verde para o 1º lugar
  if (rank === 2) return 'text-yellow-600'; // Amarelo para o 2º lugar
  if (rank === 3) return 'text-orange-500'; // Laranja para o 3º lugar
  return 'text-red-600'; // Vermelho para as demais posições
};

// Função para calcular total (soma ou média) de um critério
const calculateCriterionTotal = (
  criterionName: string,
  sectorData: any[]
): { value: number; type: 'sum' | 'average'; count: number } => {
  const calculationType = getCalculationType(criterionName);
  const validValues = sectorData
    .map((sector) => sector.valorRealizado)
    .filter((value) => value !== null && value !== undefined && !isNaN(value))
    .map((value) => Number(value));

  if (validValues.length === 0) {
    return { value: 0, type: calculationType, count: 0 };
  }

  if (calculationType === 'sum') {
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    return { value: sum, type: 'sum', count: validValues.length };
  } else {
    const average =
      validValues.reduce((acc, val) => acc + val, 0) / validValues.length;
    return { value: average, type: 'average', count: validValues.length };
  }
};

// Função para obter status baseado na pontuação
const getStatusByPoints = (points: number): string => {
  if (points === 1.0) return 'Excelente';
  if (points === 1.5) return 'Bom';
  if (points === 2.0) return 'Atenção';
  if (points === 2.5) return 'Crítico';
  return 'N/A';
};

// Componente de célula compacta com tooltip (mantido igual)
const CompactCell = ({
  criterio,
  dados,
}: {
  criterio: Criterion;
  dados: any;
}) => {
  if (!dados) {
    return (
      <div className='text-center p-1 text-gray-400'>
        <div className='text-xs'>-</div>
      </div>
    );
  }

  const percentage = (dados.percentualAtingimento || 0) * 100;
  const colorClass = getPontuacaoColor(dados.pontos || 0);
  const status = getStatusByPoints(dados.pontos || 0);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className='text-center cursor-help hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded transition-colors'>
            {/* Bloco Realizado */}
            <div>
              <div className='font-bold text-gray-700 dark:text-gray-100 leading-tight text-base'>
                {formatNumberByCriterion(dados.valorRealizado, criterio.nome)}
              </div>
              <div className='text-[10px] text-gray-500 dark:text-gray-400 '>
                Realizado
              </div>
            </div>

            {/* Bloco Meta */}
            <div className='mb-1 mt-2'>
              <div className='font-bold text-gray-700 dark:text-gray-100 leading-tight text-base'>
                {formatNumberByCriterion(dados.valorMeta, criterio.nome)}
              </div>
              <div className='text-[10px] text-gray-500 dark:text-gray-400 '>
                Meta
              </div>
            </div>

            {/* Barra de Progresso e Porcentagem */}
            <div className='space-y-1 w-full'>
              <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
                <div
                  className={`h-1.5 rounded-full ${colorClass}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <div className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
                {percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side='top' className='max-w-xs'>
          <div className='space-y-1 text-xs'>
            <div className='font-semibold text-center border-b pb-1 mb-2'>
              {criterio.nome}
            </div>
            <div>
              <span className='font-medium text-blue-600'>Realizado:</span>{' '}
              {formatNumberByCriterion(dados.valorRealizado, criterio.nome)}
            </div>
            <div>
              <span className='font-medium text-gray-600'>Meta:</span>{' '}
              {formatNumberByCriterion(dados.valorMeta, criterio.nome)}
            </div>
            <div>
              <span className='font-medium text-green-600'>Atingimento:</span>{' '}
              {percentage.toFixed(1)}%
            </div>
            <div>
              <span className='font-medium text-purple-600'>Pontos:</span>{' '}
              {(dados.pontos || 0).toFixed(1)}
            </div>
            <div className='pt-1 border-t'>
              <span className='font-medium'>Status:</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded text-xs ${
                  status === 'Excelente'
                    ? 'bg-green-100 text-green-800'
                    : status === 'Bom'
                      ? 'bg-green-50 text-green-700'
                      : status === 'Atenção'
                        ? 'bg-yellow-100 text-yellow-800'
                        : status === 'Crítico'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                }`}
              >
                {status}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Componente de célula de total (mantido igual)
const TotalCell = ({
  criterionName,
  total,
  type,
  count,
}: {
  criterionName: string;
  total: number;
  type: 'sum' | 'average';
  count: number;
}) => {
  const normalizedName = criterionName.toUpperCase().trim();

  const formatTotalValue = (
    value: number,
    calcType: 'sum' | 'average',
    critName: string
  ): string => {
    // Formatação específica por critério
    if (
      normalizedName.includes('COMBUSTIVEL') ||
      normalizedName.includes('COMBUSTÍVEL')
    ) {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L`;
    }
    if (normalizedName.includes('PNEUS') || normalizedName.includes('PEÇAS')) {
      return `R\$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Para outros critérios
    if (calcType === 'average') {
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      // Soma - sempre valor exato
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0, // Corrigido para 0 para somas exatas
      });
    }
  };

  // Determinar tamanho da fonte baseado no critério
  const isSpecialCriterion =
    normalizedName.includes('COMBUSTIVEL') ||
    normalizedName.includes('COMBUSTÍVEL') ||
    normalizedName.includes('PNEUS') ||
    normalizedName.includes('PEÇAS');
  const fontSizeClass = isSpecialCriterion ? 'text-[10px]' : 'text-sm';

  return (
    <div className='text-center p-2 bg-blue-50 border-l border-blue-200'>
      <div className='text-xs font-semibold text-blue-900 mb-1'>
        {type === 'sum' ? 'Soma:' : 'Média:'}
      </div>
      <div className={`${fontSizeClass} font-bold text-blue-800`}>
        {formatTotalValue(total, type, criterionName)}
      </div>
      <div className='text-[10px] text-blue-600 mt-1'>
        {count} filial{count !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default function PerformanceTable({
  resultsBySector,
  uniqueCriteria,
  isLoading,
  error,
}: PerformanceTableProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Hook para detectar se é mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // Exemplo: 768px como breakpoint
    checkMobile(); // Checa na montagem
    window.addEventListener('resize', checkMobile); // Adiciona listener para redimensionamento
    return () => window.removeEventListener('resize', checkMobile); // Remove listener na desmontagem
  }, []);

  // Transformar dados para ordenação por pontuação total (mantido igual)
  const dataWithRanking = useMemo(() => {
    if (!resultsBySector || Object.keys(resultsBySector).length === 0) {
      return [];
    }

    const sectorsWithPoints = Object.entries(resultsBySector).map(
      ([sectorId, sectorData]) => {
        if (!sectorData) {
          return {
            sectorId: Number(sectorId), // Garante que sectorId é um número
            setorNome: 'Desconhecido',
            totalPontos: 0,
            criteriaResults: {},
          };
        }

        const criteriaResults =
          sectorData.criteriaResults || sectorData.criterios || {};
        const totalPontos = Object.values(criteriaResults).reduce(
          (sum: number, criterio: any) => sum + (criterio.pontos || 0),
          0
        );

        return {
          sectorId: Number(sectorId), // Garante que sectorId é um número
          setorNome: sectorData.setorNome || 'Desconhecido',
          totalPontos,
          criteriaResults,
        };
      }
    );

    // Ordenar por pontuação (menor é melhor)
    return sectorsWithPoints.sort((a, b) => a.totalPontos - b.totalPontos);
  }, [resultsBySector]);

  // Calcular totais por critério (mantido igual)
  const criterionTotals = useMemo(() => {
    if (!uniqueCriteria || dataWithRanking.length === 0) {
      return {};
    }

    const totals: Record<
      number,
      { value: number; type: 'sum' | 'average'; count: number }
    > = {};

    uniqueCriteria.forEach((criterion) => {
      // Filtrar dados de todos os setores para o critério atual
      const sectorDataForCriterion = dataWithRanking.flatMap((sector) => {
        const criterionResult = sector.criteriaResults[criterion.id];
        return criterionResult ? [criterionResult] : [];
      });

      const result = calculateCriterionTotal(
        criterion.nome,
        sectorDataForCriterion
      );
      totals[criterion.id] = result;
    });

    return totals;
  }, [uniqueCriteria, dataWithRanking]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>Erro ao carregar dados.</div>;
  }

  if (!dataWithRanking.length) {
    return <div>Nenhum dado disponível.</div>;
  }

  // Componente de Card para Mobile
  const MobileSectorCard = ({
    setor,
    posicao,
  }: {
    setor: any;
    posicao: number;
  }) => {
    const isFirstPlace = posicao === 1;
    return (
      <div
        className={`p-4 mb-4 rounded-lg shadow-md ${isFirstPlace ? 'bg-green-50 border-2 border-green-200' : 'bg-white border border-gray-200'}`}
      >
        <div className='flex items-center justify-between mb-3 border-b pb-2'>
          <div className='flex items-center gap-2'>
            <span className='text-xl font-bold'>{getPosicaoIcon(posicao)}</span>
            <h3 className='text-lg font-semibold text-gray-800'>
              {setor.setorNome}
            </h3>
          </div>
          <div className='text-right'>
            <div
              className={`font-bold text-2xl ${getPointsColorByRank(posicao)}`}
            >
              {setor.totalPontos.toFixed(2)}
            </div>
            <div className='text-xs font-medium text-blue-600 -mt-1'>
              pontos
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4'>
          {uniqueCriteria.map((criterio) => {
            const dados = setor.criteriaResults[criterio.id];
            if (!dados) {
              return (
                <div
                  key={criterio.id}
                  className='border p-2 rounded-md bg-gray-50'
                >
                  <h4 className='font-semibold text-sm mb-1 text-gray-700'>
                    {criterio.nome}
                  </h4>
                  <p className='text-xs text-gray-500'>Dados não disponíveis</p>
                </div>
              );
            }

            const percentage = (dados.percentualAtingimento || 0) * 100;
            const colorClass = getPontuacaoColor(dados.pontos || 0);

            return (
              <div
                key={criterio.id}
                className='border p-2 rounded-md bg-gray-50'
              >
                <h4 className='font-semibold text-sm mb-1 text-gray-700'>
                  {criterio.nome}
                </h4>
                <div className='flex justify-between items-center text-sm mb-1'>
                  <div>
                    <span className='text-gray-600'>Realizado:</span>{' '}
                    <strong className='text-gray-800'>
                      {formatNumberByCriterion(
                        dados.valorRealizado,
                        criterio.nome
                      )}
                    </strong>
                  </div>
                  <div>
                    <span className='text-gray-600'>Meta:</span>{' '}
                    <strong className='text-gray-700'>
                      {formatNumberByCriterion(dados.valorMeta, criterio.nome)}
                    </strong>
                  </div>
                </div>
                <div className='flex items-center justify-between text-xs mt-1'>
                  <div className='flex-1'>
                    <div className='w-full bg-gray-200 rounded-full h-1.5'>
                      <div
                        className={`h-1.5 rounded-full ${colorClass}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className='ml-2'>
                    <span className='font-semibold text-gray-700'>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className='text-xs text-gray-600 mt-2'>
                  Pontos:{' '}
                  <strong className='font-bold text-gray-800'>
                    {(dados.pontos || 0).toFixed(1)}
                  </strong>{' '}
                  | Status:{' '}
                  <span
                    className={`${getStatusByPoints(dados.pontos || 0) === 'Excelente' ? 'text-green-700' : getStatusByPoints(dados.pontos || 0) === 'Bom' ? 'text-green-600' : getStatusByPoints(dados.pontos || 0) === 'Atenção' ? 'text-yellow-700' : 'text-red-700'}`}
                  >
                    {getStatusByPoints(dados.pontos || 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Componente de Card de Totais para Mobile
  const MobileTotalsCard = () => (
    <div className='bg-blue-100 border-2 border-blue-300 p-4 rounded-lg shadow-md mt-4'>
      <h3 className='font-bold text-lg mb-3 text-blue-900 border-b border-blue-300 pb-2'>
        📊 Totais por Critério
      </h3>
      <div className='space-y-3'>
        {uniqueCriteria.map((criterio) => {
          const totalData = criterionTotals[criterio.id];
          if (!totalData) return null;

          const normalizedName = criterio.nome.toUpperCase().trim();
          const isSpecialCriterion =
            normalizedName.includes('COMBUSTIVEL') ||
            normalizedName.includes('COMBUSTÍVEL') ||
            normalizedName.includes('PNEUS') ||
            normalizedName.includes('PEÇAS');

          const fontSizeClass = isSpecialCriterion ? 'text-sm' : 'text-base'; // Adjusted for mobile card
          const formattedValue = formatNumberByCriterion(
            totalData.value,
            criterio.nome
          );

          return (
            <div
              key={criterio.id}
              className='flex justify-between items-center py-1'
            >
              <div className='flex-1 pr-2'>
                <span className='text-sm text-blue-800 font-medium block'>
                  {criterio.nome}
                </span>
                <span className='text-xs text-blue-600'>
                  ({totalData.type === 'sum' ? 'Soma' : 'Média'} de{' '}
                  {totalData.count} filiais)
                </span>
              </div>
              <span
                className={`${fontSizeClass} font-bold text-blue-900 text-right`}
              >
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className='w-full'>
        {isMobile ? (
          // LAYOUT PARA MOBILE (CARDS)
          <>
            <div className='mb-4'>
              <p className='text-sm text-gray-600'>
                Período Atual • Menor pontuação = Melhor posição
              </p>
            </div>
            {dataWithRanking.map((setor, index) => (
              <MobileSectorCard
                key={setor.sectorId}
                setor={setor}
                posicao={index + 1}
              />
            ))}
            <MobileTotalsCard />
          </>
        ) : (
          // LAYOUT ORIGINAL PARA DESKTOP (TABELA)
          <>
            <div className='mb-4'>
              <p className='text-sm text-gray-600'>
                Período Atual • Menor pontuação = Melhor posição
              </p>
            </div>
            <div className='border rounded-lg bg-white overflow-hidden'>
              <div className='overflow-x-auto'>
                <table className='w-full table-fixed'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r w-[140px]'>
                        Setor
                      </th>

                      {uniqueCriteria.map((criterio) => {
                        const normalizedName = criterio.nome
                          .toUpperCase()
                          .trim();
                        const isCurrency =
                          normalizedName.includes('PNEUS') ||
                          normalizedName.includes('PEÇAS');

                        // Lógica para renomear
                        let displayName = criterio.nome;
                        if (normalizedName === 'ATESTADO FUNC') {
                          displayName = 'ATESTADO';
                        }

                        // Lógica para direção da seta
                        const isBiggerBetter =
                          normalizedName === 'IPK' ||
                          normalizedName === 'MEDIA KM/L';
                        const ArrowIcon = isBiggerBetter ? ArrowUp : ArrowDown;
                        const arrowColor = isBiggerBetter
                          ? 'text-blue-600'
                          : 'text-blue-600';

                        return (
                          <th
                            key={criterio.id}
                            className='px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r max-w-[95px]'
                          >
                            <div className='flex flex-col items-center justify-center'>
                              <div className='flex items-center justify-center gap-1'>
                                <span className='whitespace-normal break-words'>
                                  {displayName}
                                </span>
                                <ArrowIcon
                                  className={`h-4 w-4 shrink-0 ${arrowColor}`}
                                />
                              </div>
                              {isCurrency && (
                                <span className='mt-1 font-normal normal-case text-green-700'>
                                  (R\$)
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200'>
                    {dataWithRanking.map((setor, index) => {
                      const posicao = index + 1;
                      const isFirstPlace = posicao === 1;
                      return (
                        <tr
                          key={setor.sectorId}
                          className={`${isFirstPlace ? 'bg-green-50' : ''} hover:bg-gray-50`}
                        >
                          {/* ---   CÉLULA DE SETOR COM PONTUAÇÃO --- */}
                          <td
                            className={`sticky left-0 py-3 border-r ${isFirstPlace ? 'bg-green-50' : 'bg-white'}`}
                          >
                            <div className='flex flex-col items-center justify-center gap-3'>
                              {/* Lado Esquerdo: Posição e Nome */}
                              <div className='flex items-center gap-3'>
                                <span className='text-lg'>
                                  {getPosicaoIcon(posicao)}
                                </span>
                                <div>
                                  <div className='font-semibold text-[12px] text-gray-800'>
                                    {setor.setorNome}
                                  </div>
                                </div>
                              </div>

                              {/* Lado Direito: Pontuação Total */}
                              <div className='text-right'>
                                <div
                                  className={`font-bold text-xl ${getPointsColorByRank(posicao)}`}
                                >
                                  {setor.totalPontos.toFixed(2)}
                                </div>
                                <div className='text-xs font-medium text-blue-600 -mt-1'>
                                  pontos
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Colunas dos critérios (sem alteração) */}
                          {uniqueCriteria.map((criterio) => {
                            const criterioData =
                              setor.criteriaResults[criterio.id];
                            return (
                              <td
                                key={criterio.id}
                                className='px-1 py-2 border-r'
                              >
                                <CompactCell
                                  criterio={criterio}
                                  dados={criterioData}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* LINHA DE TOTAIS */}
                    <tr className='bg-blue-100 border-t-2 border-blue-300'>
                      <td className='sticky left-0 bg-blue-100 px-3 py-3 border-r font-bold text-blue-900'>
                        {/* Esta célula ficará vazia ou com um texto "Totais" */}
                        TOTAIS
                      </td>
                      {uniqueCriteria.map((criterio) => {
                        const totalData = criterionTotals[criterio.id];
                        return (
                          <td
                            key={`total-${criterio.id}`}
                            className='px-1 py-2 border-r'
                          >
                            <TotalCell
                              criterionName={criterio.nome}
                              total={totalData?.value || 0}
                              type={totalData?.type || 'sum'}
                              count={totalData?.count || 0}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Legenda (visível em ambos) */}
        <div className='mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs'>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-green-500 rounded'></div>
            <span>1.0 pts - Excelente</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-green-400 rounded'></div>
            <span>1.5 pts - Bom</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-yellow-500 rounded'></div>
            <span>2.0 pts - Atenção</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-red-500 rounded'></div>
            <span>2.5 pts - Crítico</span>
          </div>
        </div>

        {/* Nota explicativa (visível em ambos) */}
        <div className='mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded'>
          <div className='mb-2'>
            <strong>Interação:</strong> Passe o mouse sobre as células para ver
            detalhes completos
          </div>
          <div>
            <strong>Totais:</strong> Soma para maioria dos critérios, Média para
            IPK, Média KM/L e KM Ociosa
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
