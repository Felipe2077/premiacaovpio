// Arquivo: src/app/page.tsx (ATUALIZADO)

'use client';

import FilterControls from '@/components/filters/FilterControls';
import { TooltipProvider } from '@/components/ui/tooltip';

import PerformanceTable from '@/components/competition/PerformanceTable';
import PointsTable from '@/components/competition/PointsTable';
import Header from '@/components/home/Header';
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
