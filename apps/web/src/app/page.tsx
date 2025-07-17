'use client';

import PerformanceTable from '@/components/competition/PerformanceTable';
import PointsTable from '@/components/competition/PointsTable';
import FilterControls from '@/components/filters/FilterControls';
import Header from '@/components/home/Header';
import { TooltipProvider } from '@/components/ui/tooltip';
import ShareRankingButton from '@/components/vigencia/ShareRankingButton';
import VigenciaStatusBadge from '@/components/vigencia/VigenciaStatusBadge';
import { useCompetitionData } from '@/hooks/useCompetitionData';
import { useMemo, useState } from 'react';

export default function HomePage() {
  const {
    rankingData,
    activeCriteria,
    resultsBySector,
    uniqueCriteria,
    isLoading,
    error,
    periods,
    activePeriod,
    setActivePeriod,
  } = useCompetitionData();

  // Estados para status da vigência e última atualização
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  const formatMesAno = (mesAno: string) => {
    if (!mesAno || !mesAno.includes('-')) return 'Período Indisponível';
    const [ano, mes] = mesAno.split('-');
    const date = new Date(Number(ano), Number(mes) - 1);
    return date.toLocaleString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  };
  // ✅ Determinar período selecionado
  const selectedPeriodData = periods.find((p) => p.mesAno === activePeriod);

  // ✅ Determinar se deve mostrar os dados das tabelas
  const shouldShowData = selectedPeriodData
    ? selectedPeriodData.status !== 'PLANEJAMENTO'
    : Object.keys(resultsBySector).length > 0;

  // ✅ SOLUÇÃO INTELIGENTE: Transformar rankingData existente para formato de compartilhamento
  const rankingForShare = useMemo(() => {
    if (!rankingData || rankingData.length === 0) {
      console.log('🔍 Sem dados de ranking disponíveis');
      return [];
    }

    console.log('🔍 rankingData original:', rankingData);

    // Transformar dados do formato EntradaRanking para formato ShareRanking
    const transformed = rankingData.map((item) => ({
      position: item.RANK,
      setor: item.SETOR,
      pontos: item.PONTUACAO,
      isWinner: item.RANK === 1,
    }));

    console.log('🏆 Ranking transformado para compartilhamento:', transformed);
    return transformed;
  }, [rankingData]);

  return (
    <TooltipProvider>
      <Header />
      <main className='w-full flex flex-col gap-8 p-4 sm:p-6'>
        {/* Exibir erro se houver */}
        {error && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <p className='text-red-700 text-center font-semibold'>
              Erro ao carregar dados:{' '}
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
        )}

        {/* Conteúdo principal */}
        {shouldShowData ? (
          <>
            {/* Seção: Desempenho vs Meta */}
            <div className='flex flex-col lg:flex-row gap-6'>
              <div className='flex-1 min-w-0'>
                <section>
                  <div className='flex justify-between items-center mb-3 flex-wrap gap-4'>
                    <div className='flex items-center gap-3'>
                      <h2 className='text-2xl font-semibold'>
                        Premiação 01 a 16 de julho de 2025 - 📈 Desempenho vs
                        Meta
                      </h2>
                      <VigenciaStatusBadge
                        selectedPeriod={selectedPeriodData}
                      />

                      {/* ✅ BOTÃO DE COMPARTILHAR - Usando dados existentes */}
                      {selectedPeriodData?.status === 'FECHADA' &&
                        !isLoading &&
                        rankingForShare.length > 0 && (
                          <ShareRankingButton
                            period={selectedPeriodData}
                            rankingData={rankingForShare}
                          />
                        )}

                      {/* 🔍 DEBUG: Indicador quando deveria aparecer mas não aparece */}
                      {selectedPeriodData?.status === 'FECHADA' &&
                        !isLoading &&
                        rankingForShare.length === 0 && (
                          <div className='text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded'>
                            ⚠️ Período FECHADO mas sem ranking
                          </div>
                        )}

                      {/* Indicador de loading quando necessário */}
                      {selectedPeriodData?.status === 'FECHADA' &&
                        isLoading && (
                          <div className='text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded'>
                            ⏳ Carregando dados...
                          </div>
                        )}
                    </div>

                    <FilterControls
                      periods={periods}
                      activePeriod={activePeriod}
                      onPeriodChange={setActivePeriod}
                    />
                  </div>

                  <PerformanceTable
                    resultsBySector={resultsBySector}
                    uniqueCriteria={uniqueCriteria}
                    activeCriteria={activeCriteria}
                    isLoading={isLoading}
                    error={error}
                  />
                </section>
              </div>
            </div>

            {/* Seção: Desempenho Detalhado por Critério */}
            <section>
              <h2 className='text-2xl font-semibold mb-3'>
                📊 Desempenho Detalhado por Critério
              </h2>
              <PointsTable
                resultsBySector={resultsBySector}
                uniqueCriteria={uniqueCriteria}
                activeCriteria={activeCriteria}
                isLoading={isLoading}
                error={error}
              />
            </section>
          </>
        ) : (
          /* Área com filtros sempre visível + aviso quando necessário */
          <div className='space-y-6'>
            {/* Controles de filtro sempre disponíveis */}
            <div className='flex justify-between items-center flex-wrap gap-4'>
              <div className='flex items-center gap-3'>
                <h2 className='text-2xl font-semibold'>
                  📈 Consultar Resultados
                </h2>
                <VigenciaStatusBadge selectedPeriod={selectedPeriodData} />

                {/* ✅ Botão de compartilhar também na área de consulta */}
                {selectedPeriodData?.status === 'FECHADA' &&
                  !isLoading &&
                  rankingForShare.length > 0 && (
                    <ShareRankingButton
                      period={selectedPeriodData}
                      rankingData={rankingForShare}
                    />
                  )}
              </div>

              <FilterControls
                periods={periods}
                activePeriod={activePeriod}
                onPeriodChange={setActivePeriod}
              />
            </div>

            {/* Verificar se período selecionado está em planejamento */}
            {selectedPeriodData &&
            selectedPeriodData.status === 'PLANEJAMENTO' ? (
              <div className='relative overflow-hidden bg-gradient-to-br from-yellow-50 via-yellow-25 to-amber-50 rounded-xl border border-yellow-200 shadow-lg'>
                {/* Padrão de fundo decorativo */}
                <div className='absolute inset-0 opacity-5'>
                  <div className='absolute top-4 left-4 w-16 h-16 bg-yellow-400 rounded-full'></div>
                  <div className='absolute top-12 right-8 w-8 h-8 bg-amber-400 rounded-full'></div>
                  <div className='absolute bottom-8 left-1/3 w-12 h-12 bg-yellow-300 rounded-full'></div>
                  <div className='absolute bottom-4 right-1/4 w-6 h-6 bg-amber-300 rounded-full'></div>
                </div>

                <div className='relative text-center py-16 px-8'>
                  <div className='max-w-lg mx-auto space-y-6'>
                    {/* Ícone principal com animação */}
                    <div className='relative inline-flex items-center justify-center'>
                      <div className='absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-20'></div>
                      <div className='relative w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg'>
                        <div className='text-4xl animate-pulse'>🔧</div>
                      </div>
                    </div>

                    {/* Título principal */}
                    <div className='space-y-2'>
                      <h3 className='text-3xl font-bold bg-gradient-to-r from-yellow-700 via-amber-700 to-yellow-800 bg-clip-text text-transparent'>
                        Período em Planejamento
                      </h3>
                      <div className='w-24 h-1 bg-gradient-to-r from-yellow-400 to-amber-500 mx-auto rounded-full'></div>
                    </div>

                    {/* Descrição principal */}
                    <div className='bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-yellow-200/50 shadow-sm'>
                      <p className='text-lg text-yellow-900 font-medium leading-relaxed'>
                        As metas para{' '}
                        <span className='font-bold text-amber-800'>
                          {formatMesAno(selectedPeriodData.mesAno)}
                        </span>{' '}
                        ainda estão sendo definidas pela equipe de gestão.
                      </p>
                    </div>

                    {/* Call to action */}
                    <div className='bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-4 border border-yellow-300/50'>
                      <p className='text-yellow-800 font-medium flex items-center justify-center gap-2'>
                        <span className='text-lg'>💡</span>
                        Selecione outro período no filtro acima para consultar
                        resultados anteriores
                      </p>
                    </div>

                    {/* Informações adicionais */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-8'>
                      <div className='bg-white/40 rounded-lg p-4 border border-yellow-200/30'>
                        <div className='flex items-center gap-2 text-yellow-700'>
                          <span className='text-xl'>⏰</span>
                          <span className='font-medium'>Status Atual</span>
                        </div>
                        <p className='text-sm text-yellow-600 mt-1'>
                          Metas em definição
                        </p>
                      </div>

                      <div className='bg-white/40 rounded-lg p-4 border border-yellow-200/30'>
                        <div className='flex items-center gap-2 text-yellow-700'>
                          <span className='text-xl'>🎯</span>
                          <span className='font-medium'>Próximo Passo</span>
                        </div>
                        <p className='text-sm text-yellow-600 mt-1'>
                          Aguardar aprovação das metas
                        </p>
                      </div>
                    </div>

                    {/* Timeline indicativa */}
                    <div className='mt-8 bg-white/50 rounded-lg p-4 border border-yellow-200/40'>
                      <h4 className='text-yellow-800 font-semibold mb-3 flex items-center gap-2'>
                        <span>📅</span>
                        Cronograma do Período
                      </h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex items-center gap-3 text-yellow-700'>
                          <div className='w-3 h-3 bg-yellow-400 rounded-full animate-pulse'></div>
                          <span className='font-medium'>Atual:</span>
                          <span>Definição de metas</span>
                        </div>
                        <div className='flex items-center gap-3 text-yellow-600'>
                          <div className='w-3 h-3 bg-yellow-300 rounded-full opacity-50'></div>
                          <span className='font-medium'>Próximo:</span>
                          <span>Início da competição</span>
                        </div>
                        <div className='flex items-center gap-3 text-yellow-600'>
                          <div className='w-3 h-3 bg-yellow-300 rounded-full opacity-30'></div>
                          <span className='font-medium'>Final:</span>
                          <span>Apuração dos resultados</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='bg-gray-50 border border-gray-200 rounded-lg p-6 text-center'>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  📊 Nenhum Resultado Disponível
                </h3>
                <p className='text-gray-600'>
                  Selecione um período com dados disponíveis para visualizar os
                  resultados da competição.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}
