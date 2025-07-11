'use client';

import PerformanceTable from '@/components/competition/PerformanceTable';
import PointsTable from '@/components/competition/PointsTable';
import FilterControls from '@/components/filters/FilterControls';
import Header from '@/components/home/Header';
import { TooltipProvider } from '@/components/ui/tooltip';
import ShareRankingButton from '@/components/vigencia/ShareRankingButton';
import VigenciaStatusBadge from '@/components/vigencia/VigenciaStatusBadge';
import { useCompetitionData } from '@/hooks/useCompetitionData';
import React, { useEffect, useState } from 'react';

// Hook específico para ranking do período
function usePeriodRanking(period: string | null) {
  const [ranking, setRanking] = useState<
    Array<{
      position: number;
      setor: string;
      pontos: number;
      isWinner: boolean;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!period) {
      setRanking([]);
      return;
    }

    const fetchRanking = async () => {
      setIsLoading(true);
      try {
        console.log('🔍 Buscando ranking específico para período:', period);

        const response = await fetch(`/api/ranking?period=${period}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Ranking recebido da API:', data);

        // Converter para formato de compartilhamento
        const rankingForShare = data.map((item: any) => ({
          position: item.RANK,
          setor: item.SETOR,
          pontos: item.PONTUACAO,
          isWinner: item.RANK === 1,
        }));

        console.log('🏆 Ranking formatado:', rankingForShare);
        setRanking(rankingForShare);
      } catch (error) {
        console.error('❌ Erro ao buscar ranking:', error);
        setRanking([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRanking();
  }, [period]);

  return { ranking, isLoading };
}

export default function HomePage() {
  // Hook para buscar dados via useDashboardData que já aplica a lógica correta
  // LÓGICA DE SELEÇÃO AUTOMÁTICA DO PERÍODO PADRÃO:
  // 1. ATIVA (sempre prioridade máxima)
  // 2. PRE_FECHADA (mais recente)
  // 3. FECHADA (mais recente)
  // 4. PLANEJAMENTO (só como última opção)
  const {
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

  // Buscar período atual com informações completas
  // REGRA DE PRIORIDADE PARA SELEÇÃO PADRÃO:
  // 1. ATIVA (sempre prioridade máxima)
  // 2. PRE_FECHADA (mais recente)
  // 3. FECHADA (mais recente)
  // 4. PLANEJAMENTO nunca é selecionado por padrão
  const currentPeriod = React.useMemo(() => {
    if (!periods || periods.length === 0) return null;

    // 1º: Procurar período ATIVO (sempre prioridade)
    const active = periods.find((p) => p.status === 'ATIVA');
    if (active) return active;

    // 2º: Procurar períodos PRE_FECHADA (mais recente)
    const preClosed = periods
      .filter((p) => p.status === 'PRE_FECHADA')
      .sort(
        (a, b) =>
          new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
      )[0];
    if (preClosed) return preClosed;

    // 3º: Procurar períodos FECHADA (mais recente)
    const closed = periods
      .filter((p) => p.status === 'FECHADA')
      .sort(
        (a, b) =>
          new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
      )[0];
    if (closed) return closed;

    // 4º: PLANEJAMENTO como última opção (só se não houver nada)
    const planning = periods.find((p) => p.status === 'PLANEJAMENTO');
    return planning || null;
  }, [periods]);

  // Função para formatar o período (Ex: "junho de 2025")
  const formatMesAno = (mesAno: string) => {
    if (!mesAno || !mesAno.includes('-')) return 'Período Indisponível';
    const [ano, mes] = mesAno.split('-');
    const date = new Date(Number(ano), Number(mes) - 1);
    return date.toLocaleString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatFullTimestamp = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleString('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  };

  // Buscar status do sistema e última atualização
  useEffect(() => {
    async function fetchSystemStatus() {
      console.log('[LOG] Iniciando fetch do status do sistema...');
      setIsStatusLoading(true);

      try {
        const response = await fetch('/api/automation/status');
        console.log('[LOG] Resposta da API recebida. Status:', response.status);

        if (!response.ok) {
          throw new Error(`Erro de rede! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('[LOG] Dados da API (após parse JSON):', result);

        if (result.success && result.data && result.data.lastUpdate) {
          console.log(
            '[LOG] Campo "lastUpdate" encontrado:',
            result.data.lastUpdate
          );
          setLastUpdateTime(new Date(result.data.lastUpdate));
        } else {
          console.warn(
            '[LOG] Condição para extrair a data falhou. Verificando os campos:',
            {
              success: result.success,
              dataExists: !!result.data,
              lastUpdateExists: result.data ? !!result.data.lastUpdate : false,
            }
          );
          setLastUpdateTime(null);
        }
      } catch (error) {
        console.error(
          '[LOG] Erro CRÍTICO no fetch do status do sistema:',
          error
        );
        setLastUpdateTime(null);
      } finally {
        setIsStatusLoading(false);
      }
    }

    fetchSystemStatus();
  }, []);

  // Determinar se deve mostrar os dados das tabelas
  // Mostra dados se:
  // 1. Tem vigência selecionada no filtro E não está em PLANEJAMENTO, OU
  // 2. Não há vigência selecionada mas tem dados disponíveis
  const selectedPeriodData = periods.find((p) => p.mesAno === activePeriod);
  const shouldShowData = selectedPeriodData
    ? selectedPeriodData.status !== 'PLANEJAMENTO'
    : Object.keys(resultsBySector).length > 0;

  // Hook para buscar ranking específico do período selecionado
  const { ranking: rankingForShare, isLoading: isLoadingRanking } =
    usePeriodRanking(
      selectedPeriodData?.status === 'FECHADA' ? activePeriod : null
    );

  console.log('🎯 Período selecionado:', selectedPeriodData);
  console.log('🏆 Ranking para compartilhamento:', rankingForShare);

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
                        📈 Desempenho vs Meta
                      </h2>
                      <VigenciaStatusBadge
                        selectedPeriod={selectedPeriodData}
                      />
                      {/* Botão de compartilhar para períodos FECHADA */}
                      {selectedPeriodData &&
                        selectedPeriodData.status === 'FECHADA' &&
                        rankingForShare.length > 0 &&
                        !isLoadingRanking && (
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
                {/* Botão de compartilhar para períodos FECHADA */}
                {selectedPeriodData &&
                  selectedPeriodData.status === 'FECHADA' &&
                  rankingForShare.length > 0 &&
                  !isLoadingRanking && (
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
              /* Aviso específico para período em planejamento - MELHORADO */
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
              /* Estado geral sem dados - MELHORADO */
              <div className='relative overflow-hidden bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm'>
                <div className='text-center py-12 px-8'>
                  <div className='max-w-md mx-auto space-y-6'>
                    {/* Ícone principal */}
                    <div className='w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto shadow-sm'>
                      <div className='text-3xl'>📊</div>
                    </div>

                    <div className='space-y-2'>
                      <h3 className='text-xl font-bold text-gray-900'>
                        Nenhum Dado Disponível
                      </h3>
                      <div className='w-16 h-0.5 bg-gray-300 mx-auto rounded-full'></div>
                    </div>

                    <div className='bg-white/60 rounded-lg p-4 border border-gray-200/50'>
                      <p className='text-gray-600'>
                        {activePeriod
                          ? `Não há dados disponíveis para ${formatMesAno(activePeriod)}.`
                          : 'Selecione um período no filtro acima para visualizar os resultados.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}
