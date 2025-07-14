// apps/web/src/components/filters/FilterControls.tsx - VERSÃO UI MELHORADA
'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Period } from '@/hooks/useParametersData';
import { Calendar, CheckCircle2, Clock, Settings } from 'lucide-react';

interface FilterControlsProps {
  periods: Period[];
  activePeriod: string | null;
  onPeriodChange: (newPeriod: string) => void;
}

const formatMesAno = (mesAno: string) => {
  if (!mesAno || !mesAno.includes('-')) return 'Data inválida';
  const [ano, mes] = mesAno.split('-');
  const date = new Date(Number(ano), Number(mes) - 1);
  return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'FECHADA':
      return <CheckCircle2 className='h-3 w-3 text-green-600' />;
    case 'ATIVA':
      return <Clock className='h-3 w-3 text-blue-600' />;
    case 'PLANEJAMENTO':
      return <Settings className='h-3 w-3 text-yellow-600' />;
    default:
      return <Calendar className='h-3 w-3 text-gray-400' />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'FECHADA':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'ATIVA':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'PLANEJAMENTO':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'FECHADA':
      return 'Finalizado';
    case 'ATIVA':
      return 'Em Andamento';
    case 'PLANEJAMENTO':
      return 'Planejamento';
    case 'PRE_FECHADA':
      return 'Pré-Fechado';
    default:
      return status;
  }
};

export function FilterControls({
  periods,
  activePeriod,
  onPeriodChange,
}: FilterControlsProps) {
  const isLoading = !activePeriod || periods.length === 0;
  const selectedPeriod = periods.find((p) => p.mesAno === activePeriod);

  // Ordenar períodos por data (mais recente primeiro)
  const sortedPeriods = [...periods].sort((a, b) => {
    const dateA = new Date(a.mesAno + '-01');
    const dateB = new Date(b.mesAno + '-01');
    return dateB.getTime() - dateA.getTime();
  });

  // Estatísticas rápidas dos períodos (removidas da interface)
  // const periodStats = {
  //   total: periods.length,
  //   ativo: periods.filter(p => p.status === 'ATIVA').length,
  //   fechado: periods.filter(p => p.status === 'FECHADA').length,
  //   planejamento: periods.filter(p => p.status === 'PLANEJAMENTO').length,
  // };

  // Função para formatar datas corretamente
  const formatDateRange = (dataInicio: string, dataFim: string) => {
    // Função auxiliar para formatar data sem problemas de timezone
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'Data inválida';

      // Se a data estiver no formato YYYY-MM-DD, split e constroi manualmente
      if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        return date.toLocaleDateString('pt-BR');
      }

      // Fallback para outros formatos
      const date = new Date(dateStr + 'T00:00:00.000Z');
      return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    return `${formatDate(dataInicio)} - ${formatDate(dataFim)}`;
  };

  return (
    <div className='space-y-4'>
      {/* Seletor de período */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-end'>
        <div className='flex-1 max-w-xs'>
          <label
            htmlFor='period-select'
            className='block text-sm font-medium text-slate-700 mb-2 flex items-center space-x-2'
          >
            <Calendar className='h-4 w-4' />
            <span>Selecionar Período:</span>
          </label>

          {isLoading ? (
            <Skeleton className='h-10 w-full' />
          ) : (
            <Select value={activePeriod ?? ''} onValueChange={onPeriodChange}>
              <SelectTrigger
                id='period-select'
                className='w-full border-slate-300 focus:border-yellow-400 focus:ring-yellow-400'
              >
                <SelectValue placeholder='Escolha um período...' />
              </SelectTrigger>
              <SelectContent className='max-h-60'>
                {sortedPeriods.map((period) => (
                  <SelectItem
                    key={period.id}
                    value={period.mesAno}
                    className='cursor-pointer'
                  >
                    <div className='flex items-center justify-between w-full'>
                      <div className='flex items-center space-x-2'>
                        {getStatusIcon(period.status)}
                        <span className='capitalize font-medium'>
                          {formatMesAno(period.mesAno)}
                        </span>
                      </div>
                      <Badge
                        variant='outline'
                        className={`ml-2 text-xs ${getStatusColor(period.status)}`}
                      >
                        {getStatusLabel(period.status)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Informações do período selecionado */}
        {selectedPeriod && (
          <div className='flex-1 min-w-0'>
            <div className='text-sm text-slate-600 mb-2'>
              Período Selecionado:
            </div>
            <div className='p-3 bg-slate-50 rounded-lg border border-slate-200'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-semibold text-slate-900 capitalize'>
                    {formatMesAno(selectedPeriod.mesAno)}
                  </div>
                  <div className='text-xs text-slate-500'>
                    {formatDateRange(
                      selectedPeriod.dataInicio,
                      selectedPeriod.dataFim
                    )}
                  </div>
                </div>
                <Badge className={getStatusColor(selectedPeriod.status)}>
                  {getStatusIcon(selectedPeriod.status)}
                  <span className='ml-1'>
                    {getStatusLabel(selectedPeriod.status)}
                  </span>
                </Badge>
              </div>

              {/* Informações extras para períodos finalizados */}
              {selectedPeriod.status === 'FECHADA' &&
                selectedPeriod.setorVencedor && (
                  <div className='mt-2 pt-2 border-t border-slate-200'>
                    <div className='flex items-center space-x-2 text-sm'>
                      <span className='text-yellow-600'>🏆</span>
                      <span className='text-slate-600'>Vencedor:</span>
                      <span className='font-semibold text-slate-900'>
                        {selectedPeriod.setorVencedor.nome}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Dicas para o usuário */}
      {!selectedPeriod && (
        <div className='text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200'>
          💡 <strong>Dica:</strong> Selecione um período para visualizar os
          resultados da competição. Períodos "Finalizados" possuem dados
          completos e rankings oficiais.
        </div>
      )}
    </div>
  );
}

export default FilterControls;
