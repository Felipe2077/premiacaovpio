// apps/web/src/app/admin/users/components/UserFilters.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedInput } from '@/hooks/useDebounce';
import { useSectorsData } from '@/hooks/useSectorsData';
import { Role } from '@sistema-premiacao/shared-types';
import { Filter, Search, X } from 'lucide-react';

interface UserFiltersProps {
  filters: {
    active?: boolean;
    role?: string;
    sectorId?: number;
    search?: string;
    page?: number;
    limit?: number;
  };
  onFiltersChange: (filters: any) => void;
  isLoading?: boolean;
}

export function UserFilters({
  filters,
  onFiltersChange,
  isLoading,
}: UserFiltersProps) {
  const { data: sectors, isLoading: isLoadingSectors } = useSectorsData();

  // Usar hook customizado do projeto para debounce
  const { value: localSearch, onChange: handleSearchChange } =
    useDebouncedInput(
      filters.search || '',
      (value) => onFiltersChange({ search: value || undefined }),
      300
    );

  const handleActiveChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ active: undefined });
    } else {
      onFiltersChange({ active: value === 'true' });
    }
  };

  const handleRoleChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ role: undefined });
    } else {
      onFiltersChange({ role: value });
    }
  };

  const handleSectorChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ sectorId: undefined });
    } else {
      onFiltersChange({ sectorId: parseInt(value) });
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      search: undefined,
      active: undefined,
      role: undefined,
      sectorId: undefined,
    });
  };

  const hasActiveFilters = !!(
    filters.search ||
    filters.active !== undefined ||
    filters.role ||
    filters.sectorId
  );

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 text-sm font-medium text-gray-700'>
        <Filter className='h-4 w-4' />
        Filtros
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Busca textual */}
        <div className='space-y-2'>
          <Label htmlFor='search'>Buscar por nome ou email</Label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <Input
              id='search'
              type='text'
              placeholder='Digite para buscar...'
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='pl-10'
              disabled={isLoading}
            />
            {localSearch && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleSearchChange('')}
                className='absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0'
              >
                <X className='h-3 w-3' />
              </Button>
            )}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleSearchChange('')}
              className='absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0'
            >
              <X className='h-3 w-3' />
            </Button>
          </div>
        </div>

        {/* Filtro de status */}
        <div className='space-y-2'>
          <Label>Status</Label>
          <Select
            value={
              filters.active === undefined ? 'all' : filters.active.toString()
            }
            onValueChange={handleActiveChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder='Todos os status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todos os status</SelectItem>
              <SelectItem value='true'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  Ativo
                </div>
              </SelectItem>
              <SelectItem value='false'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                  Inativo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de role */}
        <div className='space-y-2'>
          <Label>Função</Label>
          <Select
            value={filters.role || 'all'}
            onValueChange={handleRoleChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder='Todas as funções' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todas as funções</SelectItem>
              <SelectItem value={Role.DIRETOR}>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-purple-500 rounded-full'></div>
                  Diretor
                </div>
              </SelectItem>
              <SelectItem value={Role.GERENTE}>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                  Gerente
                </div>
              </SelectItem>
              <SelectItem value={Role.VISUALIZADOR}>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-gray-500 rounded-full'></div>
                  Visualizador
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de setor */}
        <div className='space-y-2'>
          <Label>Setor</Label>
          <Select
            value={filters.sectorId?.toString() || 'all'}
            onValueChange={handleSectorChange}
            disabled={isLoading || isLoadingSectors}
          >
            <SelectTrigger>
              <SelectValue placeholder='Todos os setores' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todos os setores</SelectItem>
              {sectors?.map((sector) => (
                <SelectItem key={sector.id} value={sector.id.toString()}>
                  {sector.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botão para limpar filtros */}
      {hasActiveFilters && (
        <div className='flex justify-start'>
          <Button
            variant='outline'
            size='sm'
            onClick={clearFilters}
            disabled={isLoading}
          >
            <X className='h-4 w-4 mr-2' />
            Limpar Filtros
          </Button>
        </div>
      )}

      {/* Resumo dos filtros ativos */}
      {hasActiveFilters && (
        <div className='text-xs text-gray-600'>
          Filtros ativos:{' '}
          {[
            filters.search && `Busca: "${filters.search}"`,
            filters.active !== undefined &&
              `Status: ${filters.active ? 'Ativo' : 'Inativo'}`,
            filters.role && `Função: ${filters.role}`,
            filters.sectorId &&
              sectors?.find((s) => s.id === filters.sectorId)?.nome,
          ]
            .filter(Boolean)
            .join(' • ')}
        </div>
      )}
    </div>
  );
}
