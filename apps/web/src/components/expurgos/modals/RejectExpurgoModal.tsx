// apps/web/src/components/expurgos/modals/RejectExpurgoModal.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema de validação
const rejectExpurgoSchema = z.object({
  justificativaRejeicao: z
    .string({ required_error: 'Justificativa é obrigatória' })
    .min(10, 'Justificativa deve ter pelo menos 10 caracteres')
    .max(1000, 'Justificativa muito longa'),
  observacoes: z.string().max(500, 'Observações muito longas').optional(),
});

type RejectExpurgoFormData = z.infer<typeof rejectExpurgoSchema>;

interface RejectExpurgoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expurgo: {
    id: number;
    valorSolicitado: number;
    criterioNome?: string;
    setorNome?: string;
    descricaoEvento: string;
    registradoPor?: {
      nome: string;
    };
  } | null;
  onReject: (data: RejectExpurgoFormData) => Promise<void>;
  isLoading?: boolean;
}

export default function RejectExpurgoModal({
  open,
  onOpenChange,
  expurgo,
  onReject,
  isLoading = false,
}: RejectExpurgoModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<RejectExpurgoFormData>({
    resolver: zodResolver(rejectExpurgoSchema),
    mode: 'onChange',
    defaultValues: {
      justificativaRejeicao: '',
      observacoes: '',
    },
  });

  const handleFormSubmit = async (data: RejectExpurgoFormData) => {
    try {
      await onReject(data);
      reset();
      onOpenChange(false);
    } catch (error) {
      // Erro será tratado pelo componente pai
      console.error('Erro ao rejeitar expurgo:', error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Reset form quando modal abre
  React.useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  if (!expurgo) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-red-600'>
            ❌ Rejeitar Expurgo #{expurgo.id}
          </DialogTitle>
          <DialogDescription>
            Forneça uma justificativa detalhada para a rejeição da solicitação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-6'>
          {/* Informações do Expurgo */}
          <div className='rounded-lg border p-4 bg-muted/50'>
            <h4 className='font-medium mb-2'>Informações da Solicitação</h4>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-muted-foreground'>Solicitante:</span>
                <p className='font-medium'>
                  {expurgo.registradoPor?.nome || 'N/A'}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>Valor Solicitado:</span>
                <p className='font-bold text-lg'>{expurgo.valorSolicitado}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>Critério:</span>
                <p className='font-medium'>{expurgo.criterioNome}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>Setor:</span>
                <p className='font-medium'>{expurgo.setorNome}</p>
              </div>
              <div className='col-span-2'>
                <span className='text-muted-foreground'>Descrição:</span>
                <p className='font-medium'>{expurgo.descricaoEvento}</p>
              </div>
            </div>
          </div>

          {/* Alerta de Impacto */}
          <div className='rounded-lg border border-red-200 p-4 bg-red-50'>
            <div className='flex items-start gap-2'>
              <div className='text-red-500 mt-1'>⚠️</div>
              <div className='text-red-800'>
                <h4 className='font-medium'>Impacto da Rejeição</h4>
                <p className='text-sm mt-1'>
                  Esta solicitação será rejeitada permanentemente e o valor não
                  será expurgado do cálculo da premiação. O solicitante será
                  notificado da decisão através da justificativa fornecida.
                </p>
              </div>
            </div>
          </div>

          {/* Justificativa */}
          <div className='space-y-2'>
            <Label htmlFor='justificativaRejeicao'>
              Motivo da Rejeição <span className='text-red-500'>*</span>
            </Label>
            <Textarea
              id='justificativaRejeicao'
              {...register('justificativaRejeicao')}
              placeholder='Explique detalhadamente os motivos pelos quais a solicitação está sendo rejeitada...'
              rows={4}
              className={errors.justificativaRejeicao ? 'border-red-500' : ''}
            />
            {errors.justificativaRejeicao && (
              <p className='text-sm text-red-500'>
                {errors.justificativaRejeicao.message}
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              Esta justificativa será enviada ao solicitante e registrada no
              histórico.
            </p>
          </div>

          {/* Observações */}
          <div className='space-y-2'>
            <Label htmlFor='observacoes'>Observações Internas</Label>
            <Textarea
              id='observacoes'
              {...register('observacoes')}
              placeholder='Observações internas para registro (não serão enviadas ao solicitante)...'
              rows={2}
              className={errors.observacoes ? 'border-red-500' : ''}
            />
            {errors.observacoes && (
              <p className='text-sm text-red-500'>
                {errors.observacoes.message}
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              Observações opcionais para registro interno.
            </p>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              variant='destructive'
              disabled={!isValid || isLoading}
              className='min-w-[120px]'
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Rejeitando...
                </>
              ) : (
                <>❌ Confirmar Rejeição</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
