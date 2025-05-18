// apps/web/src/components/parameters/CalculationModal.tsx
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculateData: {
    criterioId: number;
    criterioNome: string;
    setorId: number;
    setorNome: string;
  } | null;
  calculationMethod: string;
  setCalculationMethod: (value: string) => void;
  calculationAdjustment: string;
  setCalculationAdjustment: (value: string) => void;
  handlePreviewCalculation: () => void;
  calculatedValue: number | null;
  handleApplyCalculation: () => void;
}

export default function CalculationModal({
  open,
  onOpenChange,
  calculateData,
  calculationMethod,
  setCalculationMethod,
  calculationAdjustment,
  setCalculationAdjustment,
  handlePreviewCalculation,
  calculatedValue,
  handleApplyCalculation,
}: CalculationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Calcular Meta Automaticamente</DialogTitle>
          <DialogDescription>
            Defina o método de cálculo para {calculateData?.criterioNome} no
            setor {calculateData?.setorNome}.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label>Método de Cálculo</Label>
            <RadioGroup
              value={calculationMethod}
              onValueChange={setCalculationMethod}
              className='grid grid-cols-1 gap-2'
            >
              <div className='flex items-center space-x-2 rounded-md border p-2'>
                <RadioGroupItem value='media3' id='media3' />
                <Label htmlFor='media3' className='flex-1 cursor-pointer'>
                  <div className='font-medium'>Média dos últimos 3 meses</div>
                  <div className='text-xs text-muted-foreground'>
                    Calcula a média dos valores realizados nos últimos 3 meses
                  </div>
                </Label>
              </div>

              <div className='flex items-center space-x-2 rounded-md border p-2'>
                <RadioGroupItem value='media6' id='media6' />
                <Label htmlFor='media6' className='flex-1 cursor-pointer'>
                  <div className='font-medium'>Média dos últimos 6 meses</div>
                  <div className='text-xs text-muted-foreground'>
                    Calcula a média dos valores realizados nos últimos 6 meses
                  </div>
                </Label>
              </div>

              <div className='flex items-center space-x-2 rounded-md border p-2'>
                <RadioGroupItem value='ultimo' id='ultimo' />
                <Label htmlFor='ultimo' className='flex-1 cursor-pointer'>
                  <div className='font-medium'>Último valor realizado</div>
                  <div className='text-xs text-muted-foreground'>
                    Utiliza o valor realizado no mês anterior
                  </div>
                </Label>
              </div>

              <div className='flex items-center space-x-2 rounded-md border p-2'>
                <RadioGroupItem value='melhor3' id='melhor3' />
                <Label htmlFor='melhor3' className='flex-1 cursor-pointer'>
                  <div className='font-medium'>
                    Melhor valor dos últimos 3 meses
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    Utiliza o melhor valor realizado nos últimos 3 meses
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='adjustment' className='text-right'>
              Ajuste (%)
            </Label>
            <div className='col-span-3 flex items-center gap-2'>
              <Input
                id='adjustment'
                type='number'
                step='0.1'
                value={calculationAdjustment}
                onChange={(e) => setCalculationAdjustment(e.target.value)}
                className='w-24'
              />
              <span className='text-sm text-muted-foreground'>
                (Use valores negativos para reduzir)
              </span>
            </div>
          </div>

          <div className='pt-2'>
            <Button
              variant='outline'
              onClick={handlePreviewCalculation}
              className='w-full'
            >
              Visualizar Cálculo
            </Button>
          </div>

          {calculatedValue !== null && (
            <div className='mt-4 p-3 bg-muted/20 rounded-md'>
              <div className='text-sm font-medium mb-1'>Valor calculado:</div>
              <div className='flex justify-between items-center'>
                <div className='text-2xl font-bold'>
                  {calculatedValue.toLocaleString('pt-BR')}
                </div>
                <div className='text-xs text-muted-foreground'>
                  {calculationMethod === 'media3' && 'Média de 3 meses'}
                  {calculationMethod === 'media6' && 'Média de 6 meses'}
                  {calculationMethod === 'ultimo' && 'Último mês'}
                  {calculationMethod === 'melhor3' && 'Melhor de 3 meses'}
                  {calculationAdjustment !== '0' &&
                    ` com ajuste de ${calculationAdjustment}%`}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApplyCalculation}
            disabled={calculatedValue === null}
          >
            Aplicar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
