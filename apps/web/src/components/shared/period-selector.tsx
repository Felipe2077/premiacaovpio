// apps/web/src/components/shared/period-selector.tsx
'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Interface para os dados dos períodos que o seletor espera
export interface PeriodOption {
  id: number;
  mesAno: string;
  status: string;
  // dataInicio?: string; // Pode ser útil para ordenar ou default
}

interface PeriodSelectorProps {
  periods: PeriodOption[] | undefined; // Array de períodos para popular o select
  selectedPeriodMesAno: string; // O valor atual do período selecionado (formato YYYY-MM)
  onPeriodChange: (mesAno: string) => void; // Função chamada quando um novo período é selecionado
  isLoading?: boolean; // Para desabilitar e mostrar placeholder enquanto carrega
  label?: string; // Label opcional para o seletor
  id?: string; // ID opcional para o select e label
  className?: string; // Para estilização adicional do container do Select
  triggerClassName?: string; // Para estilização do SelectTrigger
}

export function PeriodSelector({
  periods,
  selectedPeriodMesAno,
  onPeriodChange,
  isLoading = false,
  label = 'Período da Premiação:',
  id = 'period-select',
  className,
  triggerClassName = 'w-[200px]', // Default da sua página
}: PeriodSelectorProps) {
  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select
        value={selectedPeriodMesAno}
        onValueChange={(value) => onPeriodChange(value || '')} // Garante que não é null
        disabled={isLoading || !periods || periods.length === 0}
        name={id}
        aria-labelledby={label && `${id}-label`} // Para acessibilidade
      >
        <SelectTrigger className={triggerClassName} id={id}>
          <SelectValue
            placeholder={isLoading ? 'Carregando...' : 'Selecione o Período'}
          />
        </SelectTrigger>
        <SelectContent>
          {periods && periods.length > 0 ? (
            periods.map((period) => (
              <SelectItem key={period.id} value={period.mesAno}>
                {period.mesAno} ({period.status})
              </SelectItem>
            ))
          ) : (
            <SelectItem value='loading' disabled>
              {isLoading ? 'Carregando...' : 'Nenhum período disponível'}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
