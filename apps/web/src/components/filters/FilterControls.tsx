//apps/web/src/components/filters/FilterControls.tsx - VERSÃO MELHORADA
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
// Tipos baseados no código existente
interface Period {
  id: number;
  mesAno: string;
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  dataInicio: string;
  dataFim: string;
  setorVencedor?: {
    id: number;
    nome: string;
  };
  oficializadaEm?: string;
}

interface FilterControlsProps {
  periods: Period[];
  activePeriod: string | null;
  onPeriodChange: (newPeriod: string) => void;
}

// Função para formatar o período de forma amigável
const formatMesAno = (mesAno: string) => {
  if (!mesAno || !mesAno.includes('-')) return 'Data inválida';
  const [ano, mes] = mesAno.split('-');
  const date = new Date(Number(ano), Number(mes) - 1);
  return date.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

// Função para obter ícone do status
const getStatusIcon = (status: Period['status']) => {
  switch (status) {
    case 'ATIVA':
      return '🏆';
    case 'FECHADA':
      return '✅';
    case 'PRE_FECHADA':
      return '⏳';
    case 'PLANEJAMENTO':
      return '🔧';
    default:
      return '📅';
  }
};

export function FilterControls({
  periods,
  activePeriod,
  onPeriodChange,
}: FilterControlsProps) {
  const isLoading = !activePeriod || periods.length === 0;

  // Encontrar o período selecionado para mostrar o badge
  const selectedPeriod = periods.find((p) => p.mesAno === activePeriod) || null;

  // Ordenar períodos por data (mais recente primeiro)
  const sortedPeriods = [...periods].sort((a, b) => {
    const dateA = new Date(a.mesAno + '-01');
    const dateB = new Date(b.mesAno + '-01');
    return dateB.getTime() - dateA.getTime();
  });

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex items-center gap-2 text-sm font-medium text-slate-700'>
          <Calendar className='h-4 w-4' />
          <span>Carregando períodos...</span>
        </div>
        <Skeleton className='h-14 w-[280px]' />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-1'>
      {/* Header com ícone */}
      <div className='flex items-center gap-2 text-sm font-medium text-slate-700'>
        <Calendar className='h-4 w-4' />
        <span>Período de Competição:</span>
      </div>

      {/* Container principal com select e badge */}
      <div className='flex items-center gap-3'>
        {/* Select melhorado */}
        <div className='relative'>
          <Select value={activePeriod ?? ''} onValueChange={onPeriodChange}>
            <SelectTrigger className='w-[200px] h-14 text-base font-medium border-2 hover:border-slate-300 transition-colors'>
              <SelectValue placeholder='Selecione um período...' />
            </SelectTrigger>
            <SelectContent>
              {sortedPeriods.map((period) => (
                <SelectItem
                  key={period.id}
                  value={period.mesAno}
                  className='h-16 p-3'
                >
                  <div className='flex items-center justify-between w-full'>
                    <div className='flex flex-col items-start'>
                      <span className='font-medium text-base capitalize'>
                        {getStatusIcon(period.status)}{' '}
                        {formatMesAno(period.mesAno)}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Informação adicional discreta */}
      {selectedPeriod && (
        <div className='text-xs text-muted-foreground bg-slate-50 px-3 py-2 rounded-md border'>
          {selectedPeriod.status === 'FECHADA' &&
            selectedPeriod.setorVencedor && (
              <span className='ml-2'>
                • Vencedor: <strong>{selectedPeriod.setorVencedor.nome}</strong>
              </span>
            )}
          {selectedPeriod.status === 'ATIVA' && (
            <span className='ml-2 text-green-600'>
              • Competição em andamento
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterControls;
