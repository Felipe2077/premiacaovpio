// apps/web/src/components/parameters/analysis/AnalysisPanel.tsx - VERSÃO FINAL COMPLETA E CORRIGIDA
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useEffect, useMemo, useState } from 'react';
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
  // Adiciona T12:00:00Z para tratar como UTC e evitar problemas de fuso horário
  const date = new Date(`${year}-${month}-01T12:00:00Z`);
  const formatted = date.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
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

  const [isLoading, setIsLoading] = useState(false);
  const [historicalResults, setHistoricalResults] = useState<
    EntradaResultadoDetalhado[]
  >([]);
  const [previousMonthResults, setPreviousMonthResults] = useState<
    EntradaResultadoDetalhado[]
  >([]);

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

  useEffect(() => {
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

  return (
    <Card className='border-amber-200 dark:border-amber-900'>
      <CardHeader className=''>
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
          <div className='space-y-8 animate-in fade-in-25'>
            <HistoricalDataTable
              data={historicalDataFormatted}
              periods={historicalPeriods}
              isLoading={isLoading}
              criterionName={selectedCriterion.nome}
              decimalPlaces={selectedCriterion.casasDecimaisPadrao ?? 0}
            />

            {period.status !== 'FECHADA' && (
              <ProjectionDataTable
                currentPeriodData={currentPeriodFilteredData}
                period={period}
                criterionName={selectedCriterion.nome}
                formattedPeriod={formattedCurrentPeriod}
              />
            )}

            <ComparisonDataTable
              data={previousMonthFilteredData}
              period={previousMonthPeriod}
              criterionName={selectedCriterion.nome}
              formattedPeriod={formattedPreviousPeriod}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
