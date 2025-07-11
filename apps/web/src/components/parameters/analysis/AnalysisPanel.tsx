// apps/web/src/components/parameters/analysis/AnalysisPanel.tsx - VERSÃO FINAL LIMPA
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CompetitionPeriod,
  Criterion,
  EntradaResultadoDetalhado,
  Sector,
} from '@/hooks/useParametersData';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ComparisonDataTable } from './ComparisonDataTable';
import { HistoricalDataTable } from './HistoricalDataTable';
import { ProjectionDataTable } from './ProjectionDataTable';

interface AnalysisPanelProps {
  allCriteria: Criterion[];
  sectors: Sector[];
  period: CompetitionPeriod | null;
  resultsBySector: any;
}

// FUNÇÃO AUXILIAR PARA FORMATAR DATAS
const formatPeriod = (periodString: string | null): string => {
  if (!periodString) return '';
  const [year, month] = periodString.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  const formatted = date.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const AnalysisPanel = ({
  allCriteria,
  sectors,
  period,
  resultsBySector,
}: AnalysisPanelProps) => {
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(
    null
  );
  const [historyMonths, setHistoryMonths] = useState<number>(6);
  const [projectionStartDate, setProjectionStartDate] = useState<string>('');
  const [projectionEndDate, setProjectionEndDate] = useState<string>('');
  const [projectionApiData, setProjectionApiData] = useState<any[]>([]);
  const [isProjectionLoading, setIsProjectionLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [historicalResults, setHistoricalResults] = useState<
    EntradaResultadoDetalhado[]
  >([]);
  const [previousMonthResults, setPreviousMonthResults] = useState<
    EntradaResultadoDetalhado[]
  >([]);

  // ✅ CORREÇÃO: useRef para evitar dependência circular
  const isAutoCalculatingRef = useRef(false);

  const selectedCriterion = useMemo(
    () => allCriteria.find((c) => c.id === Number(selectedCriterionId)) || null,
    [allCriteria, selectedCriterionId]
  );

  const previousMonthPeriod = useMemo(() => {
    if (!period) return null;
    let currentDate = new Date(`${period.mesAno}-01T12:00:00Z`);
    currentDate.setMonth(currentDate.getMonth() - 1);
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }, [period]);

  const formattedCurrentPeriod = formatPeriod(period?.mesAno || null);
  const formattedPreviousPeriod = formatPeriod(previousMonthPeriod);

  const historyPeriodLabel = useMemo(() => {
    return `Últimos ${historyMonths} meses`;
  }, [historyMonths]);

  const historicalPeriods = useMemo(() => {
    if (!period) return [];
    const periodsArray: string[] = [];
    let currentDate = new Date(`${period.mesAno}-01T12:00:00Z`);
    for (let i = 0; i < historyMonths; i++) {
      if (i === 0) {
        currentDate.setMonth(currentDate.getMonth());
      }
      currentDate.setMonth(currentDate.getMonth() - 1);
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      periodsArray.push(`${year}-${month}`);
    }
    return periodsArray.reverse();
  }, [period, historyMonths]);

  // ✅ CORREÇÃO 1: Removido isProjectionLoading das dependências
  const handleCalculateProjection = useCallback(async () => {
    if (
      !selectedCriterionId ||
      !projectionStartDate ||
      !projectionEndDate ||
      !period
    ) {
      // Só exibe toast se for chamada manual (não automática)
      if (!isAutoCalculatingRef.current) {
        toast.error(
          'Por favor, selecione um critério e um intervalo de datas para a projeção.'
        );
      }
      return;
    }

    setIsProjectionLoading(true);
    try {
      const apiUrl = `/api/parameters/projection?criterionId=${selectedCriterionId}&startDate=${projectionStartDate}&endDate=${projectionEndDate}&targetMonth=${period.mesAno}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Falha ao buscar dados de projeção');
      }
      const data = await response.json();
      setProjectionApiData(data);
    } catch (error) {
      toast.error('Erro ao calcular projeção.');
      console.error(error);
    } finally {
      setIsProjectionLoading(false);
    }
  }, [selectedCriterionId, projectionStartDate, projectionEndDate, period]);

  useEffect(() => {
    setProjectionApiData([]); // Limpa os dados da projeção ao mudar o critério
    if (selectedCriterionId && previousMonthPeriod) {
      const fetchData = async () => {
        setIsLoading(true);
        setHistoricalResults([]);
        setPreviousMonthResults([]);

        try {
          const [historyPromise, previousMonthPromise] = [
            Promise.all(
              historicalPeriods.map((p) =>
                fetch(`/api/results/by-period?period=${p}`).then((res) =>
                  res.json()
                )
              )
            ),
            fetch(`/api/results/by-period?period=${previousMonthPeriod}`).then(
              (res) => res.json()
            ),
          ];
          const [historyData, previousData] = await Promise.all([
            historyPromise,
            previousMonthPromise,
          ]);
          const flatHistoricalData = historyData.flat();
          const filteredHistorical = flatHistoricalData.filter(
            (r: EntradaResultadoDetalhado) =>
              r.criterioId === Number(selectedCriterionId)
          );
          setHistoricalResults(filteredHistorical);
          setPreviousMonthResults(previousData);
        } catch (error: any) {
          console.error('Erro ao buscar dados de análise:', error);
          toast.error(
            error.message || 'Não foi possível carregar os dados de análise.'
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [selectedCriterionId, historicalPeriods, previousMonthPeriod]);

  // ✅ CORREÇÃO 2: useEffect separado com controle de auto-cálculo
  useEffect(() => {
    if (
      selectedCriterionId &&
      projectionStartDate &&
      projectionEndDate &&
      period
    ) {
      isAutoCalculatingRef.current = true;
      handleCalculateProjection().finally(() => {
        isAutoCalculatingRef.current = false;
      });
    }
  }, [
    selectedCriterionId,
    projectionStartDate,
    projectionEndDate,
    period,
    handleCalculateProjection,
  ]);

  const historicalDataFormatted = useMemo(() => {
    if (!historicalResults.length || !sectors.length) return [];
    return sectors.map((sector) => {
      const monthlyData: { [period: string]: number | null } = {};
      let total = 0;
      let count = 0;
      historicalPeriods.forEach((p) => {
        const result = historicalResults.find(
          (r) => r.periodo === p && r.setorId === sector.id
        );
        monthlyData[p] = result?.valorRealizado ?? null;
        if (result?.valorRealizado != null) {
          total += result.valorRealizado;
          count++;
        }
      });
      return {
        sectorName: sector.nome,
        monthlyData,
        average: count > 0 ? total / count : null,
      };
    });
  }, [historicalResults, sectors, historicalPeriods]);

  const currentPeriodFilteredData = useMemo(() => {
    if (
      !selectedCriterion ||
      !resultsBySector ||
      Object.keys(resultsBySector).length === 0
    )
      return [];
    return Object.values(resultsBySector)
      .map(
        (sectorData: any) => sectorData.criterios[String(selectedCriterion.id)]
      )
      .filter(Boolean) as EntradaResultadoDetalhado[];
  }, [selectedCriterion, resultsBySector]);

  const previousMonthFilteredData = useMemo(() => {
    if (!selectedCriterion || !previousMonthResults.length) return [];
    return previousMonthResults.filter(
      (r) => r.criterioId === selectedCriterion.id
    );
  }, [selectedCriterion, previousMonthResults]);

  const hasCurrentPeriodProjectionData = useMemo(
    () => currentPeriodFilteredData.some((d) => d.valorRealizado !== null),
    [currentPeriodFilteredData]
  );

  return (
    <Card className='border-amber-200 dark:border-amber-900'>
      <CardHeader>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <CardTitle>Painel de Análise de Critérios</CardTitle>
          <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
            <Select
              value={String(historyMonths)}
              onValueChange={(value) => setHistoryMonths(Number(value))}
            >
              <SelectTrigger className='w-full sm:w-[180px]'>
                <SelectValue placeholder='Período do Histórico' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='2'>Últimos 2 meses</SelectItem>
                <SelectItem value='3'>Últimos 3 meses</SelectItem>
                <SelectItem value='6'>Últimos 6 meses</SelectItem>
                <SelectItem value='12'>Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={setSelectedCriterionId}
              value={selectedCriterionId ?? undefined}
            >
              <SelectTrigger className='w-full sm:w-72'>
                <SelectValue placeholder='Selecione um critério para analisar...' />
              </SelectTrigger>
              <SelectContent>
                {allCriteria.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-6'>
        {!selectedCriterion || !period ? (
          <div className='text-center text-muted-foreground py-16'>
            Selecione um critério acima para visualizar os dados de apoio.
          </div>
        ) : (
          <div className='space-y-6 animate-in fade-in-25'>
            {period.status !== 'FECHADA' && (
              <Card className='border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'>
                <CardHeader className='pb-4'>
                  <div className='flex items-center gap-2'>
                    <div className='h-2 w-2 bg-blue-500 rounded-full' />
                    <CardTitle className='text-lg'>
                      Projeção de{' '}
                      <span className='text-amber-600'>
                        {selectedCriterion.nome}
                      </span>{' '}
                      para {formattedCurrentPeriod}
                    </CardTitle>
                  </div>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Selecione um período de amostra para calcular a projeção
                    baseada em dados históricos
                  </p>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>
                        📅 Data de Início da Amostra
                      </label>
                      <Input
                        type='date'
                        value={projectionStartDate}
                        onChange={(e) => setProjectionStartDate(e.target.value)}
                        className='w-full'
                        placeholder='Selecione a data inicial'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>
                        📅 Data de Fim da Amostra
                      </label>
                      <Input
                        type='date'
                        value={projectionEndDate}
                        onChange={(e) => setProjectionEndDate(e.target.value)}
                        className='w-full'
                        placeholder='Selecione a data final'
                      />
                    </div>
                  </div>

                  {projectionStartDate && projectionEndDate ? (
                    <div className='mt-6 pt-4 border-t border-blue-200 dark:border-blue-800'>
                      <div className='[&_table]:text-base [&_td]:text-base [&_th]:text-base'>
                        <ProjectionDataTable
                          projectionData={projectionApiData}
                          period={period}
                          criterionName={selectedCriterion.nome}
                          formattedPeriod={formattedCurrentPeriod}
                          sectors={sectors}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className='mt-6 pt-4 border-t border-blue-200 dark:border-blue-800'>
                      <div className='text-center py-8 text-muted-foreground'>
                        <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
                          <span className='text-2xl'>⏳</span>
                        </div>
                        <h4 className='font-medium mb-2'>
                          Selecione o Período de Amostra
                        </h4>
                        <p className='text-sm'>
                          Escolha as datas de início e fim para calcular a
                          projeção baseada em dados históricos
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className='border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20'>
              <CardHeader className='pb-4'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 bg-orange-500 rounded-full' />
                  <CardTitle className='text-lg'>
                    Histórico de Realizado:{' '}
                    <span className='text-amber-600'>
                      {selectedCriterion.nome}
                    </span>{' '}
                    - {historyPeriodLabel}
                  </CardTitle>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  Evolução dos valores realizados por filial nos últimos
                  períodos
                </p>
              </CardHeader>
              <CardContent>
                <div className='[&_table]:text-base [&_td]:text-base [&_th]:text-base'>
                  <HistoricalDataTable
                    data={historicalDataFormatted}
                    periods={historicalPeriods}
                    isLoading={isLoading}
                    criterionName={selectedCriterion.nome}
                    decimalPlaces={selectedCriterion.casasDecimaisPadrao ?? 0}
                    periodLabel={historyPeriodLabel}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className='border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20'>
              <CardHeader className='pb-4'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 bg-green-500 rounded-full' />
                  <CardTitle className='text-lg'>
                    Meta vs. Realizado:{' '}
                    <span className='text-amber-600'>
                      {selectedCriterion.nome}
                    </span>{' '}
                    - {formattedPreviousPeriod}
                  </CardTitle>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  Comparação entre metas definidas e valores realizados no
                  período anterior
                </p>
              </CardHeader>
              <CardContent>
                <div className='[&_table]:text-base [&_td]:text-base [&_th]:text-base'>
                  <ComparisonDataTable
                    data={previousMonthFilteredData}
                    period={previousMonthPeriod}
                    criterionName={selectedCriterion.nome}
                    formattedPeriod={formattedPreviousPeriod}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
