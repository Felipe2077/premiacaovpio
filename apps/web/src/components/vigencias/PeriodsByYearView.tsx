// apps/web/src/components/vigencias/PeriodsByYearView.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeriodName } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PeriodCard } from './PeriodCard';

interface CompetitionPeriod {
  id: number;
  mesAno: string;
  dataInicio: string;
  dataFim: string;
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  setorVencedorId?: number;
  oficializadaPorUserId?: number;
  oficializadaEm?: string;
}

interface PeriodsByYearViewProps {
  periods: CompetitionPeriod[];
  onOfficialize?: (periodId: number) => void;
  onAnalyze?: (periodId: number) => void;
  onStart?: (periodId: number) => void;
  loading?: boolean;
}

// Função para gerar os 12 meses do ano como placeholders
const generateYearMonths = (
  year: number
): Array<{ month: number; mesAno: string }> => {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    mesAno: `${year}-${String(index + 1).padStart(2, '0')}`,
  }));
};

// Função para extrair ano de um período
const getYearFromPeriod = (mesAno: string): number => {
  const year = parseInt(mesAno.split('-')[0] || '0', 10);
  return isNaN(year) ? new Date().getFullYear() : year;
};

export function PeriodsByYearView({
  periods,
  onOfficialize,
  onAnalyze,
  onStart,
  loading = false,
}: PeriodsByYearViewProps) {
  // Organizar períodos por ano
  const periodsByYear = useMemo(() => {
    const grouped: Record<number, CompetitionPeriod[]> = {};

    periods.forEach((period) => {
      const year = getYearFromPeriod(period.mesAno);
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(period);
    });

    return grouped;
  }, [periods]);

  // Lista de anos disponíveis (ordenada decrescente - mais recente primeiro)
  const availableYears = useMemo(() => {
    const years = Object.keys(periodsByYear)
      .map(Number)
      .sort((a, b) => b - a);

    // Se não há períodos, mostrar o ano atual
    if (years.length === 0) {
      years.push(new Date().getFullYear());
    }

    return years;
  }, [periodsByYear]);

  // Estado do ano atual selecionado
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const currentYear =
    availableYears[currentYearIndex] || new Date().getFullYear();

  // Períodos do ano atual + placeholders para meses sem período
  const currentYearPeriods = useMemo(() => {
    const existingPeriods = periodsByYear[currentYear] || [];
    const yearMonths = generateYearMonths(currentYear);

    return yearMonths.map(({ month, mesAno }) => {
      const existingPeriod = existingPeriods.find((p) => p.mesAno === mesAno);
      return (
        existingPeriod || {
          id: -month, // ID negativo para placeholders
          mesAno,
          isPlaceholder: true,
        }
      );
    });
  }, [currentYear, periodsByYear]);

  const handlePreviousYear = () => {
    if (currentYearIndex < availableYears.length - 1) {
      setCurrentYearIndex(currentYearIndex + 1);
    }
  };

  const handleNextYear = () => {
    if (currentYearIndex > 0) {
      setCurrentYearIndex(currentYearIndex - 1);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header com navegação de ano */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Calendar className='h-6 w-6 text-blue-600' />
          <div>
            <h2 className='text-2xl font-bold'>{currentYear}</h2>
            <p className='text-sm text-muted-foreground'>
              {
                currentYearPeriods.filter((p) => !(p as any).isPlaceholder)
                  .length
              }{' '}
              de 12 períodos criados
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePreviousYear}
            disabled={currentYearIndex >= availableYears.length - 1}
            className='gap-2'
          >
            <ChevronLeft className='h-4 w-4' />
            {availableYears[currentYearIndex + 1] || 'Anterior'}
          </Button>

          <div className='text-sm text-muted-foreground px-3'>
            {currentYearIndex + 1} de {availableYears.length}
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={handleNextYear}
            disabled={currentYearIndex <= 0}
            className='gap-2'
          >
            {availableYears[currentYearIndex - 1] || 'Próximo'}
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Grid de períodos (12 meses) */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {currentYearPeriods.map((period: any) => {
          if (period.isPlaceholder) {
            // Card placeholder para meses sem período
            return (
              <Card
                key={period.id}
                className='border-dashed border-2 border-gray-200 bg-gray-50/50'
              >
                <CardHeader className='pb-3'>
                  <CardTitle className='text-lg font-semibold text-gray-400'>
                    {formatPeriodName(period.mesAno)}
                  </CardTitle>
                </CardHeader>
                <CardContent className='flex flex-col items-center justify-center py-8'>
                  <Calendar className='h-8 w-8 text-gray-300 mb-2' />
                  <p className='text-sm text-gray-400 text-center'>
                    Período não criado
                  </p>
                </CardContent>
              </Card>
            );
          }

          // Card normal para períodos existentes
          return (
            <PeriodCard
              key={period.id}
              period={period}
              onOfficialize={
                onOfficialize && period.status === 'PRE_FECHADA'
                  ? onOfficialize
                  : undefined
              }
              onAnalyze={onAnalyze}
              onStart={
                onStart && period.status === 'PLANEJAMENTO'
                  ? onStart
                  : undefined
              }
              loading={loading}
            />
          );
        })}
      </div>

      {/* Estatísticas do ano */}
      <Card className='bg-blue-50 border-blue-200'>
        <CardContent className='pt-6'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-center'>
            <div>
              <div className='text-2xl font-bold text-blue-600'>
                {
                  currentYearPeriods.filter(
                    (p) =>
                      !(p as any).isPlaceholder &&
                      (p as any).status === 'FECHADA'
                  ).length
                }
              </div>
              <div className='text-sm text-blue-700'>Finalizados</div>
            </div>
            <div>
              <div className='text-2xl font-bold text-orange-600'>
                {
                  currentYearPeriods.filter(
                    (p) =>
                      !(p as any).isPlaceholder &&
                      (p as any).status === 'PRE_FECHADA'
                  ).length
                }
              </div>
              <div className='text-sm text-orange-700'>Aguardando</div>
            </div>
            <div>
              <div className='text-2xl font-bold text-green-600'>
                {
                  currentYearPeriods.filter(
                    (p) =>
                      !(p as any).isPlaceholder && (p as any).status === 'ATIVA'
                  ).length
                }
              </div>
              <div className='text-sm text-green-700'>Ativos</div>
            </div>
            <div>
              <div className='text-2xl font-bold text-gray-600'>
                {
                  currentYearPeriods.filter(
                    (p) =>
                      !(p as any).isPlaceholder &&
                      (p as any).status === 'PLANEJAMENTO'
                  ).length
                }
              </div>
              <div className='text-sm text-gray-700'>Planejamento</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
