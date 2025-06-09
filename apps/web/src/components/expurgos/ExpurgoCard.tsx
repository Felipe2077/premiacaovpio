// apps/web/src/components/expurgos/ExpurgoCard.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDate } from '@/lib/utils';
import { Check, MoreHorizontal, Paperclip, X } from 'lucide-react';

interface ExpurgoData {
  id: number;
  status: 'PENDENTE' | 'APROVADO' | 'APROVADO_PARCIAL' | 'REJEITADO';
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorSolicitado: number;
  valorAprovado?: number | null;
  sector?: { nome: string };
  criterion?: { nome: string; unidade_medida?: string };
  registradoPor?: { nome: string };
  quantidadeAnexos?: number;
  percentualAprovacao?: number | null;
  createdAt: Date | string;
}

interface ExpurgoCardProps {
  expurgo: ExpurgoData;
  onApprove?: () => void;
  onReject?: () => void;
  onViewAttachments?: () => void;
  disabled?: boolean;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'APROVADO':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'APROVADO_PARCIAL':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PENDENTE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'REJEITADO':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'APROVADO':
      return '✅';
    case 'APROVADO_PARCIAL':
      return '🔄';
    case 'PENDENTE':
      return '⏳';
    case 'REJEITADO':
      return '❌';
    default:
      return '❓';
  }
}

export default function ExpurgoCard({
  expurgo,
  onApprove,
  onReject,
  onViewAttachments,
  disabled = false,
}: ExpurgoCardProps) {
  const canApproveReject = expurgo.status === 'PENDENTE';

  return (
    <Card className='w-full hover:shadow-md transition-shadow'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <div className='flex items-center space-x-2'>
              <span className='text-sm font-semibold text-gray-600'>
                #{expurgo.id}
              </span>
              <Badge
                className={`text-xs px-2 py-1 ${getStatusColor(expurgo.status)}`}
              >
                {getStatusIcon(expurgo.status)}{' '}
                {expurgo.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className='text-sm text-gray-600'>
              {formatDate(expurgo.dataEvento)} • {expurgo.sector?.nome}
            </div>
          </div>

          {/* Ações rápidas */}
          {canApproveReject && !disabled && (
            <div className='flex items-center space-x-1'>
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
                <TooltipContent>Aprovar</TooltipContent>
              </Tooltip>

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
                <TooltipContent>Rejeitar</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Critério e Valores */}
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <h4 className='text-sm font-medium text-gray-700'>Critério</h4>
            <div className='mt-1'>
              <span className='text-sm'>
                {expurgo.criterion?.nome || 'N/A'}
              </span>
              {expurgo.criterion?.unidade_medida && (
                <Badge variant='outline' className='text-xs ml-2'>
                  {expurgo.criterion.unidade_medida}
                </Badge>
              )}
            </div>
          </div>

          <div>
            <h4 className='text-sm font-medium text-gray-700'>Valores</h4>
            <div className='mt-1 space-y-1'>
              <div className='text-sm'>
                <span className='text-gray-600'>Sol:</span>{' '}
                <span className='font-medium'>
                  {Math.abs(expurgo.valorSolicitado)}
                </span>
              </div>
              {expurgo.valorAprovado !== null &&
                expurgo.valorAprovado !== undefined && (
                  <div className='text-sm'>
                    <span className='text-gray-600'>Apr:</span>{' '}
                    <span className='font-medium text-green-600'>
                      {Math.abs(expurgo.valorAprovado)}
                    </span>
                    {expurgo.percentualAprovacao !== null && (
                      <span className='text-xs text-gray-500 ml-1'>
                        ({expurgo.percentualAprovacao?.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Justificativa */}
        <div>
          <h4 className='text-sm font-medium text-gray-700'>Justificativa</h4>
          <p className='text-sm text-gray-600 mt-1 leading-relaxed break-words'>
            {expurgo.justificativaSolicitacao}
          </p>
        </div>

        {/* Solicitante e Anexos */}
        <div className='flex items-center justify-between'>
          <div>
            <h4 className='text-xs font-medium text-gray-500'>Solicitante</h4>
            <div className='text-sm font-medium'>
              {expurgo.registradoPor?.nome || 'N/A'}
            </div>
            <div className='text-xs text-gray-500'>
              {formatDate(expurgo.createdAt, 'dd/MM/yy')}
            </div>
          </div>

          {/* Anexos */}
          {expurgo.quantidadeAnexos && expurgo.quantidadeAnexos > 0 ? (
            <Button
              variant='outline'
              size='sm'
              onClick={onViewAttachments}
              className='flex items-center space-x-2'
            >
              <Paperclip className='h-4 w-4' />
              <span>{expurgo.quantidadeAnexos} anexo(s)</span>
            </Button>
          ) : (
            <span className='text-xs text-gray-400'>Sem anexos</span>
          )}
        </div>

        {/* Ações adicionais para status não pendente */}
        {!canApproveReject && (
          <div className='flex items-center justify-end space-x-2 pt-2 border-t'>
            {expurgo.quantidadeAnexos && expurgo.quantidadeAnexos > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onViewAttachments}
                className='text-blue-600'
              >
                <Paperclip className='h-4 w-4 mr-1' />
                Ver Anexos
              </Button>
            )}

            <Button variant='ghost' size='sm' className='text-gray-600'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
