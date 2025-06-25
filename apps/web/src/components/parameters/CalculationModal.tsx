// apps/web/src/components/parameters/CalculationModalFixed.tsx
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Loader2, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface CalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculateData: {
    criterioId: number;
    criterioNome: string;
    setorId: number | null;
    setorNome: string;
    competitionPeriodId?: number; // ✅ ADICIONAR CAMPO OPCIONAL
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
  handlePreviewCalculation: (payload: any) => void;
  calculatedValuePreview: number | null;
  handleApplyCalculation: (payload: any) => void;
  isLoadingSettings: boolean;
  isCalculatingPreview: boolean;
  isApplying: boolean;
  fetchHistoricalData: (
    criterionId: number,
    sectorId: number | null
  ) => Promise<any[]>;
  // ✅ ADICIONAR DADOS DO CRITÉRIO
  uniqueCriteria: any[]; // Para buscar as casas decimais do critério
}

export default function CalculationModalFixed({
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
  calculatedValuePreview,
  handleApplyCalculation,
  isLoadingSettings,
  isCalculatingPreview,
  isApplying,
  fetchHistoricalData,
  uniqueCriteria, // ✅ ADICIONAR PROP
}: CalculationModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ✅ BUSCAR CASAS DECIMAIS DO CRITÉRIO ATUAL (COM DEBUG)
  const criterionDecimalPlaces = useMemo(() => {
    if (!calculateData?.criterioId || !uniqueCriteria?.length) {
      console.log('🔍 [DECIMAL DEBUG] Sem dados para buscar critério');
      return 2; // Fallback
    }

    const criterion = uniqueCriteria.find(
      (c) => c.id === calculateData.criterioId
    );
    console.log('🔍 [DECIMAL DEBUG] Critério encontrado:', criterion);
    console.log(
      '🔍 [DECIMAL DEBUG] casasDecimaisPadrao do critério:',
      criterion?.casasDecimaisPadrao
    );
    console.log(
      '🔍 [DECIMAL DEBUG] Tipo da propriedade:',
      typeof criterion?.casasDecimaisPadrao
    );

    const decimalPlaces = criterion?.casasDecimaisPadrao ?? 2;
    console.log('🔍 [DECIMAL DEBUG] Valor final usado:', decimalPlaces);

    return decimalPlaces;
  }, [calculateData?.criterioId, uniqueCriteria]);

  // ✅ ATUALIZAR CASAS DECIMAIS QUANDO CRITÉRIO MUDAR (SEM LOOP INFINITO)
  useEffect(() => {
    if (
      open &&
      calculateData?.criterioId &&
      criterionDecimalPlaces !== undefined
    ) {
      const currentDecimalPlaces = parseInt(decimalPlaces) || 0;
      if (currentDecimalPlaces !== criterionDecimalPlaces) {
        setDecimalPlaces(criterionDecimalPlaces.toString());
      }
    }
  }, [open, calculateData?.criterioId, criterionDecimalPlaces]); // ✅ REMOVER setDecimalPlaces das dependências

  // ✅ FUNÇÃO PARA CRIAR PAYLOAD DE CÁLCULO
  const createCalculationPayload = useCallback(() => {
    if (!calculateData) return null;

    // ✅ CALCULAR O VALOR BASEADO NO MÉTODO E DADOS HISTÓRICOS
    let calculatedValue = 0;

    // Para preview, vamos usar um valor base simples ou calcular dos dados históricos
    if (historicalData && historicalData.length > 0) {
      const validData = historicalData.filter(
        (item) => item.status === 'FECHADO' && item.valorRealizado !== null
      );

      if (validData.length > 0) {
        switch (calculationMethod) {
          case 'media3':
            const last3 = validData.slice(0, 3);
            calculatedValue =
              last3.reduce((sum, item) => sum + item.valorRealizado, 0) /
              last3.length;
            break;
          case 'media6':
            const last6 = validData.slice(0, 6);
            calculatedValue =
              last6.reduce((sum, item) => sum + item.valorRealizado, 0) /
              last6.length;
            break;
          case 'ultimo':
            calculatedValue = validData[0].valorRealizado;
            break;
          case 'melhor3':
            const best3 = validData
              .slice(0, 3)
              .sort((a, b) => a.valorRealizado - b.valorRealizado);
            calculatedValue = best3[0]?.valorRealizado || 0;
            break;
          default:
            calculatedValue = validData[0]?.valorRealizado || 0;
        }
      }
    }

    // Aplicar ajuste percentual
    const adjustmentPercent = parseFloat(calculationAdjustment) || 0;
    if (adjustmentPercent !== 0) {
      calculatedValue = calculatedValue * (1 + adjustmentPercent / 100);
    }

    // Aplicar arredondamento usando as casas decimais do critério
    const decimals = criterionDecimalPlaces; // ✅ USAR AS CASAS DECIMAIS DO CRITÉRIO
    if (roundingMethod !== 'none' && decimals >= 0) {
      const factor = Math.pow(10, decimals);
      switch (roundingMethod) {
        case 'up':
          calculatedValue = Math.ceil(calculatedValue * factor) / factor;
          break;
        case 'down':
          calculatedValue = Math.floor(calculatedValue * factor) / factor;
          break;
        case 'nearest':
        default:
          calculatedValue = Math.round(calculatedValue * factor) / factor;
          break;
      }
    }

    return {
      criterionId: calculateData.criterioId,
      sectorId: calculateData.setorId,
      competitionPeriodId: calculateData.competitionPeriodId || 1,
      calculationMethod,
      adjustmentPercentage: parseFloat(calculationAdjustment) || 0,
      finalValue: calculatedValue, // ✅ ADICIONAR O VALOR CALCULADO
      wasRounded: roundingMethod !== 'none',
      roundingMethod,
      roundingDecimalPlaces: criterionDecimalPlaces, // ✅ USAR AS CASAS DECIMAIS DO CRITÉRIO
      saveAsDefault,
      justificativa:
        justificativa ||
        `Cálculo automático usando ${getMethodLabel(calculationMethod)}`,
      previewOnly: true,
    };
  }, [
    calculateData,
    calculationMethod,
    calculationAdjustment,
    roundingMethod,
    criterionDecimalPlaces, // ✅ USAR criterionDecimalPlaces AO INVÉS DE decimalPlaces
    saveAsDefault,
    justificativa,
    historicalData,
  ]);

  // ✅ EXECUTAR PREVIEW AUTOMATICAMENTE QUANDO PARÂMETROS MUDAREM
  useEffect(() => {
    if (!open || !calculateData || !historicalData.length) return;

    // Delay para evitar chamadas excessivas
    const timeoutId = setTimeout(() => {
      const payload = createCalculationPayload();
      if (payload && calculationMethod) {
        handlePreviewCalculation(payload);
      }
    }, 300); // 300ms de delay

    return () => clearTimeout(timeoutId);
  }, [
    open,
    calculateData?.criterioId,
    calculateData?.setorId,
    calculationMethod,
    calculationAdjustment,
    roundingMethod,
    criterionDecimalPlaces, // ✅ USAR criterionDecimalPlaces
    historicalData.length, // ✅ USAR APENAS O LENGTH PARA EVITAR LOOP
    createCalculationPayload,
    handlePreviewCalculation,
  ]);

  // ✅ CARREGAR DADOS HISTÓRICOS
  useEffect(() => {
    if (open && calculateData && fetchHistoricalData) {
      setIsLoadingHistory(true);
      fetchHistoricalData(calculateData.criterioId, calculateData.setorId)
        .then((data) => {
          setHistoricalData(data || []);
        })
        .catch((error) => {
          console.error('Erro ao carregar dados históricos:', error);
          setHistoricalData([]);
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    }
  }, [open, calculateData, fetchHistoricalData]);

  // ✅ FUNÇÃO AUXILIAR PARA LABELS DOS MÉTODOS
  const getMethodLabel = (method: string) => {
    const labels = {
      media3: 'Média dos 3 últimos períodos',
      media6: 'Média dos 6 últimos períodos',
      media12: 'Média dos 12 últimos períodos',
      ultimo: 'Último período',
      penultimo: 'Penúltimo período',
      antepenultimo: 'Antepenúltimo período',
      melhor3: 'Melhor dos 3 últimos períodos',
      manual: 'Valor manual',
    };
    return labels[method] || method;
  };

  // ✅ HANDLERS
  const handleMethodChange = (newMethod: string) => {
    console.log('📊 Método alterado para:', newMethod);
    setCalculationMethod(newMethod);
  };

  const handleAdjustmentChange = (value: string) => {
    console.log('📈 Ajuste alterado para:', value);
    setCalculationAdjustment(value);
  };

  const handleApply = () => {
    if (!calculateData || !justificativa.trim()) {
      toast.error('Justificativa é obrigatória para aplicar o cálculo.');
      return;
    }

    const payload = {
      ...createCalculationPayload(),
      previewOnly: false,
      justificativa,
    };

    handleApplyCalculation(payload);
  };

  // ✅ LIMPAR ESTADO AO FECHAR
  useEffect(() => {
    if (!open) {
      setJustificativa('');
      setHistoricalData([]);
    }
  }, [open]);

  if (!calculateData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Calculator className='h-5 w-5' />
            Calcular Meta Automaticamente
          </DialogTitle>
          <DialogDescription>
            Defina o método de cálculo para {calculateData.criterioNome} no
            setor {calculateData.setorNome}.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* ✅ SEÇÃO DE MÉTODO DE CÁLCULO */}
          <div className='space-y-4'>
            <Label className='text-base font-medium'>Método de Cálculo</Label>
            <RadioGroup
              value={calculationMethod}
              onValueChange={handleMethodChange}
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='media3' id='media3' />
                <Label htmlFor='media3' className='flex-1'>
                  <div className='font-medium'>Média dos últimos 3 meses</div>
                  <div className='text-sm text-muted-foreground'>
                    Calcula a média dos valores realizados nos últimos 3 meses
                  </div>
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='media6' id='media6' />
                <Label htmlFor='media6' className='flex-1'>
                  <div className='font-medium'>Média dos últimos 6 meses</div>
                  <div className='text-sm text-muted-foreground'>
                    Calcula a média dos valores realizados nos últimos 6 meses
                  </div>
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='ultimo' id='ultimo' />
                <Label htmlFor='ultimo' className='flex-1'>
                  <div className='font-medium'>Último valor realizado</div>
                  <div className='text-sm text-muted-foreground'>
                    Utiliza o valor realizado no mês anterior
                  </div>
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='melhor3' id='melhor3' />
                <Label htmlFor='melhor3' className='flex-1'>
                  <div className='font-medium'>
                    Melhor valor dos últimos 3 meses
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    Utiliza o melhor valor realizado nos últimos 3 meses
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* ✅ SEÇÃO DE AJUSTE */}
          <div className='space-y-2'>
            <Label htmlFor='adjustment'>Ajuste (%)</Label>
            <Input
              id='adjustment'
              type='number'
              value={calculationAdjustment}
              onChange={(e) => handleAdjustmentChange(e.target.value)}
              placeholder='0'
              className='w-32'
            />
            <p className='text-sm text-muted-foreground'>
              (Use valores negativos para reduzir)
            </p>
          </div>

          {/* ✅ SEÇÃO DE CONFIGURAÇÕES AVANÇADAS */}
          <div className='space-y-4'>
            <Label className='text-base font-medium'>
              Configurações Avançadas
            </Label>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='rounding'>Arredondamento</Label>
                <Select
                  value={roundingMethod}
                  onValueChange={setRoundingMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Sem arredondamento</SelectItem>
                    <SelectItem value='nearest'>Mais próximo</SelectItem>
                    <SelectItem value='up'>Para cima</SelectItem>
                    <SelectItem value='down'>Para baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='decimals'>Casas Decimais</Label>
                <Input
                  id='decimals'
                  type='number'
                  value={criterionDecimalPlaces} // ✅ MOSTRAR VALOR DO CRITÉRIO
                  disabled // ✅ DESABILITAR EDIÇÃO
                  min='0'
                  max='4'
                  className='bg-muted'
                />
                <p className='text-xs text-muted-foreground'>
                  Definido automaticamente pelo critério
                </p>
              </div>
            </div>

            <div className='flex items-center space-x-2'>
              <Switch
                id='save-default'
                checked={saveAsDefault}
                onCheckedChange={setSaveAsDefault}
              />
              <Label htmlFor='save-default'>
                Salvar como configuração padrão
              </Label>
            </div>
          </div>

          {/* ✅ PREVIEW DO RESULTADO */}
          <div className='bg-muted/50 p-4 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <TrendingUp className='h-4 w-4' />
              <Label className='font-medium'>Pré-visualização do Cálculo</Label>
            </div>

            {isCalculatingPreview ? (
              <div className='flex items-center gap-2 text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>Calculando...</span>
              </div>
            ) : calculatedValuePreview !== null ? (
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary' className='text-lg px-3 py-1'>
                    {calculatedValuePreview.toLocaleString('pt-BR', {
                      minimumFractionDigits: criterionDecimalPlaces, // ✅ USAR CASAS DECIMAIS DO CRITÉRIO
                      maximumFractionDigits: criterionDecimalPlaces, // ✅ USAR CASAS DECIMAIS DO CRITÉRIO
                    })}
                  </Badge>
                  <span className='text-sm text-muted-foreground'>
                    Método: {getMethodLabel(calculationMethod)}
                  </span>
                </div>
                {parseFloat(calculationAdjustment) !== 0 && (
                  <p className='text-sm text-muted-foreground'>
                    Ajuste aplicado: {calculationAdjustment}%
                  </p>
                )}
                {/* ✅ MOSTRAR INFO DAS CASAS DECIMAIS */}
                <p className='text-xs text-muted-foreground'>
                  Casas decimais: {criterionDecimalPlaces} (padrão do critério{' '}
                  {calculateData?.criterioNome})
                </p>
              </div>
            ) : (
              <p className='text-muted-foreground'>
                Selecione um método de cálculo para ver a pré-visualização
              </p>
            )}
          </div>

          {/* ✅ JUSTIFICATIVA */}
          <div className='space-y-2'>
            <Label htmlFor='justificativa'>
              Justificativa (Obrigatória para Aplicar)
            </Label>
            <Textarea
              id='justificativa'
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder='Explique o motivo para esta meta ou para as configurações de cálculo escolhidas...'
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              isApplying ||
              !justificativa.trim() ||
              calculatedValuePreview === null
            }
          >
            {isApplying ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                Aplicando...
              </>
            ) : (
              'Aplicar Meta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
