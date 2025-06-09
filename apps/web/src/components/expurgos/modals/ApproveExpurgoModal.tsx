// apps/web/src/components/expurgos/modals/ApproveExpurgoModal.tsx (CORRIGIDA)
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// ===================================
// SCHEMAS E TYPES
// ===================================

const approveExpurgoSchema = z.object({
  valorAprovado: z
    .number({ required_error: 'Valor aprovado é obrigatório' })
    .min(0.01, 'Valor deve ser maior que zero')
    .max(999999, 'Valor muito alto'),
  justificativaAprovacao: z
    .string({ required_error: 'Justificativa é obrigatória' })
    .min(10, 'Justificativa deve ter pelo menos 10 caracteres')
    .max(1000, 'Justificativa muito longa'),
  observacoes: z.string().max(500, 'Observações muito longas').optional(),
});

type ApproveExpurgoFormData = z.infer<typeof approveExpurgoSchema>;

interface ExpurgoData {
  id: number;
  status: string;
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorSolicitado: number;
  valorAprovado?: number | null;
  sector?: {
    id: number;
    nome: string;
  };
  criterion?: {
    id: number;
    nome: string;
    unidade_medida?: string;
  };
  registradoPor?: {
    id: number;
    nome: string;
    email: string;
  };
  createdAt: Date | string;
}

interface ApproveExpurgoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expurgo: ExpurgoData | null;
  onApprove: (data: ApproveExpurgoFormData) => Promise<void>;
  isLoading?: boolean;
}

// ===================================
// COMPONENTE PRINCIPAL
// ===================================

export default function ApproveExpurgoModal({
  open,
  onOpenChange,
  expurgo,
  onApprove,
  isLoading = false,
}: ApproveExpurgoModalProps) {
  // ===================================
  // FORM SETUP
  // ===================================

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    setValue,
  } = useForm<ApproveExpurgoFormData>({
    resolver: zodResolver(approveExpurgoSchema),
    mode: 'onChange',
    defaultValues: {
      valorAprovado: 0,
      justificativaAprovacao: '',
      observacoes: '',
    },
  });

  // ===================================
  // WATCHERS E EFFECTS
  // ===================================

  const valorAprovado = watch('valorAprovado');
  const valorSolicitado = expurgo?.valorSolicitado || 0;

  // Resetar form quando modal abrir/fechar
  useEffect(() => {
    if (open && expurgo) {
      // Pré-preencher com valor solicitado
      setValue('valorAprovado', expurgo.valorSolicitado);
      setValue('justificativaAprovacao', '');
      setValue('observacoes', '');
    } else {
      reset();
    }
  }, [open, expurgo, setValue, reset]);

  // ===================================
  // CÁLCULOS
  // ===================================

  const percentualAprovacao =
    valorSolicitado > 0 ? (valorAprovado / valorSolicitado) * 100 : 0;

  const isAprovacaoParcial =
    percentualAprovacao < 100 && percentualAprovacao > 0;
  const isAprovacaoTotal = percentualAprovacao >= 100;

  // ===================================
  // HANDLERS
  // ===================================

  const handleFormSubmit = async (data: ApproveExpurgoFormData) => {
    try {
      await onApprove(data);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao aprovar expurgo:', error);
      // Toast de erro será mostrado pelo componente pai
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  // ===================================
  // RENDER HELPERS
  // ===================================

  const getApprovalBadge = () => {
    if (valorAprovado <= 0) return null;

    if (isAprovacaoTotal) {
      return (
        <Badge className='bg-green-100 text-green-800 border-green-200'>
          ✅ Aprovação Total (100%)
        </Badge>
      );
    }

    if (isAprovacaoParcial) {
      return (
        <Badge className='bg-yellow-100 text-yellow-800 border-yellow-200'>
          <AlertTriangle className='h-3 w-3 mr-1' />
          Aprovação Parcial ({percentualAprovacao.toFixed(0)}%)
        </Badge>
      );
    }

    return null;
  };

  // ===================================
  // RENDER PRINCIPAL
  // ===================================

  if (!expurgo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Check className='h-5 w-5 text-green-600' />
            Aprovar Expurgo #{expurgo.id}
          </DialogTitle>
          <DialogDescription>
            Defina o valor aprovado e forneça uma justificativa detalhada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-6'>
          {/* ===================================
              INFORMAÇÕES DA SOLICITAÇÃO
              =================================== */}

          <div className='rounded-lg border bg-gray-50 p-4'>
            <h3 className='font-medium text-gray-900 mb-3'>
              Informações da Solicitação
            </h3>

            <div className='grid grid-cols-2 gap-4 text-sm'>
              {/* Critério */}
              <div>
                <Label className='text-gray-600 font-medium'>Critério:</Label>
                <div className='mt-1'>
                  <span className='font-semibold text-gray-900'>
                    {expurgo.criterion?.nome || 'N/A'}
                  </span>
                  {expurgo.criterion?.unidade_medida && (
                    <Badge variant='outline' className='ml-2 text-xs'>
                      {expurgo.criterion.unidade_medida}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Setor */}
              <div>
                <Label className='text-gray-600 font-medium'>Setor:</Label>
                <div className='mt-1'>
                  <span className='font-semibold text-gray-900'>
                    {expurgo.sector?.nome || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Data do Evento */}
              <div>
                <Label className='text-gray-600 font-medium'>
                  Data do Evento:
                </Label>
                <div className='mt-1 font-semibold text-gray-900'>
                  {formatDate(expurgo.dataEvento)}
                </div>
              </div>

              {/* Solicitante */}
              <div>
                <Label className='text-gray-600 font-medium'>
                  Solicitante:
                </Label>
                <div className='mt-1 font-semibold text-gray-900'>
                  {expurgo.registradoPor?.nome || 'N/A'}
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className='mt-4'>
              <Label className='text-gray-600 font-medium'>Descrição:</Label>
              <p className='mt-1 text-gray-900 text-sm leading-relaxed'>
                {expurgo.descricaoEvento}
              </p>
            </div>

            {/* Valor Solicitado */}
            <div className='mt-4'>
              <Label className='text-gray-600 font-medium'>
                Valor Solicitado:
              </Label>
              <div className='mt-1'>
                <span className='text-lg font-bold text-blue-600'>
                  {expurgo.valorSolicitado.toLocaleString()}
                </span>
                {expurgo.criterion?.unidade_medida && (
                  <span className='text-gray-600 ml-1'>
                    {expurgo.criterion.unidade_medida}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ===================================
              FORMULÁRIO DE APROVAÇÃO
              =================================== */}

          {/* Valor Aprovado */}
          <div className='space-y-2'>
            <Label htmlFor='valorAprovado' className='text-sm font-medium'>
              Valor Aprovado <span className='text-red-500'>*</span>
            </Label>
            <Input
              id='valorAprovado'
              type='number'
              step='0.01'
              min='0'
              max={expurgo.valorSolicitado * 1.1} // Permitir até 10% a mais
              {...register('valorAprovado', { valueAsNumber: true })}
              className={errors.valorAprovado ? 'border-red-500' : ''}
              placeholder='Ex: 8.50'
            />
            {errors.valorAprovado && (
              <p className='text-sm text-red-600'>
                {errors.valorAprovado.message}
              </p>
            )}
          </div>

          {/* Badge de status da aprovação */}
          {getApprovalBadge() && (
            <div className='flex justify-center'>{getApprovalBadge()}</div>
          )}

          {/* Justificativa */}
          <div className='space-y-2'>
            <Label
              htmlFor='justificativaAprovacao'
              className='text-sm font-medium'
            >
              Justificativa da Aprovação <span className='text-red-500'>*</span>
            </Label>
            <Textarea
              id='justificativaAprovacao'
              {...register('justificativaAprovacao')}
              className={errors.justificativaAprovacao ? 'border-red-500' : ''}
              placeholder='Ex: Aprovado após análise da documentação apresentada...'
              rows={4}
            />
            {errors.justificativaAprovacao && (
              <p className='text-sm text-red-600'>
                {errors.justificativaAprovacao.message}
              </p>
            )}
          </div>

          {/* Observações Adicionais */}
          <div className='space-y-2'>
            <Label htmlFor='observacoes' className='text-sm font-medium'>
              Observações Adicionais
            </Label>
            <Textarea
              id='observacoes'
              {...register('observacoes')}
              placeholder='Observações opcionais sobre a decisão...'
              rows={3}
            />
            {errors.observacoes && (
              <p className='text-sm text-red-600'>
                {errors.observacoes.message}
              </p>
            )}
          </div>

          {/* ===================================
              ACTIONS
              =================================== */}

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>

            <Button
              type='submit'
              disabled={!isValid || isLoading}
              className={
                isAprovacaoParcial
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Processando...
                </>
              ) : (
                <>
                  <Check className='mr-2 h-4 w-4' />
                  {isAprovacaoParcial ? 'Aprovar Parcialmente' : 'Aprovar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
