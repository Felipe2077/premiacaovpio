// src/components/parameters/CalculationModal.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useParametersData } from '@/hooks/useParametersData';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculateData: {
    criterioId: number;
    criterioNome: string;
    setorId: number | null;
    setorNome: string;
  } | null;
  calculationMethod: string;
  setCalculationMethod: (value: string) => void;
  calculationAdjustment: string;
  setCalculationAdjustment: (value: string) => void;
  roundingMethod: string;
  setRoundingMethod: (value: string) => void;
  decimalPlaces: string;
  setDecimalPlaces: (value: string) => void;
  saveAsDefault: boolean;
  setSaveAsDefault: (value: boolean) => void;
  handlePreviewCalculation: () => void;
  calculatedValue: number | null;
  handleApplyCalculation: () => void;
  isLoadingSettings: boolean;
  isCalculating: boolean;
  fetchHistoricalData: (
    criterionId: number,
    sectorId: number | null
  ) => Promise<any[]>;
}

export default function CalculationModal({
  open,
  onOpenChange,
  calculateData,
  calculationMethod,
  setCalculationMethod,
  calculationAdjustment,
  setCalculationAdjustment,
  roundingMethod,
  setRoundingMethod,
  decimalPlaces,
  setDecimalPlaces,
  saveAsDefault,
  setSaveAsDefault,
  handlePreviewCalculation,
  handleApplyCalculation,
  isLoadingSettings,
  isCalculating,
  fetchHistoricalData,
}: CalculationModalProps) {
  const [historicalData, setHistoricalData] = useState([]);
  const [calculatedValue, setCalculatedValue] = useState(null);

  // Inicializar o hook useParametersData
  const parametersData = useParametersData();

  // Funções de cálculo
  const calculateAverage = (data, count) => {
    const validData = data
      .filter(
        (item) => item.status === 'FECHADO' && item.valorRealizado !== null
      )
      .slice(0, count);

    if (validData.length === 0) return null;

    const sum = validData.reduce((acc, item) => acc + item.valorRealizado, 0);
    return sum / validData.length;
  };

  const getLastValue = (data) => {
    const validData = data.filter(
      (item) => item.status === 'FECHADO' && item.valorRealizado !== null
    );

    return validData.length > 0 ? validData[0].valorRealizado : null;
  };

  const getBestValue = (data, count, betterDirection) => {
    const validData = data
      .filter(
        (item) => item.status === 'FECHADO' && item.valorRealizado !== null
      )
      .slice(0, count);

    if (validData.length === 0) return null;

    if (betterDirection === 'MAIOR') {
      return Math.max(...validData.map((item) => item.valorRealizado));
    } else {
      return Math.min(...validData.map((item) => item.valorRealizado));
    }
  };

  const applyAdjustment = (value, adjustmentPercentage) => {
    return value * (1 + adjustmentPercentage / 100);
  };

  const applyRounding = (value, roundingMethod, decimalPlaces) => {
    const multiplier = Math.pow(10, decimalPlaces);

    switch (roundingMethod) {
      case 'nearest':
        return Math.round(value * multiplier) / multiplier;
      case 'up':
        return Math.ceil(value * multiplier) / multiplier;
      case 'down':
        return Math.floor(value * multiplier) / multiplier;
      default:
        return value;
    }
  };

  const calculateFinalValue = () => {
    if (!historicalData || historicalData.length === 0) {
      return null;
    }

    let baseValue;

    // Calcular valor base de acordo com o método selecionado
    switch (calculationMethod) {
      case 'media3':
        baseValue = calculateAverage(historicalData, 3);
        break;
      case 'media6':
        baseValue = calculateAverage(historicalData, 6);
        break;
      case 'ultimo':
        baseValue = getLastValue(historicalData);
        break;
      case 'melhor3':
        let betterDirection = 'MENOR';
        try {
          const criterion = parametersData.getCriterionById(
            calculateData.criterioId
          );
          betterDirection = criterion?.sentido_melhor || 'MENOR';
        } catch (error) {
          console.warn(
            'Erro ao obter direção do critério, usando MENOR como padrão:',
            error
          );
        }
        baseValue = getBestValue(historicalData, 3, betterDirection);
        break;
      default:
        baseValue = null;
    }

    if (baseValue === null) {
      return null;
    }

    // Aplicar ajuste percentual
    const adjustedValue = applyAdjustment(
      baseValue,
      parseFloat(calculationAdjustment) || 0
    );

    // Aplicar arredondamento
    const finalValue = applyRounding(
      adjustedValue,
      roundingMethod,
      parseInt(decimalPlaces, 10) || 0
    );

    return finalValue;
  };

  // Efeito para carregar dados históricos quando o modal for aberto
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (open && calculateData) {
        try {
          const data = await fetchHistoricalData(
            calculateData.criterioId,
            calculateData.setorId
          );
          console.log('Dados históricos carregados:', data);
          setHistoricalData(data);

          // Calcular o valor inicial
          const initialValue = calculateFinalValue();
          setCalculatedValue(initialValue);
        } catch (error) {
          console.error('Erro ao carregar dados históricos:', error);
        }
      }
    };

    loadHistoricalData();
  }, [open, calculateData, fetchHistoricalData]);

  // Efeito para recalcular o valor quando as configurações mudarem
  useEffect(() => {
    if (historicalData && historicalData.length > 0) {
      const value = calculateFinalValue();
      setCalculatedValue(value);
    }
  }, [
    calculationMethod,
    calculationAdjustment,
    roundingMethod,
    decimalPlaces,
    historicalData,
  ]);

  // Função wrapper para handlePreviewCalculation
  const onPreviewCalculation = () => {
    // Atualizar o valor calculado antes de chamar a função do pai
    const value = calculateFinalValue();
    setCalculatedValue(value);

    // Chamar a função do pai
    handlePreviewCalculation();
  };

  // Função wrapper para handleApplyCalculation
  const onApplyCalculation = () => {
    // Atualizar o valor calculado antes de chamar a função do pai
    const value = calculateFinalValue();
    setCalculatedValue(value);

    // Chamar a função do pai
    handleApplyCalculation();
  };

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

        {isLoadingSettings ? (
          <div className='flex justify-center items-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <span className='ml-2 text-muted-foreground'>
              Carregando configurações...
            </span>
          </div>
        ) : (
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

            <div className='space-y-2'>
              <Label>Opções de Arredondamento</Label>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='roundingMethod' className='text-sm'>
                    Método
                  </Label>
                  <Select
                    value={roundingMethod}
                    onValueChange={setRoundingMethod}
                  >
                    <SelectTrigger id='roundingMethod'>
                      <SelectValue placeholder='Método de arredondamento' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='nearest'>Mais próximo</SelectItem>
                      <SelectItem value='up'>Para cima</SelectItem>
                      <SelectItem value='down'>Para baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor='decimalPlaces' className='text-sm'>
                    Casas decimais
                  </Label>
                  <Input
                    id='decimalPlaces'
                    type='number'
                    min='0'
                    max='5'
                    value={decimalPlaces}
                    onChange={(e) => setDecimalPlaces(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className='flex items-center space-x-2 pt-2'>
              <Switch
                id='saveAsDefault'
                checked={saveAsDefault}
                onCheckedChange={setSaveAsDefault}
              />
              <Label htmlFor='saveAsDefault'>
                Salvar como configuração padrão para este critério
              </Label>
            </div>

            <div className='pt-2'>
              <Button
                variant='outline'
                onClick={onPreviewCalculation}
                className='w-full'
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Calculando...
                  </>
                ) : (
                  'Visualizar Cálculo'
                )}
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
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onApplyCalculation}
            disabled={calculatedValue === null || isCalculating}
          >
            Aplicar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
