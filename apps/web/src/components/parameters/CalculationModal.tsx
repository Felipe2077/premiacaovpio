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
import { Textarea } from '@/components/ui/textarea'; // <<< ADICIONADO PARA JUSTIFICATIVA
import { useParametersData } from '@/hooks/useParametersData';
import {
  applyAdjustment,
  applyRounding,
  calculateAverage,
  getBestValue,
  getLastValue,
} from '@/utils/calculationUtils';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// Esta interface precisa ser atualizada no componente pai também
interface CalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculateData: {
    // <<< CERTIFIQUE-SE QUE ESTA ESTRUTURA É PASSADA CORRETAMENTE
    criterioId: number;
    criterioNome: string;
    setorId: number | null;
    setorNome: string;
    competitionPeriodId: number; // ID do período de competição para o DTO
    competitionPeriodDate: Date | string | number; // Data/string do período para buscar histórico (ex: '2025-05-01' ou new Date())
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

  // Assinaturas atualizadas para refletir os DTOs
  handlePreviewCalculation: (payload: {
    criterionId: number;
    competitionPeriodId: number;
    sectorId?: number | null;
    calculationMethod: string;
    adjustmentPercentage?: number;
    finalValue: number;
    wasRounded?: boolean;
    roundingMethod?: string;
    roundingDecimalPlaces?: number;
    saveAsDefault?: boolean;
    previewOnly: true;
  }) => Promise<void>; // Assumindo que pode ser async se a chamada API for direta aqui

  calculatedValuePreview: number | null; // Valor retornado pela API de preview

  handleApplyCalculation: (payload: {
    criterionId: number;
    competitionPeriodId: number;
    sectorId?: number | null;
    calculationMethod: string;
    adjustmentPercentage?: number;
    finalValueFrontend?: number; // O valor calculado pelo frontend, para log/metadados
    wasRounded?: boolean;
    roundingMethod?: string;
    roundingDecimalPlaces?: number;
    saveAsDefault?: boolean;
    previewOnly: false;
    justificativa: string;
  }) => Promise<void>; // Assumindo que pode ser async

  isLoadingSettings: boolean;
  isCalculatingPreview: boolean; // Renomeado para clareza (loading do preview)
  isApplying: boolean; // Novo estado para loading do "Aplicar"

  // fetchHistoricalData agora precisa de currentPeriodYYYYMM e count
  fetchHistoricalData: (
    criterionId: number,
    sectorId: number | null,
    currentPeriodYYYYMM: string,
    count: number
  ) => Promise<any[]>;
}

const formatDateToYearMonth = (dateInput: Date | string | number): string => {
  // Mantenha seus logs se quiser testar, ou remova-os depois
  const date = new Date(dateInput);

  if (isNaN(date.getTime())) {
    console.error('formatDateToYearMonth: Data inválida fornecida', dateInput);
    // Sua lógica de fallback atual, por exemplo:
    const now = new Date();
    const year = now.getUTCFullYear(); // Use UTC aqui também no fallback se apropriado
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  // Use os métodos UTC para obter o ano e o mês
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // getUTCMonth() também é 0-indexado

  const formatted = `${year}-${month}`;
  return formatted;
};

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
  calculatedValuePreview, // <<< USAR ESTE PARA O VALOR DA API DE PREVIEW
  handleApplyCalculation,
  isLoadingSettings,
  isCalculatingPreview, // <<< USAR ESTE PARA O LOADING DO PREVIEW
  isApplying, // <<< NOVO PROP PARA LOADING DO APPLY
  fetchHistoricalData,
}: CalculationModalProps) {
  const [historicalData, setHistoricalData] = useState<any[]>([]); // Tipar melhor se possível
  const [calculatedValueLocal, setCalculatedValueLocal] = useState<
    number | null
  >(null); // Valor calculado localmente no modal
  const [justification, setJustification] = useState(''); // <<< NOVO ESTADO PARA JUSTIFICATIVA
  const numDecimalPlacesForDisplay = parseInt(decimalPlaces, 10);

  const parametersData = useParametersData();

  // Recalcula o valor localmente
  const calculateFinalValueLocalHandler = (): number | null => {
    if (!historicalData || historicalData.length === 0 || !calculateData) {
      return null;
    }
    let baseValue;
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
        const criterion = parametersData.getCriterionById(
          calculateData.criterioId
        );
        baseValue = getBestValue(historicalData, 3, criterion?.sentido_melhor);
        break;
      default:
        baseValue = null;
    }
    if (baseValue === null) return null;
    const adjustedValue = applyAdjustment(baseValue, calculationAdjustment);
    return applyRounding(adjustedValue, roundingMethod, decimalPlaces);
  };

  // Efeito para carregar dados históricos quando o modal for aberto ou calculateData mudar
  useEffect(() => {
    const loadData = async () => {
      if (open && calculateData && calculateData.competitionPeriodDate) {
        setHistoricalData([]); // Limpa dados anteriores
        setCalculatedValueLocal(null);
        setJustification(''); // Limpa justificativa

        try {
          const currentPeriodForAPI = formatDateToYearMonth(
            calculateData.competitionPeriodDate
          );
          const dataFromApi = await fetchHistoricalData(
            calculateData.criterioId,
            calculateData.setorId,
            currentPeriodForAPI,
            6 // Buscar 6 meses de histórico
          );

          setHistoricalData(dataFromApi);
          // O cálculo do preview será acionado pelo próximo useEffect ao mudar historicalData ou parâmetros
        } catch (error) {
          console.error(
            '[CalculationModal] Erro ao carregar dados históricos:',
            error
          );
          setHistoricalData([]); // Garante que fique vazio
        }
      } else if (!open) {
        // Limpar estados quando o modal for fechado, se desejar
        setHistoricalData([]);
        setCalculatedValueLocal(null);
        setJustification('');
      }
    };
    loadData();
  }, [open, calculateData, fetchHistoricalData]); // fetchHistoricalData é uma prop e deve ser estável

  // Efeito para recalcular o valor local E CHAMAR O PREVIEW quando os parâmetros ou dados históricos mudarem
  useEffect(() => {
    if (open && calculateData && historicalData.length > 0) {
      const localValue = calculateFinalValueLocalHandler();

      setCalculatedValueLocal(localValue); // Atualiza o valor calculado localmente

      // Se o valor local for válido, chama o handlePreviewCalculation (que fará a chamada à API de preview)
      if (localValue !== null && calculateData.competitionPeriodId) {
        const payloadPreview = {
          criterionId: calculateData.criterioId,
          competitionPeriodId: calculateData.competitionPeriodId,
          sectorId: calculateData.setorId,
          calculationMethod: calculationMethod,
          adjustmentPercentage: parseFloat(calculationAdjustment) || 0,
          finalValue: localValue, // Envia o valor calculado pelo frontend
          wasRounded:
            roundingMethod !== 'none' &&
            roundingMethod !== '' &&
            parseInt(decimalPlaces, 10) >= 0,
          roundingMethod:
            roundingMethod === 'none' || roundingMethod === ''
              ? undefined
              : roundingMethod,
          roundingDecimalPlaces:
            roundingMethod === 'none' || roundingMethod === ''
              ? undefined
              : parseInt(decimalPlaces, 10) || 0,
          saveAsDefault: saveAsDefault,
          previewOnly: true as const,
        };

        handlePreviewCalculation(payloadPreview);
      } else {
      }
    } else if (
      open &&
      calculateData &&
      historicalData.length === 0 &&
      !isLoadingSettings
    ) {
      // Se não há dados históricos (e não está carregando settings), o valor local deve ser null
      // e o preview não deve ser chamado ou deve ser "limpo"
      setCalculatedValueLocal(null);
      // O pai deve limpar calculatedValuePreview se handlePreviewCalculation não for chamado
    }
  }, [
    open,
    calculateData,
    historicalData, // O preview depende dos dados carregados
    calculationMethod,
    calculationAdjustment,
    roundingMethod,
    decimalPlaces,
    saveAsDefault,
    handlePreviewCalculation, // Prop da função que chama a API
    isLoadingSettings,
  ]);

  // Handler para o botão "Aplicar Meta"
  const onInternalApplyCalculation = async () => {
    if (
      !calculateData ||
      !calculateData.competitionPeriodId ||
      calculatedValueLocal === null
    ) {
      alert('Não é possível aplicar a meta. Verifique os dados e o cálculo.');
      return;
    }
    if (!justification.trim()) {
      alert('A justificativa é obrigatória para aplicar a meta.');
      return;
    }

    const payloadApply = {
      criterionId: calculateData.criterioId,
      competitionPeriodId: calculateData.competitionPeriodId,
      sectorId: calculateData.setorId,
      calculationMethod: calculationMethod,
      adjustmentPercentage: parseFloat(calculationAdjustment) || 0,
      finalValueFrontend: calculatedValueLocal, // O valor que o frontend calculou localmente
      wasRounded:
        roundingMethod !== 'none' &&
        roundingMethod !== '' &&
        parseInt(decimalPlaces, 10) >= 0,
      roundingMethod:
        roundingMethod === 'none' || roundingMethod === ''
          ? undefined
          : roundingMethod,
      roundingDecimalPlaces:
        roundingMethod === 'none' || roundingMethod === ''
          ? undefined
          : parseInt(decimalPlaces, 10) || 0,
      saveAsDefault: saveAsDefault,
      previewOnly: false as const,
      justificativa: justification,
    };
    await handleApplyCalculation(payloadApply); // Chama a prop do pai
  };

  const showRoundingMethodSelector = parseInt(decimalPlaces, 10) === 0;
  const parsedPlaces = parseInt(decimalPlaces, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Calcular Meta Automaticamente</DialogTitle>
          <DialogDescription>
            Defina o método de cálculo para {calculateData?.criterioNome}
            {calculateData?.setorNome && calculateData.setorNome !== 'N/A'
              ? ` no setor ${calculateData.setorNome}`
              : ' (Geral)'}
            .
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
            {/* Método de Cálculo */}
            <div className='space-y-2'>
              <Label>Método de Cálculo</Label>
              <RadioGroup
                value={calculationMethod}
                onValueChange={setCalculationMethod}
                className='grid grid-cols-1 gap-2'
              >
                {/* ... Seus RadioGroupItems (media3, media6, ultimo, melhor3) ... */}
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

            {/* Ajuste */}
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

            {/* Arredondamento - Renderizado condicionalmente */}
            {showRoundingMethodSelector && (
              <div className='space-y-2'>
                <Label>Opções de Arredondamento</Label>
                <div className='grid grid-cols-1 gap-4'>
                  {/* Era grid-cols-2, agora só 1 se o input de casas foi removido */}
                  <div>
                    <Label htmlFor='roundingMethod' className='text-sm'>
                      Método
                    </Label>
                    <Select
                      value={roundingMethod}
                      onValueChange={setRoundingMethod}
                      // Opcional: desabilitar se só houver 'none' como opção real
                      // disabled={!showRoundingMethodSelector}
                    >
                      <SelectTrigger id='roundingMethod'>
                        <SelectValue placeholder='Método' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>Sem arredondar</SelectItem>
                        <SelectItem value='nearest'>Mais próximo</SelectItem>
                        <SelectItem value='up'>Para cima</SelectItem>
                        <SelectItem value='down'>Para baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* O Input para Casas Decimais já foi removido anteriormente */}
                </div>
              </div>
            )}

            {/* Salvar como Padrão */}
            <div className='flex items-center space-x-2 pt-2'>
              <Switch
                id='saveAsDefault'
                checked={saveAsDefault}
                onCheckedChange={setSaveAsDefault}
              />
              <Label htmlFor='saveAsDefault'>
                Salvar como configuração padrão
              </Label>
            </div>

            {/* Botão de Preview foi removido - Preview é automático */}
            {/* Exibição do Valor de Preview (vindo da API) */}
            {isCalculatingPreview && (
              <div className='flex justify-center items-center py-4 mt-4'>
                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                <span className='ml-2 text-sm text-primary'>
                  Calculando preview...
                </span>
              </div>
            )}
            {typeof calculatedValuePreview === 'number' &&
              !isCalculatingPreview && (
                <div className='mt-4 p-3 bg-primary/10 rounded-md border border-primary/30'>
                  <div className='text-sm font-medium mb-1 text-primary'>
                    Valor de Pré-visualização (API):
                  </div>
                  <div className='text-2xl font-bold text-primary'>
                    {calculatedValuePreview.toLocaleString('pt-BR', {
                      minimumFractionDigits: numDecimalPlacesForDisplay,
                      maximumFractionDigits: numDecimalPlacesForDisplay,
                    })}
                  </div>
                </div>
              )}

            {/* Campo de Justificativa */}
            <div className='space-y-2 pt-4'>
              <Label htmlFor='justification'>
                Justificativa (Obrigatória para Aplicar)
              </Label>
              <Textarea
                id='justification'
                placeholder='Explique o motivo para esta meta ou para as configurações de cálculo escolhidas...'
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                className={
                  !justification.trim() && isApplying ? 'border-red-500' : ''
                }
              />
              {!justification.trim() && isApplying && (
                <p className='text-xs text-red-600'>
                  Justificativa é obrigatória.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isApplying || isCalculatingPreview}
          >
            Cancelar
          </Button>
          <Button
            onClick={onInternalApplyCalculation}
            disabled={
              typeof calculatedValuePreview !== 'number' || // Precisa de um preview válido
              isCalculatingPreview || // Não aplicar se o preview estiver calculando
              isApplying // Não aplicar se já estiver aplicando
            }
          >
            {isApplying ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
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
