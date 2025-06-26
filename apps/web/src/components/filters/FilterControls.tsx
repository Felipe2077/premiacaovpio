// Arquivo: src/components/filters/FilterControls.tsx

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Period } from '@/hooks/useParametersData';

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

export function FilterControls({
  periods,
  activePeriod,
  onPeriodChange,
}: FilterControlsProps) {
  return (
    <div className='flex flex-wrap gap-4 justify-center items-end'>
      <div>
        <label
          htmlFor='period-select'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
        >
          Período:
        </label>
        <Select
          value={activePeriod ?? ''}
          onValueChange={onPeriodChange}
          disabled={!activePeriod || periods.length === 0}
        >
          <SelectTrigger id='period-select' className='w-[180px]'>
            <SelectValue placeholder='Carregando...' />
          </SelectTrigger>
          <SelectContent>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.mesAno}>
                <span className='capitalize'>
                  {formatMesAno(period.mesAno)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label
          htmlFor='sector-select'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
        >
          Filial:
        </label>
        <Select defaultValue='todas' disabled>
          <SelectTrigger id='sector-select' className='w-[180px]'>
            <SelectValue placeholder='Todas as Filiais' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='todas'>Todas as Filiais</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default FilterControls;
