// components/parameters/DeleteParameterModal.tsx
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ResultData } from '@/hooks/useParametersData';
import { DeleteParameterFormValues } from '@/hooks/useParametersMutations';
import { formatNumber, formatPercent } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';

interface DeleteParameterModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<DeleteParameterFormValues>;
  onSubmit: (data: DeleteParameterFormValues) => void;
  selectedItem: ResultData | null;
  isSubmitting: boolean;
}

export function DeleteParameterModal({
  isOpen,
  onOpenChange,
  form,
  onSubmit,
  selectedItem,
  isSubmitting,
}: DeleteParameterModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            Expirar Meta: {selectedItem?.criterioNome} -
            {selectedItem?.setorNome}
          </DialogTitle>
          <DialogDescription>
            Esta ação irá expirar a meta atual. Uma justificativa é obrigatória.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            {selectedItem && (
              <div className='p-4 bg-muted rounded-md'>
                <p>
                  <strong>Critério:</strong> {selectedItem.criterioNome}
                </p>
                <p>
                  <strong>Setor:</strong> {selectedItem.setorNome}
                </p>
                <p>
                  <strong>Meta Atual:</strong>
                  {formatNumber(selectedItem.valorMeta)}
                </p>
                <p>
                  <strong>Realizado:</strong>
                  {formatNumber(selectedItem.valorRealizado)}
                </p>
                <p>
                  <strong>% Atingimento:</strong>
                  {formatPercent(selectedItem.percentualAtingimento)}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name='justificativa'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificativa</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Informe o motivo da expiração...'
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                variant='destructive'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Expirando...' : 'Expirar Meta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
