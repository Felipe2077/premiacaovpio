// apps/web/src/components/filters/FilterControls.tsx
'use client'; // Provavelmente será client por causa dos Selects interativos

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Importa componentes Select

export function FilterControls() {
  // TODO No futuro, aqui entrarão useState e handlers onValueChange
  // Por enquanto, apenas renderiza os placeholders

  return (
    <div className='flex flex-wrap gap-4 justify-center items-end'>
      <div>
        <label
          htmlFor='period-select'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
        >
          Período:
        </label>
        <Select defaultValue='2025-04'>
          <SelectTrigger id='period-select' className='w-[180px]'>
            <SelectValue placeholder='Selecione o Período' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='2025-04'>Maio / 2025</SelectItem>
            <SelectItem value='2025-03'>Março / 2025</SelectItem>
            <SelectItem value='2025-02'>Fevereiro / 2025</SelectItem>
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
        <Select defaultValue='todas'>
          <SelectTrigger id='sector-select' className='w-[180px]'>
            <SelectValue placeholder='Selecione a Filial' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='todas'>Todas as Filiais</SelectItem>
            <SelectItem value='1'>GAMA</SelectItem>
            <SelectItem value='2'>PARANOÁ</SelectItem>
            <SelectItem value='3'>SANTA MARIA</SelectItem>
            <SelectItem value='4'>SÃO SEBASTIÃO</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Poderia ter um botão "Aplicar Filtros" aqui no futuro */}
    </div>
  );
}

export default FilterControls;
