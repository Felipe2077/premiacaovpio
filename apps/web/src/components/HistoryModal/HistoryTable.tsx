// components/modals/HistoryModal/HistoryTable.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HistoryEntry } from '@/types/history.types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Award,
  Crown,
  Info,
  Medal,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface HistoryTableProps {
  timeline: HistoryEntry[];
  criterion: {
    unidade_medida: string;
    sentido_melhor: string;
  };
  filter: 'all' | 'active' | 'current' | 'recent';
  sortBy: 'periodo' | 'atingimento' | 'meta';
  sortOrder: 'asc' | 'desc';
}

export const HistoryTable = ({
  timeline,
  criterion,
  filter,
  sortBy,
  sortOrder,
}: HistoryTableProps) => {
  const [expandedJustifications, setExpandedJustifications] = useState<
    Set<number>
  >(new Set());

  // Filtrar dados
  const filteredData = timeline.filter((entry) => {
    switch (filter) {
      case 'active':
        return entry.status === 'ATIVA';
      case 'current':
        const currentDate = new Date();
        const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        return entry.periodo === currentPeriod;
      case 'recent':
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(entry.dataCriacao) >= sixMonthsAgo;
      default:
        return true;
    }
  });

  // Ordenar dados
  const sortedData = [...filteredData].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'atingimento':
        aValue = a.percentualAtingimento || 0;
        bValue = b.percentualAtingimento || 0;
        break;
      case 'meta':
        aValue = a.valorMeta || 0;
        bValue = b.valorMeta || 0;
        break;
      default: // periodo
        aValue = a.periodo;
        bValue = b.periodo;
        break;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return '-';
    return `${value.toLocaleString('pt-BR')} ${unit}`;
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ATIVA: 'default',
      EXPIRADA: 'secondary',
      FUTURA: 'outline',
    } as const;

    const colors = {
      ATIVA: 'bg-green-100 text-green-800 border-green-300',
      EXPIRADA: 'bg-gray-100 text-gray-600 border-gray-300',
      FUTURA: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    return (
      <Badge
        variant={variants[status as keyof typeof variants]}
        className={colors[status as keyof typeof colors]}
      >
        {status}
      </Badge>
    );
  };

  const getAttainmentBadge = (attainment: number | null) => {
    if (attainment === null)
      return <span className='text-muted-foreground'>-</span>;

    const percentage = attainment * 100;
    let className = '';
    let icon = null;

    if (percentage >= 100) {
      className = 'text-green-600 font-semibold';
      icon = <TrendingUp className='h-3 w-3 inline ml-1' />;
    } else if (percentage >= 80) {
      className = 'text-yellow-600 font-medium';
      icon = <Minus className='h-3 w-3 inline ml-1' />;
    } else {
      className = 'text-red-600 font-medium';
      icon = <TrendingDown className='h-3 w-3 inline ml-1' />;
    }

    return (
      <span className={className}>
        {percentage.toFixed(1)}%{icon}
      </span>
    );
  };

  const getRankBadge = (rank: number | null) => {
    if (rank === null) return <span className='text-muted-foreground'>-</span>;

    let icon = null;
    let className = 'inline-flex items-center gap-1';

    if (rank === 1) {
      icon = <Crown className='h-3 w-3 text-yellow-500' />;
      className += ' text-yellow-600 font-bold';
    } else if (rank === 2) {
      icon = <Medal className='h-3 w-3 text-gray-400' />;
      className += ' text-gray-600 font-semibold';
    } else if (rank === 3) {
      icon = <Award className='h-3 w-3 text-orange-500' />;
      className += ' text-orange-600 font-semibold';
    } else {
      className += ' text-muted-foreground';
    }

    return (
      <span className={className}>
        {icon}
        {rank}º
      </span>
    );
  };

  const getRowClassName = (entry: HistoryEntry) => {
    let baseClass = 'hover:bg-muted/50 transition-colors';

    if (entry.status === 'ATIVA') {
      baseClass += ' bg-blue-50/50 border-l-4 border-l-blue-500';
    } else if (entry.status === 'FUTURA') {
      baseClass += ' opacity-60';
    }

    return baseClass;
  };

  const toggleJustification = (id: number) => {
    const newExpanded = new Set(expandedJustifications);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedJustifications(newExpanded);
  };

  const truncateText = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className='border rounded-lg'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-24'>Período</TableHead>
            <TableHead className='w-24'>Meta</TableHead>
            <TableHead className='w-24'>Realizado</TableHead>
            <TableHead className='w-28'>% Atingimento</TableHead>
            <TableHead className='w-20'>Rank</TableHead>
            <TableHead className='w-20'>Pontos</TableHead>
            <TableHead className='w-20'>Status</TableHead>
            <TableHead className='w-32'>Criado Por</TableHead>
            <TableHead className='w-40'>Justificativa</TableHead>
            <TableHead className='w-32'>Data Criação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((entry) => (
            <TableRow key={entry.id} className={getRowClassName(entry)}>
              <TableCell className='font-medium'>
                {entry.periodo}
                {entry.versao > 1 && (
                  <Badge variant='outline' className='ml-2 text-xs'>
                    v{entry.versao}
                  </Badge>
                )}
              </TableCell>

              <TableCell>
                {formatValue(entry.valorMeta, criterion.unidade_medida)}
              </TableCell>

              <TableCell>
                {formatValue(entry.valorRealizado, criterion.unidade_medida)}
              </TableCell>

              <TableCell>
                {getAttainmentBadge(entry.percentualAtingimento)}
              </TableCell>

              <TableCell>{getRankBadge(entry.rank)}</TableCell>

              <TableCell>
                {entry.pontos ? (
                  <span
                    className={`font-medium ${
                      entry.pontos <= 1.5
                        ? 'text-green-600'
                        : entry.pontos <= 2.0
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {entry.pontos.toFixed(1)}
                  </span>
                ) : (
                  <span className='text-muted-foreground'>-</span>
                )}
              </TableCell>

              <TableCell>{getStatusBadge(entry.status)}</TableCell>

              <TableCell>
                <span className='text-sm'>{entry.criadoPor}</span>
              </TableCell>

              <TableCell className='max-w-40'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className='flex items-center gap-2'>
                        <span
                          className='text-sm cursor-pointer'
                          onClick={() => toggleJustification(entry.id)}
                        >
                          {expandedJustifications.has(entry.id)
                            ? entry.justificativa
                            : truncateText(entry.justificativa, 40)}
                        </span>
                        {entry.justificativa.length > 40 && (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0'
                            onClick={() => toggleJustification(entry.id)}
                          >
                            <Info className='h-3 w-3' />
                          </Button>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side='top' className='max-w-80'>
                      <p>{entry.justificativa}</p>
                      {entry.metadata && (
                        <div className='mt-2 text-xs text-muted-foreground'>
                          {entry.metadata.calculationMethod && (
                            <p>Método: {entry.metadata.calculationMethod}</p>
                          )}
                          {entry.metadata.adjustmentPercentage && (
                            <p>
                              Ajuste: {entry.metadata.adjustmentPercentage}%
                            </p>
                          )}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>

              <TableCell>
                <div className='text-sm'>
                  <div>
                    {new Date(entry.dataCriacao).toLocaleDateString('pt-BR')}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {formatDistanceToNow(new Date(entry.dataCriacao), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {sortedData.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={10}
                className='h-24 text-center text-muted-foreground'
              >
                Nenhum registro encontrado com os filtros aplicados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

// components/modals/HistoryModal/LoadingState.tsx
('use client');

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const LoadingState = () => {
  return (
    <div className='space-y-6'>
      {/* Cards de resumo */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
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

      {/* Gráfico */}
      <Card>
        <CardContent className='p-6'>
          <Skeleton className='h-6 w-32 mb-4' />
          <Skeleton className='h-80 w-full' />
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className='flex justify-between'>
        <div className='flex gap-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-9 w-20' />
          ))}
        </div>
        <div className='flex gap-2'>
          <Skeleton className='h-9 w-40' />
          <Skeleton className='h-9 w-9' />
        </div>
      </div>

      {/* Tabela */}
      <div className='border rounded-lg'>
        <div className='p-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='flex gap-4 py-3'>
              {Array.from({ length: 10 }).map((_, j) => (
                <Skeleton key={j} className='h-4 flex-1' />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// components/modals/HistoryModal/ErrorState.tsx
('use client');

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => {
  return (
    <Card>
      <CardContent className='p-8'>
        <div className='flex flex-col items-center text-center space-y-4'>
          <div className='p-3 bg-red-100 rounded-full'>
            <AlertCircle className='h-8 w-8 text-red-600' />
          </div>

          <div className='space-y-2'>
            <h3 className='text-lg font-semibold'>
              Erro ao carregar histórico
            </h3>
            <p className='text-muted-foreground'>{message}</p>
          </div>

          <Button onClick={onRetry} variant='outline'>
            <RefreshCw className='h-4 w-4 mr-2' />
            Tentar novamente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// components/modals/HistoryModal/EmptyState.tsx
('use client');

import { BarChart3, Plus } from 'lucide-react';

interface EmptyStateProps {
  criterionName: string;
  sectorName: string;
}

export const EmptyState = ({ criterionName, sectorName }: EmptyStateProps) => {
  return (
    <Card>
      <CardContent className='p-8'>
        <div className='flex flex-col items-center text-center space-y-4'>
          <div className='p-4 bg-gray-100 rounded-full'>
            <BarChart3 className='h-12 w-12 text-gray-400' />
          </div>

          <div className='space-y-2'>
            <h3 className='text-lg font-semibold'>
              Nenhum histórico encontrado
            </h3>
            <p className='text-muted-foreground max-w-md'>
              Ainda não há histórico de metas para{' '}
              <strong>{criterionName}</strong> no setor{' '}
              <strong>{sectorName}</strong>.
            </p>
          </div>

          <Button variant='outline'>
            <Plus className='h-4 w-4 mr-2' />
            Criar primeira meta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Exemplo de uso no componente pai
/*
import { HistoryModal } from '@/components/modals/HistoryModal';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { useState } from 'react';

const ExampleUsage = () => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowHistory(true)}
      >
        <History className="h-4 w-4" />
      </Button>

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        criterionId={1}
        sectorId={1}
        criterionName="ATRASO"
        sectorName="GAMA"
      />
    </>
  );
};
*/ // types/history.types.ts
export interface HistoryEntry {
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

export interface HistorySummary {
  avgAttainment: number;
  bestPeriod: { period: string; attainment: number; rank?: number };
  worstPeriod: { period: string; attainment: number; rank?: number };
  totalVersions: number;
  timeSpan: string;
  currentStreak?: { type: 'positive' | 'negative'; count: number };
}

export interface HistoryData {
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

// hooks/useHistoryData.ts
import { HistoryData } from '@/types/history.types';
import { useQuery } from '@tanstack/react-query';

interface UseHistoryDataParams {
  criterionId: number;
  sectorId: number;
  limit?: number;
}

export const useHistoryData = ({
  criterionId,
  sectorId,
  limit = 24,
}: UseHistoryDataParams) => {
  return useQuery<HistoryData>({
    queryKey: ['history', criterionId, sectorId, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/history/criterion-sector?criterionId=${criterionId}&sectorId=${sectorId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Falha ao carregar histórico');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });
};

// components/modals/HistoryModal/index.tsx
('use client');

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useHistoryData } from '@/hooks/useHistoryData';
import { Download, X } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { HistoryChart } from './HistoryChart';
import { HistoryFilters } from './HistoryFilters';
import { HistoryHeader } from './HistoryHeader';
import { HistoryTable } from './HistoryTable';
import { LoadingState } from './LoadingState';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  criterionId: number;
  sectorId: number;
  criterionName: string;
  sectorName: string;
}

export const HistoryModal = ({
  isOpen,
  onClose,
  criterionId,
  sectorId,
  criterionName,
  sectorName,
}: HistoryModalProps) => {
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'active' | 'current' | 'recent'
  >('all');
  const [sortBy, setSortBy] = useState<'periodo' | 'atingimento' | 'meta'>(
    'periodo'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error, refetch } = useHistoryData({
    criterionId,
    sectorId,
    limit: 24,
  });

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
        'Data Criação',
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
          entry.criadoPor,
          new Date(entry.dataCriacao).toLocaleDateString('pt-BR'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico_${criterionName}_${sectorName}.csv`;
    link.click();
  };

  const getTrendIcon = (summary: any) => {
    if (!summary.currentStreak)
      return <Minus className='h-4 w-4 text-muted-foreground' />;

    return summary.currentStreak.type === 'positive' ? (
      <TrendingUp className='h-4 w-4 text-green-600' />
    ) : (
      <TrendingDown className='h-4 w-4 text-red-600' />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-7xl max-h-[90vh] p-0'>
        <DialogHeader className='p-6 pb-0'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-blue-100 rounded-lg'>
                <BarChart3 className='h-5 w-5 text-blue-600' />
              </div>
              <div>
                <DialogTitle className='text-xl font-semibold'>
                  Histórico: {criterionName} - {sectorName}
                </DialogTitle>
                {data?.summary && (
                  <div className='flex items-center gap-4 mt-1 text-sm text-muted-foreground'>
                    <span>📅 {data.summary.timeSpan}</span>
                    <span>📊 {data.summary.totalVersions} versões</span>
                    <div className='flex items-center gap-1'>
                      <span>📈</span>
                      {getTrendIcon(data.summary)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleExport}
                disabled={!data?.timeline?.length}
              >
                <Download className='h-4 w-4 mr-2' />
                Exportar
              </Button>
              <Button variant='ghost' size='sm' onClick={onClose}>
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='px-6'>
          <Separator />
        </div>

        <ScrollArea className='flex-1'>
          <div className='p-6 space-y-6'>
            {isLoading && <LoadingState />}

            {error && (
              <ErrorState
                message='Erro ao carregar histórico'
                onRetry={() => refetch()}
              />
            )}

            {data && data.timeline.length === 0 && (
              <EmptyState
                criterionName={criterionName}
                sectorName={sectorName}
              />
            )}

            {data && data.timeline.length > 0 && (
              <>
                <HistoryHeader summary={data.summary} />

                <HistoryChart
                  timeline={data.timeline}
                  criterion={data.criterion}
                />

                <div className='space-y-4'>
                  <HistoryFilters
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                  />

                  <HistoryTable
                    timeline={data.timeline}
                    criterion={data.criterion}
                    filter={selectedFilter}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// components/modals/HistoryModal/HistoryHeader.tsx
('use client');

import { HistorySummary } from '@/types/history.types';
import { Target, Zap } from 'lucide-react';

interface HistoryHeaderProps {
  summary: HistorySummary;
}

export const HistoryHeader = ({ summary }: HistoryHeaderProps) => {
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getAttainmentColor = (attainment: number) => {
    if (attainment >= 1) return 'bg-green-50 text-green-700 border-green-200';
    if (attainment >= 0.8)
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Média Geral
              </p>
              <p className='text-2xl font-bold'>
                {formatPercentage(summary.avgAttainment)}
              </p>
            </div>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <Target className='h-5 w-5 text-blue-600' />
            </div>
          </div>
          <div className='mt-2'>
            <Badge
              variant='outline'
              className={getAttainmentColor(summary.avgAttainment)}
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
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Melhor Período
              </p>
              <p className='text-lg font-semibold'>
                {summary.bestPeriod.period}
              </p>
              <p className='text-sm text-green-600'>
                {formatPercentage(summary.bestPeriod.attainment)}
              </p>
            </div>
            <div className='p-2 bg-green-100 rounded-lg'>
              <TrendingUp className='h-5 w-5 text-green-600' />
            </div>
          </div>
          {summary.bestPeriod.rank && (
            <div className='mt-2'>
              <Badge
                variant='outline'
                className='bg-green-50 text-green-700 border-green-200'
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
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Pior Período
              </p>
              <p className='text-lg font-semibold'>
                {summary.worstPeriod.period}
              </p>
              <p className='text-sm text-red-600'>
                {formatPercentage(summary.worstPeriod.attainment)}
              </p>
            </div>
            <div className='p-2 bg-red-100 rounded-lg'>
              <TrendingDown className='h-5 w-5 text-red-600' />
            </div>
          </div>
          {summary.worstPeriod.rank && (
            <div className='mt-2'>
              <Badge
                variant='outline'
                className='bg-red-50 text-red-700 border-red-200'
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
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Sequência Atual
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
                <p className='text-lg text-muted-foreground'>Sem tendência</p>
              )}
            </div>
            <div className='p-2 bg-purple-100 rounded-lg'>
              <Zap className='h-5 w-5 text-purple-600' />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// components/modals/HistoryModal/HistoryChart.tsx
('use client');

import { CardHeader, CardTitle } from '@/components/ui/card';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

interface HistoryChartProps {
  timeline: HistoryEntry[];
  criterion: {
    unidade_medida: string;
    sentido_melhor: string;
  };
}

export const HistoryChart = ({ timeline, criterion }: HistoryChartProps) => {
  // Preparar dados para o gráfico (últimos 12 períodos)
  const chartData = timeline
    .slice(-12)
    .map((entry) => ({
      periodo: entry.periodo,
      meta: entry.valorMeta,
      realizado: entry.valorRealizado,
      atingimento: entry.percentualAtingimento
        ? entry.percentualAtingimento * 100
        : null,
      rank: entry.rank,
    }))
    .reverse();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className='bg-white border border-gray-200 rounded-lg shadow-lg p-3'>
        <p className='font-semibold'>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className='text-sm'>
            {entry.name}:{' '}
            {entry.name === 'Atingimento' ? `${entry.value}%` : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Evolução Temporal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' className='opacity-30' />
              <XAxis
                dataKey='periodo'
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor='end'
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />

              <Line
                type='monotone'
                dataKey='meta'
                stroke='#3b82f6'
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                name='Meta'
              />

              <Line
                type='monotone'
                dataKey='realizado'
                stroke='#10b981'
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name='Realizado'
              />

              <Line
                type='monotone'
                dataKey='atingimento'
                stroke='#f59e0b'
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                name='Atingimento'
                yAxisId='right'
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className='flex justify-center gap-6 mt-4 text-sm'>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-blue-500 rounded-full' />
            <span>Meta ({criterion.unidade_medida})</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-green-500 rounded-full' />
            <span>Realizado ({criterion.unidade_medida})</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 bg-yellow-500 rounded-full' />
            <span>% Atingimento</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// components/modals/HistoryModal/HistoryFilters.tsx
('use client');

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface HistoryFiltersProps {
  selectedFilter: 'all' | 'active' | 'current' | 'recent';
  onFilterChange: (filter: 'all' | 'active' | 'current' | 'recent') => void;
  sortBy: 'periodo' | 'atingimento' | 'meta';
  onSortByChange: (sort: 'periodo' | 'atingimento' | 'meta') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
}

export const HistoryFilters = ({
  selectedFilter,
  onFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: HistoryFiltersProps) => {
  const filters = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'current', label: 'Período Atual' },
    { value: 'recent', label: 'Últimos 6 meses' },
  ] as const;

  return (
    <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
      <div className='flex gap-2'>
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={selectedFilter === filter.value ? 'default' : 'outline'}
            size='sm'
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className='flex gap-2 items-center'>
        <Select
          value={sortBy}
          onValueChange={(value: any) => onSortByChange(value)}
        >
          <SelectTrigger className='w-40'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='periodo'>Período</SelectItem>
            <SelectItem value='atingimento'>% Atingimento</SelectItem>
            <SelectItem value='meta'>Meta</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant='outline'
          size='sm'
          onClick={() =>
            onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')
          }
        >
          {sortOrder === 'asc' ? (
            <ArrowUp className='h-4 w-4' />
          ) : (
            <ArrowDown className='h-4 w-4' />
          )}
        </Button>
      </div>
    </div>
  );
};
