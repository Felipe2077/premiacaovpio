// src/components/parameters/HistoryModal.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart3,
  Download,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface HistoryEntry {
  id: number;
  periodo: string;
  valorMeta: number | null;
  valorRealizado: number | null;
  percentualAtingimento: number | null;
  rank: number | null;
  pontos: number | null;
  status: 'ATIVA' | 'EXPIRADA' | 'FUTURA';
  criadoPor: string;
  justificativa: string;
  dataCriacao: string;
  dataInicioEfetivo: string;
  dataFimEfetivo: string | null;
  versao: number;
  metadata?: {
    calculationMethod?: string;
    adjustmentPercentage?: number;
    baseValue?: number;
  };
}

interface HistorySummary {
  avgAttainment: number;
  bestPeriod: { period: string; attainment: number; rank?: number };
  worstPeriod: { period: string; attainment: number; rank?: number };
  totalVersions: number;
  timeSpan: string;
  currentStreak?: { type: 'positive' | 'negative'; count: number };
}

interface HistoryData {
  summary: HistorySummary;
  timeline: HistoryEntry[];
  criterion: {
    id: number;
    nome: string;
    unidade_medida: string;
    sentido_melhor: string;
  };
  sector: {
    id: number;
    nome: string;
  };
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  criterionId: number;
  sectorId: number;
  criterionName: string;
  sectorName: string;
}

const useHistoryData = ({
  criterionId,
  sectorId,
  enabled,
}: {
  criterionId: number;
  sectorId: number;
  enabled: boolean;
}) => {
  return useQuery<HistoryData>({
    queryKey: ['history', criterionId, sectorId],
    queryFn: async () => {
      const response = await fetch(
        `/api/history/criterion-sector?criterionId=${criterionId}&sectorId=${sectorId}&limit=24`
      );

      if (!response.ok) {
        throw new Error('Falha ao carregar histórico');
      }

      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });
};

const LoadingState = () => (
  <div className='space-y-6'>
    {/* Cards de resumo */}
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='space-y-2'>
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-8 w-16' />
              </div>
              <Skeleton className='h-10 w-10 rounded-lg' />
            </div>
            <Skeleton className='h-6 w-24 mt-2' />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Tabela */}
    <div className='border rounded-lg'>
      <div className='p-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className='flex gap-4 py-3'>
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className='h-4 flex-1' />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <Card>
    <CardContent className='p-8'>
      <div className='flex flex-col items-center text-center space-y-4'>
        <div className='p-3 bg-red-100 rounded-full'>
          <AlertCircle className='h-8 w-8 text-red-600' />
        </div>

        <div className='space-y-2'>
          <h3 className='text-lg font-semibold'>Erro ao carregar histórico</h3>
          <p className='text-muted-foreground'>
            Não foi possível carregar os dados históricos.
          </p>
        </div>

        <Button onClick={onRetry} variant='outline'>
          <RefreshCw className='h-4 w-4 mr-2' />
          Tentar novamente
        </Button>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({
  criterionName,
  sectorName,
}: {
  criterionName: string;
  sectorName: string;
}) => (
  <Card>
    <CardContent className='p-8'>
      <div className='flex flex-col items-center text-center space-y-4'>
        <div className='p-4 bg-gray-100 rounded-full'>
          <BarChart3 className='h-12 w-12 text-gray-400' />
        </div>

        <div className='space-y-2'>
          <h3 className='text-lg font-semibold'>Nenhum histórico encontrado</h3>
          <p className='text-muted-foreground max-w-md'>
            Ainda não há histórico de metas para{' '}
            <strong>{criterionName}</strong> no setor{' '}
            <strong>{sectorName}</strong>.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const HistorySummaryCards = ({ summary }: { summary: HistorySummary }) => {
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getAttainmentColor = (attainment: number) => {
    if (attainment >= 1) return 'bg-green-50 text-green-700 border-green-200';
    if (attainment >= 0.8)
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getTrendIcon = () => {
    if (!summary.currentStreak)
      return <Minus className='h-4 w-4 text-muted-foreground' />;

    return summary.currentStreak.type === 'positive' ? (
      <TrendingUp className='h-4 w-4 text-green-600' />
    ) : (
      <TrendingDown className='h-4 w-4 text-red-600' />
    );
  };

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-medium text-muted-foreground'>
                Média Geral
              </p>
              <p className='text-2xl font-bold'>
                {formatPercentage(summary.avgAttainment)}
              </p>
            </div>
            <div className='p-2 bg-blue-100 rounded-lg ml-3 shrink-0'>
              <BarChart3 className='h-5 w-5 text-blue-600' />
            </div>
          </div>
          <div className='mt-2'>
            <Badge
              variant='outline'
              className={`${getAttainmentColor(summary.avgAttainment)} text-xs`}
            >
              {summary.avgAttainment >= 1
                ? 'Acima da Meta'
                : summary.avgAttainment >= 0.8
                  ? 'Próximo da Meta'
                  : 'Abaixo da Meta'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-medium text-muted-foreground'>
                Melhor Período
              </p>
              <p className='text-lg font-semibold truncate'>
                {summary.bestPeriod.period}
              </p>
              <p className='text-sm text-green-600'>
                {formatPercentage(summary.bestPeriod.attainment)}
              </p>
            </div>
            <div className='p-2 bg-green-100 rounded-lg ml-3 shrink-0'>
              <TrendingUp className='h-5 w-5 text-green-600' />
            </div>
          </div>
          {summary.bestPeriod.rank && (
            <div className='mt-2'>
              <Badge
                variant='outline'
                className='bg-green-50 text-green-700 border-green-200 text-xs'
              >
                {summary.bestPeriod.rank}º lugar
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-medium text-muted-foreground'>
                Pior Período
              </p>
              <p className='text-lg font-semibold truncate'>
                {summary.worstPeriod.period}
              </p>
              <p className='text-sm text-red-600'>
                {formatPercentage(summary.worstPeriod.attainment)}
              </p>
            </div>
            <div className='p-2 bg-red-100 rounded-lg ml-3 shrink-0'>
              <TrendingDown className='h-5 w-5 text-red-600' />
            </div>
          </div>
          {summary.worstPeriod.rank && (
            <div className='mt-2'>
              <Badge
                variant='outline'
                className='bg-red-50 text-red-700 border-red-200 text-xs'
              >
                {summary.worstPeriod.rank}º lugar
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-medium text-muted-foreground'>
                Tendência
              </p>
              {summary.currentStreak ? (
                <>
                  <p className='text-2xl font-bold'>
                    {summary.currentStreak.count}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {summary.currentStreak.type === 'positive'
                      ? 'meses melhorando'
                      : 'meses piorando'}
                  </p>
                </>
              ) : (
                <p className='text-lg text-muted-foreground'>Estável</p>
              )}
            </div>
            <div className='p-2 bg-purple-100 rounded-lg ml-3 shrink-0'>
              {getTrendIcon()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const HistoryTable = ({
  timeline,
  criterion,
}: {
  timeline: HistoryEntry[];
  criterion: any;
}) => {
  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return '-';
    return `${value.toLocaleString('pt-BR')} ${unit}`;
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ATIVA: 'bg-green-100 text-green-800 border-green-300',
      EXPIRADA: 'bg-gray-100 text-gray-600 border-gray-300',
      FUTURA: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    return (
      <Badge
        variant='outline'
        className={`${colors[status as keyof typeof colors]} text-xs`}
      >
        {status}
      </Badge>
    );
  };

  const getRowClassName = (entry: HistoryEntry) => {
    let baseClass = 'hover:bg-muted/50';

    if (entry.status === 'ATIVA') {
      baseClass += ' bg-blue-50/50 border-l-4 border-l-blue-500';
    } else if (entry.status === 'FUTURA') {
      baseClass += ' opacity-60';
    }

    return baseClass;
  };

  return (
    <div className='border rounded-lg overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full table-fixed'>
          <thead className='bg-muted/30'>
            <tr>
              <th className='text-left p-3 font-medium w-[8%]'>Período</th>
              <th className='text-left p-3 font-medium w-[10%]'>Meta</th>
              <th className='text-left p-3 font-medium w-[10%]'>Realizado</th>
              <th className='text-left p-3 font-medium w-[11%]'>
                % Atingimento
              </th>
              <th className='text-left p-3 font-medium w-[6%]'>Rank</th>
              <th className='text-left p-3 font-medium w-[7%]'>Pontos</th>
              <th className='text-left p-3 font-medium w-[8%]'>Status</th>
              <th className='text-left p-3 font-medium w-[12%]'>Criado Por</th>
              <th className='text-left p-3 font-medium w-[28%]'>
                Justificativa
              </th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((entry) => (
              <tr key={entry.id} className={getRowClassName(entry)}>
                <td className='p-3 font-medium'>
                  <div className='flex flex-col'>
                    <span className='font-semibold'>{entry.periodo}</span>
                    {entry.versao > 1 && (
                      <Badge variant='outline' className='mt-1 text-xs w-fit'>
                        v{entry.versao}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className='p-3 text-sm'>
                  <span className='block'>
                    {formatValue(entry.valorMeta, criterion.unidade_medida)}
                  </span>
                </td>
                <td className='p-3 text-sm'>
                  <span className='block'>
                    {formatValue(
                      entry.valorRealizado,
                      criterion.unidade_medida
                    )}
                  </span>
                </td>
                <td className='p-3'>
                  <span
                    className={`font-medium text-sm ${
                      entry.percentualAtingimento &&
                      entry.percentualAtingimento >= 1
                        ? 'text-green-600'
                        : entry.percentualAtingimento &&
                            entry.percentualAtingimento >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {formatPercentage(entry.percentualAtingimento)}
                  </span>
                </td>
                <td className='p-3 text-sm'>
                  {entry.rank ? `${entry.rank}º` : '-'}
                </td>
                <td className='p-3 text-sm'>
                  {entry.pontos ? entry.pontos.toFixed(1) : '-'}
                </td>
                <td className='p-3'>{getStatusBadge(entry.status)}</td>
                <td className='p-3 text-sm'>
                  <div className='truncate cursor-help' title={entry.criadoPor}>
                    {entry.criadoPor}
                  </div>
                </td>
                <td className='p-3 text-sm'>
                  <div
                    className='cursor-help leading-relaxed'
                    title={entry.justificativa}
                  >
                    {entry.justificativa}
                  </div>
                </td>
              </tr>
            ))}

            {timeline.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className='h-24 text-center text-muted-foreground'
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const HistoryModal = ({
  isOpen,
  onClose,
  criterionId,
  sectorId,
  criterionName,
  sectorName,
}: HistoryModalProps) => {
  const { data, isLoading, error, refetch } = useHistoryData({
    criterionId,
    sectorId,
    enabled: isOpen,
  });

  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleExport = () => {
    if (!data?.timeline) return;

    const csvContent = [
      [
        'Período',
        'Meta',
        'Realizado',
        '% Atingimento',
        'Rank',
        'Pontos',
        'Status',
        'Criado Por',
      ].join(','),
      ...data.timeline.map((entry) =>
        [
          entry.periodo,
          entry.valorMeta || '',
          entry.valorRealizado || '',
          entry.percentualAtingimento
            ? `${(entry.percentualAtingimento * 100).toFixed(1)}%`
            : '',
          entry.rank || '',
          entry.pontos || '',
          entry.status,
          `"${entry.criadoPor}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico_${criterionName.replace(/[^a-zA-Z0-9]/g, '_')}_${sectorName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();

    toast.success('Histórico exportado com sucesso!');
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center'
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={modalRef}
        className='relative bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col'
        style={{
          width: '95vw',
          height: '95vh',
          maxWidth: '95vw',
          maxHeight: '95vh',
          margin: '2.5vh 2.5vw',
        }}
      >
        {/* Header */}
        <div className='px-4 sm:px-6 py-4 border-b shrink-0 bg-white rounded-t-lg'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex items-start gap-3 min-w-0 flex-1'>
              <div className='p-2 bg-blue-100 rounded-lg shrink-0'>
                <BarChart3 className='h-5 w-5 text-blue-600' />
              </div>
              <div className='min-w-0 flex-1'>
                <h2 className='text-lg sm:text-xl font-semibold break-words text-gray-900'>
                  Histórico: {criterionName} - {sectorName}
                </h2>
                {data?.summary && (
                  <div className='flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm text-gray-500'>
                    <span>📅 {data.summary.timeSpan}</span>
                    <span>📊 {data.summary.totalVersions} versões</span>
                  </div>
                )}
              </div>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleExport}
                disabled={!data?.timeline?.length}
                className='hidden sm:flex'
              >
                <Download className='h-4 w-4 mr-2' />
                Exportar
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleExport}
                disabled={!data?.timeline?.length}
                className='sm:hidden'
              >
                <Download className='h-4 w-4' />
              </Button>
              <Button variant='ghost' size='sm' onClick={onClose}>
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-hidden min-h-0'>
          <ScrollArea className='h-full'>
            <div className='p-4 sm:p-6 space-y-6'>
              {isLoading && <LoadingState />}

              {error && <ErrorState onRetry={() => refetch()} />}

              {data && data.timeline.length === 0 && (
                <EmptyState
                  criterionName={criterionName}
                  sectorName={sectorName}
                />
              )}

              {data && data.timeline.length > 0 && (
                <>
                  <HistorySummaryCards summary={data.summary} />

                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-lg font-semibold'>
                        Histórico Detalhado
                      </h3>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleExport}
                        className='sm:hidden'
                      >
                        <Download className='h-4 w-4 mr-2' />
                        Exportar
                      </Button>
                    </div>
                    <HistoryTable
                      timeline={data.timeline}
                      criterion={data.criterion}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
