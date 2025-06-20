// apps/web/src/components/competition/PerformanceTable.tsx (AJUSTADO)
'use client';

import { Criterion } from '@/hooks/useParametersData';
import { useMemo } from 'react';

interface PerformanceTableProps {
  resultsBySector: Record<number, any>;
  uniqueCriteria: Criterion[];
  activeCriteria: Criterion[];
  isLoading: boolean;
  error: Error | null;
}

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

// Função para formatar números de forma compacta
const formatCompactNumber = (num: number | undefined | null): string => {
  if (!num && num !== 0) return '0';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  if (num % 1 === 0) return num.toString();
  return Number(num).toFixed(2);
};

// Componente de célula compacta
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

  // Cálculo correto do percentual
  const percentage = (dados.percentualAtingimento || 0) * 100;
  const colorClass = getPontuacaoColor(dados.pontos || 0);

  return (
    <div className='text-center p-1'>
      <div className='text-xs mb-1'>
        <div className='font-semibold'>
          {formatCompactNumber(dados.valorRealizado)}
        </div>
        <div className='text-gray-500 text-[10px]'>
          {formatCompactNumber(dados.valorMeta)}
        </div>
      </div>
      <div className='w-full bg-gray-200 rounded-full h-1.5 mb-1'>
        <div
          className={`h-1.5 rounded-full ${colorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className='text-xs font-medium'>{percentage.toFixed(1)}%</div>
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

  if (isLoading) {
    // ... Skeleton loader ...
    return <div>Carregando...</div>;
  }
  if (error) {
    return <div>Erro ao carregar dados.</div>;
  }
  if (!dataWithRanking.length) {
    return <div>Nenhum dado disponível.</div>;
  }

  return (
    <div className='w-full'>
      <div className='mb-4'>
        <p className='text-sm text-gray-600'>
          Período Atual • Menor pontuação = Melhor posição
        </p>
      </div>
      <div className='border rounded-lg bg-white overflow-hidden'>
        <div className='overflow-x-auto'>
          {/* Adicionada a classe 'table-fixed' */}
          <table className='w-full table-fixed'>
            <thead className='bg-gray-50'>
              <tr>
                {/* Coluna SETOR com largura fixa e estilo ajustado */}
                <th className='sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r w-[180px]'>
                  Setor
                </th>

                {/* Colunas de Critérios com texto reto e quebra de linha */}
                {uniqueCriteria.map((criterio) => (
                  <th
                    key={criterio.id}
                    className='px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r max-w-[95px]'
                  >
                    <span className='whitespace-normal break-words'>
                      {criterio.nome}
                    </span>
                  </th>
                ))}
                <th className='px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-100'>
                  Total
                </th>
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
                    {/* Célula do SETOR com largura e fundo controlados */}
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
            </tbody>
          </table>
        </div>
      </div>
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
      <div className='mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded'>
        <strong>Formato:</strong> Realizado / Meta • % Atingimento • Pontos
        (menor = melhor)
      </div>
    </div>
  );
}
