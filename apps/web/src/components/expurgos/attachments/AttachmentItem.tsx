// apps/web/src/components/expurgos/attachments/AttachmentItem.tsx

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  AttachmentEntity,
  FileType,
  getFileTypeFromMimeType,
} from '@sistema-premiacao/shared-types';
import {
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Image,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

// ================================
// TIPOS E INTERFACES
// ================================

interface AttachmentItemProps {
  attachment: AttachmentEntity;
  onDownload: (attachment: AttachmentEntity) => void;
  onDelete: (attachment: AttachmentEntity) => void;
  onPreview?: (attachment: AttachmentEntity) => void;
  showActions?: boolean;
  compact?: boolean;
  variant?: 'default' | 'list' | 'grid';
  className?: string;
}

// ================================
// UTILITÁRIOS
// ================================

function getFileIcon(mimeType: string, size: 'sm' | 'md' | 'lg' = 'md') {
  const fileType = getFileTypeFromMimeType(mimeType);
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  }[size];

  const iconProps = { className: sizeClass };

  switch (fileType) {
    case FileType.IMAGE:
      return (
        <Image
          {...iconProps}
          className={cn(iconProps.className, 'text-green-600')}
        />
      );
    case FileType.PDF:
      return (
        <FileText
          {...iconProps}
          className={cn(iconProps.className, 'text-red-600')}
        />
      );
    case FileType.SPREADSHEET:
      return (
        <FileSpreadsheet
          {...iconProps}
          className={cn(iconProps.className, 'text-emerald-600')}
        />
      );
    case FileType.DOCUMENT:
      return (
        <FileText
          {...iconProps}
          className={cn(iconProps.className, 'text-blue-600')}
        />
      );
    default:
      return (
        <File
          {...iconProps}
          className={cn(iconProps.className, 'text-gray-600')}
        />
      );
  }
}

function getFileTypeLabel(mimeType: string): string {
  const fileType = getFileTypeFromMimeType(mimeType);

  const labels = {
    [FileType.IMAGE]: 'Imagem',
    [FileType.PDF]: 'PDF',
    [FileType.DOCUMENT]: 'Documento',
    [FileType.SPREADSHEET]: 'Planilha',
    [FileType.UNKNOWN]: 'Arquivo',
  };

  return labels[fileType];
}

function formatUploadDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ================================
// COMPONENTE PRINCIPAL
// ================================

export default function AttachmentItem({
  attachment,
  onDownload,
  onDelete,
  onPreview,
  showActions = true,
  compact = false,
  variant = 'default',
  className,
}: AttachmentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // ================================
  // HANDLERS
  // ================================

  const handleDownload = () => {
    onDownload(attachment);
  };

  const handlePreview = () => {
    if (onPreview && (attachment.isImage || attachment.isPdf)) {
      onPreview(attachment);
    } else {
      // Fallback para download se não pode fazer preview
      handleDownload();
    }
  };

  const handleDelete = async () => {
    if (
      confirm(
        `Tem certeza que deseja remover o arquivo "${attachment.originalFileName}"?`
      )
    ) {
      setIsDeleting(true);
      try {
        onDelete(attachment);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // ================================
  // VARIAÇÕES DE LAYOUT
  // ================================

  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'group relative rounded-lg border p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
          className
        )}
      >
        {/* Thumbnail/Icon */}
        <div className='flex flex-col items-center space-y-2'>
          <div className='flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700'>
            {getFileIcon(attachment.mimeType, 'lg')}
          </div>

          {/* Nome do arquivo (truncado) */}
          <Tooltip>
            <TooltipTrigger>
              <p className='text-sm font-medium text-center line-clamp-2 w-full'>
                {attachment.originalFileName}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p>{attachment.originalFileName}</p>
            </TooltipContent>
          </Tooltip>

          {/* Metadados */}
          <div className='text-xs text-gray-500 space-y-1 text-center'>
            <p>{attachment.formattedSize}</p>
            <p>{getFileTypeLabel(attachment.mimeType)}</p>
          </div>
        </div>

        {/* Ações (aparecem no hover) */}
        {showActions && (
          <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={handlePreview}>
                  <Eye className='mr-2 h-4 w-4' />
                  {attachment.isImage || attachment.isPdf
                    ? 'Visualizar'
                    : 'Abrir'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className='mr-2 h-4 w-4' />
                  Baixar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className='text-red-600 focus:text-red-600'
                  disabled={isDeleting}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  {isDeleting ? 'Removendo...' : 'Remover'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'list' || compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
          className
        )}
      >
        {/* Informações principais */}
        <div className='flex items-center space-x-3 flex-1 min-w-0'>
          {/* Ícone */}
          <div className='flex-shrink-0'>
            {getFileIcon(attachment.mimeType)}
          </div>

          {/* Detalhes */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center space-x-2'>
              <Tooltip>
                <TooltipTrigger>
                  <p className='text-sm font-medium truncate'>
                    {attachment.originalFileName}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{attachment.originalFileName}</p>
                </TooltipContent>
              </Tooltip>

              <Badge variant='secondary' className='text-xs'>
                {getFileTypeLabel(attachment.mimeType)}
              </Badge>
            </div>

            {!compact && (
              <div className='flex items-center space-x-4 mt-1 text-xs text-gray-500'>
                <span>{attachment.formattedSize}</span>
                <span>•</span>
                <span>
                  Enviado por {attachment.uploadedBy?.nome || 'Usuário'}
                </span>
                <span>•</span>
                <span>{formatUploadDate(attachment.uploadedAt)}</span>
              </div>
            )}

            {compact && (
              <p className='text-xs text-gray-500'>
                {attachment.formattedSize} •
                {formatUploadDate(attachment.uploadedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Ações */}
        {showActions && (
          <div className='flex items-center space-x-1 flex-shrink-0'>
            {(attachment.isImage || attachment.isPdf) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handlePreview}
                    className='h-8 w-8 p-0'
                  >
                    <Eye className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visualizar</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleDownload}
                  className='h-8 w-8 p-0'
                >
                  <Download className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Baixar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remover</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    );
  }

  // Variant 'default' - formato card expandido
  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
        className
      )}
    >
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center space-x-3 flex-1 min-w-0'>
          <div className='flex-shrink-0'>
            {getFileIcon(attachment.mimeType, 'lg')}
          </div>

          <div className='flex-1 min-w-0'>
            <Tooltip>
              <TooltipTrigger>
                <h4 className='text-sm font-medium truncate'>
                  {attachment.originalFileName}
                </h4>
              </TooltipTrigger>
              <TooltipContent>
                <p>{attachment.originalFileName}</p>
              </TooltipContent>
            </Tooltip>

            <div className='flex items-center space-x-2 mt-1'>
              <Badge variant='secondary'>
                {getFileTypeLabel(attachment.mimeType)}
              </Badge>
              <span className='text-xs text-gray-500'>
                {attachment.formattedSize}
              </span>
            </div>
          </div>
        </div>

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={handlePreview}>
                <Eye className='mr-2 h-4 w-4' />
                {attachment.isImage || attachment.isPdf
                  ? 'Visualizar'
                  : 'Abrir'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className='mr-2 h-4 w-4' />
                Baixar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className='text-red-600 focus:text-red-600'
                disabled={isDeleting}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                {isDeleting ? 'Removendo...' : 'Remover'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Metadados */}
      <div className='text-xs text-gray-500 space-y-1'>
        <div className='flex items-center justify-between'>
          <span>Enviado por: {attachment.uploadedBy?.nome || 'Usuário'}</span>
          <span>{formatUploadDate(attachment.uploadedAt)}</span>
        </div>

        {attachment.description && (
          <div className='mt-2'>
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              <strong>Descrição:</strong> {attachment.description}
            </p>
          </div>
        )}
      </div>

      {/* Ações principais */}
      {showActions && (
        <div className='flex items-center space-x-2 pt-2 border-t'>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePreview}
            className='flex-1'
          >
            <Eye className='mr-2 h-4 w-4' />
            {attachment.isImage || attachment.isPdf ? 'Visualizar' : 'Abrir'}
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={handleDownload}
            className='flex-1'
          >
            <Download className='mr-2 h-4 w-4' />
            Baixar
          </Button>
        </div>
      )}
    </div>
  );
}
