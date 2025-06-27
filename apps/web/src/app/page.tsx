// Arquivo: src/app/page.tsx (ATUALIZADO)

'use client';

import FilterControls from '@/components/filters/FilterControls';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CalendarDays } from 'lucide-react'; // Ícone para a data

import PerformanceTable from '@/components/competition/PerformanceTable';
import PointsTable from '@/components/competition/PointsTable';
import Header from '@/components/home/Header';
import { Skeleton } from '@/components/ui/skeleton'; // Skeleton para o carregamento
import { useCompetitionData } from '@/hooks/useCompetitionData';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const {
    // rankingData, // Esta variável não estava sendo usada, pode ser mantida ou removida
    activeCriteria,
    resultsBySector,
    uniqueCriteria,
    isLoading,
    error,
    periods,
    activePeriod,
    setActivePeriod,
  } = useCompetitionData();
  // ---  ESTADOS PARA DATA E CARREGAMENTO DA ATUALIZAÇÃO ---
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
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
  // --- EFEITO PARA BUSCAR A DATA REAL DO ENDPOINT DE STATUS ---
  useEffect(() => {
    async function fetchSystemStatus() {
      console.log('[LOG] Iniciando fetch do status do sistema...');
      setIsStatusLoading(true);

      try {
        // --- MODIFICAÇÃO PRINCIPAL AQUI: URL DA API CORRIGIDA ---
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

  // A função getDataAtual foi removida pois não estava sendo utilizada.

  return (
    <TooltipProvider>
      <Header />
      <main className='w-full flex flex-col gap-8 p-4 sm:p-6'>
        <section className='flex flex-wrap justify-between items-start gap-y-4 border-b border-gray-200 pb-6'>
          <div>
            <h1 className='text-3xl font-bold text-gray-800'>
              Sistema de Premiação
            </h1>
            <p className='text-lg text-gray-600'>Viação Pioneira</p>
          </div>

          <div className='text-right'>
            <div className='flex items-center gap-3 bg-gray-100 p-3 rounded-lg border w-fit ml-auto'>
              <CalendarDays className='h-6 w-6 text-gray-500' />
              <div>
                <p className='text-sm font-semibold text-gray-700 text-left'>
                  Período da Competição
                </p>
                {isLoading && !activePeriod ? (
                  <Skeleton className='h-6 w-32 mt-1' />
                ) : (
                  <p className='text-lg font-bold text-blue-600 capitalize text-left'>
                    {activePeriod
                      ? formatMesAno(activePeriod)
                      : 'Carregando...'}
                  </p>
                )}
              </div>
            </div>
            {/* --- MODIFICAÇÃO 3: UI ATUALIZADA PARA REFLETIR O CARREGAMENTO E O RESULTADO DA API ---
            <div className='mt-2 text-sm text-gray-500 h-5'>
              {isStatusLoading ? (
                <span className='italic'>Verificando atualização...</span>
              ) : lastUpdateTime ? (
                <span>
                  Última atualização:{' '}
                  <strong className='font-semibold text-gray-700'>
                    {formatFullTimestamp(lastUpdateTime)}
                  </strong>
                </span>
              ) : (
                <span className='text-xs text-red-500'>
                  Não foi possível obter a data de atualização.
                </span>
              )}
            </div> */}
          </div>
        </section>

        {error && (
          <p className='text-red-500 text-center font-semibold w-full'>
            Erro ao carregar dados:
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        <div className='flex flex-col lg:flex-row gap-6'>
          <div className='flex-1 min-w-0'>
            <section>
              <div className='flex justify-between items-center mb-3 flex-wrap gap-4'>
                <h2 className='text-2xl font-semibold'>
                  📈 Desempenho vs Meta
                </h2>
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
      </main>
    </TooltipProvider>
  );
}
