// components/parameters/ParametersPageHeader.tsx
import { PeriodSelector } from '@/components/shared/period-selector';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';

interface ParametersPageHeaderProps {
  title: string;
  selectedPeriodMesAno: string;
  onPeriodChange: (mesAno: string) => void;
  competitionPeriods: any[];
  isLoadingPeriods: boolean;
  isDisabled: boolean;
}

export function ParametersPageHeader({
  title,
  selectedPeriodMesAno,
  onPeriodChange,
  competitionPeriods,
  isLoadingPeriods,
  isDisabled,
}: ParametersPageHeaderProps) {
  return (
    <>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{title}</h1>
        <DialogTrigger asChild>
          <Button size='sm' disabled={isDisabled}>
            <PlusCircle className='mr-2 h-4 w-4' /> Nova Meta
          </Button>
        </DialogTrigger>
      </div>

      <div className='flex flex-wrap gap-4 items-center pb-4 border-b'>
        <div className='flex items-center space-x-2'>
          <Label htmlFor='period-select-page'>Período:</Label>
          <PeriodSelector
            id='period-select-page'
            label='Período:'
            periods={competitionPeriods}
            selectedPeriodMesAno={selectedPeriodMesAno}
            onPeriodChange={onPeriodChange}
            isLoading={isLoadingPeriods}
            triggerClassName='w-[200px]'
          />
        </div>
      </div>
    </>
  );
}
