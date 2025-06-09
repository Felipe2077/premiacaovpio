// apps/web/src/components/expurgos/actions/ExpurgoActions.tsx (ATUALIZADO)
'use client';

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
import {
  Check,
  Download,
  Eye,
  MoreHorizontal,
  Paperclip,
  X,
} from 'lucide-react';

interface ExpurgoActionsProps {
  expurgo: {
    id: number;
    status: string;
    valorSolicitado: number;
    valorAprovado?: number | null;
    criterioNome?: string;
    setorNome?: string;
    descricaoEvento: string;
    registradoPor?: {
      nome: string;
    };
    quantidadeAnexos?: number;
  };
  onApprove?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
  onViewAttachments?: () => void;
  onExportPdf?: () => void;
  currentUserRole?: 'DIRETOR' | 'GERENTE' | 'ADMIN';
  disabled?: boolean;
}

export default function ExpurgoActions({
  expurgo,
  onApprove,
  onReject,
  onViewDetails,
  onViewAttachments,
  onExportPdf,
  currentUserRole = 'ADMIN', // Mock - virá da autenticação
  disabled = false,
}: ExpurgoActionsProps) {
  const canApproveReject =
    expurgo.status === 'PENDENTE' &&
    (currentUserRole === 'DIRETOR' || currentUserRole === 'ADMIN');

  const hasAttachments = (expurgo.quantidadeAnexos || 0) > 0;

  // ================================
  // AÇÕES RÁPIDAS PARA STATUS PENDENTE
  // ================================

  if (canApproveReject && !disabled) {
    return (
      <div className='flex items-center gap-1'>
        {/* Botão Aprovar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              onClick={onApprove}
              className='h-8 w-8 p-0 hover:bg-green-50 hover:border-green-300'
            >
              <Check className='h-4 w-4 text-green-600' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aprovar Expurgo</TooltipContent>
        </Tooltip>

        {/* Botão Rejeitar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              onClick={onReject}
              className='h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300'
            >
              <X className='h-4 w-4 text-red-600' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rejeitar Expurgo</TooltipContent>
        </Tooltip>

        {/* 🆕 Botão de Anexos (se houver) */}
        {hasAttachments && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                onClick={onViewAttachments}
                className='h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300'
              >
                <Paperclip className='h-4 w-4 text-blue-600' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Ver {expurgo.quantidadeAnexos} anexo(s)
            </TooltipContent>
          </Tooltip>
        )}

        {/* Menu de ações adicionais */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className='mr-2 h-4 w-4' />
              Ver Detalhes
            </DropdownMenuItem>

            {/* 🆕 Ver anexos no menu se não foi mostrado como botão rápido */}
            {!hasAttachments && (
              <DropdownMenuItem onClick={onViewAttachments}>
                <Paperclip className='mr-2 h-4 w-4' />
                Gerenciar Anexos
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onExportPdf}>
              <Download className='mr-2 h-4 w-4' />
              Exportar PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // ================================
  // MENU PADRÃO PARA OUTROS STATUS
  // ================================

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='h-8 w-8 p-0'
          disabled={disabled}
        >
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {/* Ver detalhes */}
        <DropdownMenuItem onClick={onViewDetails}>
          <Eye className='mr-2 h-4 w-4' />
          Ver Detalhes
        </DropdownMenuItem>

        {/* 🆕 Anexos - sempre disponível */}
        <DropdownMenuItem onClick={onViewAttachments}>
          <Paperclip className='mr-2 h-4 w-4' />
          {hasAttachments ? (
            <>Ver Anexos ({expurgo.quantidadeAnexos})</>
          ) : expurgo.status === 'PENDENTE' ? (
            <>Adicionar Anexos</>
          ) : (
            <>Ver Anexos</>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Ações condicionais baseadas no status */}
        {expurgo.status === 'PENDENTE' && canApproveReject && (
          <>
            <DropdownMenuItem onClick={onApprove} className='text-green-600'>
              <Check className='mr-2 h-4 w-4' />
              Aprovar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject} className='text-red-600'>
              <X className='mr-2 h-4 w-4' />
              Rejeitar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Export PDF */}
        <DropdownMenuItem onClick={onExportPdf}>
          <Download className='mr-2 h-4 w-4' />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ================================
// 🆕 HOOK PARA GERENCIAR AÇÕES DE ANEXOS
// ================================

export function useExpurgoActions(expurgo: any) {
  const handleViewDetails = () => {
    console.log('Ver detalhes do expurgo:', expurgo.id);
    // TODO: Implementar modal de detalhes completos
  };

  const handleViewAttachments = () => {
    console.log('Ver anexos do expurgo:', expurgo.id);
    // Esta função será chamada pelo componente pai que gerencia o modal
  };

  const handleExportPdf = () => {
    console.log('Exportar PDF do expurgo:', expurgo.id);
    // TODO: Implementar exportação PDF com dados do expurgo + anexos
  };

  return {
    handleViewDetails,
    handleViewAttachments,
    handleExportPdf,
  };
}
