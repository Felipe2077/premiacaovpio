// src/components/parameters/ParametersHeader.tsx
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CompetitionPeriod } from '@/types/parameters.types';
import { Loader2, RefreshCw } from 'lucide-react';
import React from 'react';

interface ParametersHeaderProps {
  periods: CompetitionPeriod[];
  selectedPeriodId: number | null;
  isLoading: boolean;
  onPeriodChange: (value: string) => void;
  onRefresh: () => void;
}

export const ParametersHeader: React.FC<ParametersHeaderProps> = ({
  periods,
  selectedPeriodId,
  isLoading,
  onPeriodChange,
  onRefresh,
}) => {
  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Metas</h1>
        <p className='text-muted-foreground'>
          Gerencie as metas para cada setor e critério.
        </p>
      </div>
      <div className='flex items-center gap-2'>
        <Select
          value={selectedPeriodId?.toString() || ''}
          onValueChange={onPeriodChange}
          disabled={isLoading || periods.length === 0}
        >
          <SelectTrigger className='w-[220px]'>
            <SelectValue placeholder='Selecione um período' />
          </SelectTrigger>
          <SelectContent>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id.toString()}>
                {period.mesAno} - {period.status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant='outline'
          size='icon'
          onClick={onRefresh}
          disabled={isLoading || !selectedPeriodId}
        >
          {isLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <RefreshCw className='h-4 w-4' />
          )}
        </Button>
      </div>
    </div>
  );
};
