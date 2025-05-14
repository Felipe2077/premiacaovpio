// components/PeriodSelector.jsx
import { Label } from 'your-label-library';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'your-select-library';

const PeriodSelector = ({
  selectedPeriodMesAno,
  setSelectedPeriodMesAno,
  competitionPeriods,
  isLoadingPeriods,
}) => (
  <div className='mb-4 flex items-center space-x-2'>
    <Label htmlFor='period-selector-page'>Período da Premiação:</Label>
    <Select
      value={selectedPeriodMesAno}
      onValueChange={setSelectedPeriodMesAno}
      disabled={isLoadingPeriods}
      name='period-selector-page'
    >
      <SelectTrigger className='w-[180px]'>
        <SelectValue
          placeholder={
            isLoadingPeriods ? 'Carregando...' : 'Selecione o Período'
          }
        />
      </SelectTrigger>
      <SelectContent>
        {competitionPeriods?.map((period) => (
          <SelectItem key={period.id} value={period.mesAno}>
            {period.mesAno} ({period.status})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default PeriodSelector;
