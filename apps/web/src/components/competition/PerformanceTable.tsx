// apps/web/src/components/competition/PerformanceTable.tsx (ATUALIZADO COM TOTAIS)
'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Criterion } from '@/hooks/useParametersData';
import { useMemo } from 'react';

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
  const roundedNum = Math.round(num);

  // Formatação para valores monetários (arredondado)
  if (normalizedName.includes('PNEUS') || normalizedName.includes('PEÇAS')) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedNum);
  }

  // Formatação para litros (arredondado)
  if (normalizedName.includes('COMBUSTIVEL')) {
    return `${roundedNum.toLocaleString('pt-BR')}L`;
  }

  // Formatação padrão para outros números
  if (num % 1 === 0) {
    return num.toLocaleString('pt-BR');
  }
  return Number(num).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
};

// Função para determinar se critério deve usar soma ou média
const getCalculationType = (criterionName: string): 'sum' | 'average' => {
  const normalizedName = criterionName.toUpperCase().trim();
  return CRITERION_CALCULATION_TYPE[normalizedName] || 'sum';
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

// Componente de célula compacta com tooltip
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
          {/* O Tooltip continua o mesmo, com os dados completos */}
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

// Componente de célula de total
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
    if (normalizedName.includes('PNEUS')) {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (normalizedName.includes('PEÇAS')) {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Para outros critérios
    if (calcType === 'average') {
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      // Soma - sempre valor exato, sem "k"
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
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
  // Transformar dados para ordenação por pontuação total
  const dataWithRanking = useMemo(() => {
    if (!resultsBySector || Object.keys(resultsBySector).length === 0) {
      return [];
    }

    const sectorsWithPoints = Object.entries(resultsBySector).map(
      ([sectorId, sectorData]) => {
        if (!sectorData) {
          return {
            sectorId,
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
          sectorId,
          setorNome: sectorData.setorNome || 'Desconhecido',
          totalPontos,
          criteriaResults,
        };
      }
    );

    // Ordenar por pontuação (menor é melhor)
    return sectorsWithPoints.sort((a, b) => a.totalPontos - b.totalPontos);
  }, [resultsBySector]);

  // Calcular totais por critério
  const criterionTotals = useMemo(() => {
    if (!uniqueCriteria || dataWithRanking.length === 0) {
      return {};
    }

    const totals: Record<
      number,
      { value: number; type: 'sum' | 'average'; count: number }
    > = {};

    uniqueCriteria.forEach((criterion) => {
      const sectorData = dataWithRanking
        .map((sector) => sector.criteriaResults[criterion.id])
        .filter(
          (data) =>
            data &&
            data.valorRealizado !== null &&
            data.valorRealizado !== undefined
        );

      const result = calculateCriterionTotal(criterion.nome, sectorData);
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

  return (
    <TooltipProvider>
      <div className='w-full'>
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
                  {/* Coluna SETOR com largura fixa */}
                  <th className='sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r w-[180px]'>
                    Setor
                  </th>

                  {uniqueCriteria.map((criterio) => {
                    const normalizedName = criterio.nome.toUpperCase().trim();
                    const isCurrency =
                      normalizedName.includes('PNEUS') ||
                      normalizedName.includes('PEÇAS');

                    return (
                      <th
                        key={criterio.id}
                        className='px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r max-w-[95px]'
                      >
                        <div className='flex flex-col items-center justify-center'>
                          <span className='whitespace-normal break-words'>
                            {criterio.nome}
                          </span>
                          {isCurrency && (
                            <span className='mt-1 font-normal normal-case text-green-700'>
                              (R$)
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className='px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-100'>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {/* Linhas dos setores */}
                {dataWithRanking.map((setor, index) => {
                  const posicao = index + 1;
                  const isFirstPlace = posicao === 1;
                  return (
                    <tr
                      key={setor.sectorId}
                      className={`${isFirstPlace ? 'bg-green-50' : ''} hover:bg-gray-50`}
                    >
                      {/* Célula do SETOR */}
                      <td
                        className={`sticky left-0 px-3 py-2 border-r ${isFirstPlace ? 'bg-green-50' : 'bg-white'}`}
                      >
                        <div className='flex items-center gap-2'>
                          {getPosicaoIcon(posicao)}
                          <div>
                            <div className='font-semibold text-sm'>
                              {setor.setorNome}
                            </div>
                            <div className='text-xs text-gray-500'>
                              {posicao}° lugar
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Colunas dos critérios */}
                      {uniqueCriteria.map((criterio) => {
                        const criterioData = setor.criteriaResults[criterio.id];
                        return (
                          <td key={criterio.id} className='px-1 py-2 border-r'>
                            <CompactCell
                              criterio={criterio}
                              dados={criterioData}
                            />
                          </td>
                        );
                      })}

                      {/* Coluna de pontuação total */}
                      <td className='px-3 py-2 text-center bg-gray-100'>
                        <div className='font-bold text-lg'>
                          {setor.totalPontos.toFixed(2)}
                        </div>
                        <div className='text-xs text-gray-600'>pontos</div>
                      </td>
                    </tr>
                  );
                })}

                {/* LINHA DE TOTAIS */}
                <tr className='bg-blue-100 border-t-2 border-blue-300'>
                  {/* Célula de cabeçalho para totais */}
                  <td className='sticky left-0 bg-blue-100 px-3 py-3 border-r font-bold text-blue-900'>
                    <div className='flex items-center gap-2'>
                      <span className='text-lg'>📊</span>
                      <div>
                        <div className='font-bold text-sm'>TOTAIS</div>
                        <div className='text-xs text-blue-700'>
                          Por critério
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Células de totais por critério */}
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

                  {/* Célula de total de pontos (vazia ou informativa) */}
                  <td className='px-3 py-2 text-center bg-blue-150 border-l border-blue-300'>
                    <div className='text-xs text-blue-700 font-medium'>
                      Soma Total
                    </div>
                    <div className='text-sm font-bold text-blue-800'>
                      {dataWithRanking
                        .reduce((sum, setor) => sum + setor.totalPontos, 0)
                        .toFixed(2)}
                    </div>
                    <div className='text-[10px] text-blue-600'>pontos</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Legenda */}
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

        {/* Nota explicativa */}
        <div className='mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded'>
          <div className='mb-2'>
            <strong>Formato:</strong> Para PEÇAS/PNEUS/COMBUSTÍVEL:
            Realizado/Meta direto • Para outros: R: Realizado / M: Meta • %
            Atingimento • Pontos (menor = melhor)
          </div>
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
