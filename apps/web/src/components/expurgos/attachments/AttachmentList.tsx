// apps/web/src/components/expurgos/attachments/AttachmentList.tsx

'use client';

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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  AttachmentEntity,
  AttachmentListProps,
  FileType,
  formatFileSize,
  getFileTypeFromMimeType,
} from '@sistema-premiacao/shared-types';
import {
  Download,
  FileText,
  Filter,
  Grid3X3,
  List,
  Search,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import AttachmentItem from './AttachmentItem';
import AttachmentUpload from './AttachmentUpload';

// ================================
// TIPOS E INTERFACES
// ================================

type SortOption = 'name' | 'size' | 'date' | 'type';
type SortDirection = 'asc' | 'desc';
type FilterOption = 'all' | 'images' | 'pdf' | 'documents' | 'others';
type ViewMode = 'list' | 'grid';

interface ListState {
  searchTerm: string;
  sortBy: SortOption;
  sortDirection: SortDirection;
  filterBy: FilterOption;
  viewMode: ViewMode;
}

// ================================
// UTILITÁRIOS
// ================================

function filterAttachments(
  attachments: AttachmentEntity[],
  searchTerm: string,
  filterBy: FilterOption
): AttachmentEntity[] {
  let filtered = attachments;

  // Filtro por busca
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (att) =>
        att.originalFileName.toLowerCase().includes(term) ||
        att.description?.toLowerCase().includes(term) ||
        att.uploadedBy?.nome.toLowerCase().includes(term)
    );
  }

  // Filtro por tipo
  if (filterBy !== 'all') {
    filtered = filtered.filter((att) => {
      const fileType = getFileTypeFromMimeType(att.mimeType);

      switch (filterBy) {
        case 'images':
          return fileType === FileType.IMAGE;
        case 'pdf':
          return fileType === FileType.PDF;
        case 'documents':
          return (
            fileType === FileType.DOCUMENT || fileType === FileType.SPREADSHEET
          );
        case 'others':
          return fileType === FileType.UNKNOWN;
        default:
          return true;
      }
    });
  }

  return filtered;
}

function sortAttachments(
  attachments: AttachmentEntity[],
  sortBy: SortOption,
  direction: SortDirection
): AttachmentEntity[] {
  const sorted = [...attachments].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.originalFileName.localeCompare(b.originalFileName);
        break;
      case 'size':
        comparison = a.fileSize - b.fileSize;
        break;
      case 'date':
        comparison =
          new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        break;
      case 'type':
        comparison = a.mimeType.localeCompare(b.mimeType);
        break;
    }

    return direction === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

// ================================
// COMPONENTE PRINCIPAL
// ================================

export default function AttachmentList({
  expurgoId,
  attachments,
  loading = false,
  error = null,
  onUpload,
  onDelete,
  onDownload,
  showUpload = true,
  showActions = true,
  maxHeight = '500px',
}: AttachmentListProps) {
  // ================================
  // ESTADOS
  // ================================

  const [listState, setListState] = useState<ListState>({
    searchTerm: '',
    sortBy: 'date',
    sortDirection: 'desc',
    filterBy: 'all',
    viewMode: 'list',
  });

  const [showFilters, setShowFilters] = useState(false);

  // ================================
  // DADOS COMPUTADOS
  // ================================

  const processedAttachments = useMemo(() => {
    const filtered = filterAttachments(
      attachments,
      listState.searchTerm,
      listState.filterBy
    );

    return sortAttachments(filtered, listState.sortBy, listState.sortDirection);
  }, [attachments, listState]);

  const statistics = useMemo(() => {
    const totalSize = attachments.reduce((sum, att) => sum + att.fileSize, 0);
    const typeCount: Record<string, number> = {};

    attachments.forEach((att) => {
      const type = getFileTypeFromMimeType(att.mimeType);
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return {
      totalCount: attachments.length,
      totalSize,
      typeCount,
    };
  }, [attachments]);

  // ================================
  // HANDLERS
  // ================================

  const updateListState = (updates: Partial<ListState>) => {
    setListState((prev) => ({ ...prev, ...updates }));
  };

  const toggleSort = (option: SortOption) => {
    if (listState.sortBy === option) {
      updateListState({
        sortDirection: listState.sortDirection === 'asc' ? 'desc' : 'asc',
      });
    } else {
      updateListState({
        sortBy: option,
        sortDirection: 'asc',
      });
    }
  };

  const handleDownloadAll = () => {
    processedAttachments.forEach((attachment) => {
      if (onDownload) {
        onDownload(attachment);
      }
    });
  };

  // ================================
  // ESTADOS DE CARREGAMENTO E ERRO
  // ================================

  if (loading) {
    return (
      <div className='flex items-center justify-center h-32'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
        <span className='ml-2'>Carregando anexos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center text-red-600 p-4'>
        <p>Erro ao carregar anexos: {error.message}</p>
      </div>
    );
  }

  // ================================
  // RENDER
  // ================================

  return (
    <div className='space-y-4'>
      {/* Upload Section */}
      {showUpload && (
        <div className='space-y-2'>
          <Label className='text-sm font-medium'>Adicionar Anexos</Label>
          <AttachmentUpload
            expurgoId={expurgoId}
            onUploadSuccess={(attachment) => {
              onUpload?.([attachment] as any); // Type conversion for compatibility
            }}
            variant='compact'
          />
        </div>
      )}

      {/* Separator */}
      {showUpload && attachments.length > 0 && <Separator />}

      {/* Header com estatísticas e controles */}
      {attachments.length > 0 && (
        <div className='space-y-3'>
          {/* Estatísticas */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4 text-sm text-gray-600'>
              <span>{statistics.totalCount} arquivo(s)</span>
              <span>•</span>
              <span>{formatFileSize(statistics.totalSize)}</span>
            </div>

            <div className='flex items-center space-x-2'>
              {/* Botão de filtros */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && 'bg-gray-100')}
              >
                <Filter className='h-4 w-4 mr-2' />
                Filtros
              </Button>

              {/* Toggle de visualização */}
              <div className='flex items-center border rounded-md'>
                <Button
                  variant={listState.viewMode === 'list' ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => updateListState({ viewMode: 'list' })}
                  className='rounded-r-none'
                >
                  <List className='h-4 w-4' />
                </Button>
                <Button
                  variant={listState.viewMode === 'grid' ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => updateListState({ viewMode: 'grid' })}
                  className='rounded-l-none'
                >
                  <Grid3X3 className='h-4 w-4' />
                </Button>
              </div>

              {/* Download todos */}
              {processedAttachments.length > 0 && (
                <Button variant='outline' size='sm' onClick={handleDownloadAll}>
                  <Download className='h-4 w-4 mr-2' />
                  Baixar Todos
                </Button>
              )}
            </div>
          </div>

          {/* Filtros (mostrar/ocultar) */}
          {showFilters && (
            <div className='grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              {/* Busca */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <Input
                  placeholder='Buscar arquivos...'
                  value={listState.searchTerm}
                  onChange={(e) =>
                    updateListState({ searchTerm: e.target.value })
                  }
                  className='pl-10'
                />
              </div>

              {/* Filtro por tipo */}
              <Select
                value={listState.filterBy}
                onValueChange={(value: FilterOption) =>
                  updateListState({ filterBy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Tipo de arquivo' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos os tipos</SelectItem>
                  <SelectItem value='images'>Imagens</SelectItem>
                  <SelectItem value='pdf'>PDFs</SelectItem>
                  <SelectItem value='documents'>Documentos</SelectItem>
                  <SelectItem value='others'>Outros</SelectItem>
                </SelectContent>
              </Select>

              {/* Ordenação */}
              <Select
                value={listState.sortBy}
                onValueChange={(value: SortOption) =>
                  updateListState({ sortBy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Ordenar por' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='name'>Nome</SelectItem>
                  <SelectItem value='size'>Tamanho</SelectItem>
                  <SelectItem value='date'>Data</SelectItem>
                  <SelectItem value='type'>Tipo</SelectItem>
                </SelectContent>
              </Select>

              {/* Direção da ordenação */}
              <Button
                variant='outline'
                onClick={() => toggleSort(listState.sortBy)}
                className='justify-start'
              >
                {listState.sortDirection === 'asc' ? (
                  <SortAsc className='h-4 w-4 mr-2' />
                ) : (
                  <SortDesc className='h-4 w-4 mr-2' />
                )}
                {listState.sortDirection === 'asc'
                  ? 'Crescente'
                  : 'Decrescente'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Lista/Grid de Anexos */}
      {attachments.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>
          <FileText className='mx-auto h-12 w-12 mb-4 text-gray-300' />
          <p className='text-sm'>Nenhum anexo encontrado</p>
          {showUpload && (
            <p className='text-xs mt-1'>
              Use o campo acima para adicionar arquivos
            </p>
          )}
        </div>
      ) : processedAttachments.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>
          <Search className='mx-auto h-12 w-12 mb-4 text-gray-300' />
          <p className='text-sm'>
            Nenhum anexo encontrado com os filtros aplicados
          </p>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => updateListState({ searchTerm: '', filterBy: 'all' })}
            className='mt-2'
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'overflow-y-auto',
            listState.viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-2'
          )}
          style={{ maxHeight }}
        >
          {processedAttachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              onDownload={onDownload || (() => {})}
              onDelete={onDelete || (() => {})}
              showActions={showActions}
              variant={listState.viewMode === 'grid' ? 'grid' : 'list'}
              compact={listState.viewMode === 'list'}
            />
          ))}
        </div>
      )}

      {/* Rodapé com estatísticas filtradas */}
      {processedAttachments.length > 0 &&
        processedAttachments.length !== attachments.length && (
          <div className='text-xs text-gray-500 text-center pt-2 border-t'>
            Mostrando {processedAttachments.length} de {attachments.length}
            arquivo(s)
          </div>
        )}
    </div>
  );
}
