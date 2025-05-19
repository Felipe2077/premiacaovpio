Revisão do Passo 9: Atualizar o Componente CalculationModal
Você está absolutamente certo. O componente CalculationModal recebe suas props do componente pai, que deve ser o parameters/page.tsx. Vamos revisar e corrigir a implementação.

Passo 9 (Revisado): Atualizar a Página de Parâmetros
Vamos atualizar o componente pai que gerencia o estado e a lógica para o modal de cálculo.

Arquivo: apps/web/src/app/parameters/page.tsx (ou o arquivo que contém a página de parâmetros)
tsx
Copiar

// Importar os novos tipos e hooks
import { CalculateParameterDto, CriterionCalculationSettingsDto } from '@sistema-premiacao/shared-types';
import { useParameters } from '@/hooks/useParameters';
import CalculationModal from '@/components/parameters/CalculationModal';
import { useState, useEffect } from 'react';

// Adicionar novos estados para o modal de cálculo
const [calculationModalOpen, setCalculationModalOpen] = useState(false);
const [calculateData, setCalculateData] = useState<{
  criterioId: number;
  criterioNome: string;
  setorId: number | null;
  setorNome: string;
} | null>(null);
const [calculationMethod, setCalculationMethod] = useState<string>('media3');
const [calculationAdjustment, setCalculationAdjustment] = useState<string>('0');
const [roundingMethod, setRoundingMethod] = useState<string>('nearest');
const [decimalPlaces, setDecimalPlaces] = useState<string>('0');
const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);
const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(false);
const [isCalculating, setIsCalculating] = useState<boolean>(false);

// Obter os métodos do hook useParameters
const {
  parameters,
  isLoadingParameters,
  createParameter,
  updateParameter,
  calculateParameterValue,
  fetchCriterionCalculationSettings
} = useParameters(selectedPeriod?.mesAno || '', selectedSectorId, selectedCriterionId, false);

// Função para abrir o modal de cálculo
const handleOpenCalculationModal = (criterionId: number, sectorId: number | null, criterionName: string) => {
  // Encontrar o nome do setor
  const sectorName = sectorId === null 
    ? 'Geral' 
    : sectors.find(s => s.id === sectorId)?.nome || `Setor ${sectorId}`;
  
  setCalculateData({
    criterioId: criterionId,
    criterioNome: criterionName,
    setorId: sectorId,
    setorNome: sectorName
  });
  
  // Resetar estados
  setCalculatedValue(null);
  
  // Carregar configurações padrão para este critério
  loadDefaultSettings(criterionId);
  
  // Abrir o modal
  setCalculationModalOpen(true);
};

// Função para carregar configurações padrão
const loadDefaultSettings = async (criterionId: number) => {
  setIsLoadingSettings(true);
  try {
    const settings = await fetchCriterionCalculationSettings(criterionId);
    
    // Aplicar configurações carregadas
    if (settings) {
      setCalculationMethod(settings.calculationMethod || 'media3');
      setCalculationAdjustment(settings.adjustmentPercentage?.toString() || '0');
      setRoundingMethod(settings.roundingMethod || 'nearest');
      setDecimalPlaces(settings.roundingDecimalPlaces?.toString() || '0');
    }
  } catch (error) {
    console.error('Erro ao carregar configurações de cálculo:', error);
    toast.error('Não foi possível carregar as configurações padrão.');
    
    // Manter valores padrão em caso de erro
    setCalculationMethod('media3');
    setCalculationAdjustment('0');
    setRoundingMethod('nearest');
    setDecimalPlaces('0');
  } finally {
    setIsLoadingSettings(false);
  }
};

// Função para calcular a prévia
const handlePreviewCalculation = async () => {
  if (!calculateData) return;
  
  setIsCalculating(true);
  try {
    // Buscar dados históricos
    // Na implementação real, você pode buscar esses dados da API
    // ou usar os dados já disponíveis no frontend
    
    // Simulação simplificada - na implementação real, você usaria dados históricos reais
    const baseValue = 100; // Valor base simulado
    
    // Aplicar ajuste percentual
    let adjustedValue = baseValue;
    const adjustmentPercent = parseFloat(calculationAdjustment);
    if (!isNaN(adjustmentPercent)) {
      adjustedValue = baseValue * (1 + adjustmentPercent / 100);
    }
    
    // Aplicar arredondamento
    let finalValue = adjustedValue;
    const decimalPlacesNum = parseInt(decimalPlaces, 10) || 0;
    const multiplier = Math.pow(10, decimalPlacesNum);
    
    switch (roundingMethod) {
      case 'nearest':
        finalValue = Math.round(adjustedValue * multiplier) / multiplier;
        break;
      case 'up':
        finalValue = Math.ceil(adjustedValue * multiplier) / multiplier;
        break;
      case 'down':
        finalValue = Math.floor(adjustedValue * multiplier) / multiplier;
        break;
    }
    
    // Atualizar o valor calculado
    setCalculatedValue(finalValue);
  } catch (error) {
    console.error('Erro ao calcular prévia:', error);
    toast.error('Erro ao calcular prévia. Verifique os dados e tente novamente.');
  } finally {
    setIsCalculating(false);
  }
};

// Função para aplicar o cálculo
const handleApplyCalculation = async () => {
  if (!calculateData || calculatedValue === null || !selectedPeriod) return;
  
  try {
    // Preparar dados para a API
    const calculateDto: CalculateParameterDto = {
      criterionId: calculateData.criterioId,
      sectorId: calculateData.setorId,
      competitionPeriodId: selectedPeriod.id,
      calculationMethod: calculationMethod as any,
      adjustmentPercentage: parseFloat(calculationAdjustment) || 0,
      wasRounded: true, // Sempre consideramos que houve arredondamento
      roundingMethod: roundingMethod as any,
      roundingDecimalPlaces: parseInt(decimalPlaces, 10) || 0,
      finalValue: calculatedValue,
      saveAsDefault,
      justificativa: `Meta calculada automaticamente usando ${calculationMethod} com ajuste de ${calculationAdjustment}%.`
    };
    
    // Chamar a API para calcular
    const result = await calculateParameterValue(calculateDto);
    
    // Criar o parâmetro com o valor calculado
    await createParameter({
      nomeParametro: `META_${calculateData.criterioNome.toUpperCase().replace(/\s+/g, '_')}`,
      valor: result.value.toString(),
      dataInicioEfetivo: selectedPeriod.dataInicio || new Date().toISOString().split('T')[0],
      criterionId: calculateData.criterioId,
      sectorId: calculateData.setorId,
      competitionPeriodId: selectedPeriod.id,
      justificativa: `Meta calculada automaticamente usando ${calculationMethod} com ajuste de ${calculationAdjustment}%.`,
      metadata: result.metadata
    });
    
    // Fechar o modal e exibir mensagem de sucesso
    setCalculationModalOpen(false);
    toast.success('Meta calculada e aplicada com sucesso!');
    
    // Atualizar a lista de parâmetros
    refetchParameters();
  } catch (error) {
    console.error('Erro ao aplicar cálculo:', error);
    toast.error('Erro ao aplicar o cálculo. Verifique os dados e tente novamente.');
  }
};

// Renderizar o modal de cálculo
return (
  <>
    {/* Outros componentes da página */}
    
    <CalculationModal
      open={calculationModalOpen}
      onOpenChange={setCalculationModalOpen}
      calculateData={calculateData}
      calculationMethod={calculationMethod}
      setCalculationMethod={setCalculationMethod}
      calculationAdjustment={calculationAdjustment}
      setCalculationAdjustment={setCalculationAdjustment}
      roundingMethod={roundingMethod}
      setRoundingMethod={setRoundingMethod}
      decimalPlaces={decimalPlaces}
      setDecimalPlaces={setDecimalPlaces}
      saveAsDefault={saveAsDefault}
      setSaveAsDefault={setSaveAsDefault}
      handlePreviewCalculation={handlePreviewCalculation}
      calculatedValue={calculatedValue}
      handleApplyCalculation={handleApplyCalculation}
      isLoadingSettings={isLoadingSettings}
      isCalculating={isCalculating}
    />
  </>
);
Passo 9.1: Atualizar o Componente CalculationModal
Agora, vamos atualizar o componente CalculationModal para receber as novas props.

Arquivo: apps/web/src/components/parameters/CalculationModal.tsx
tsx
Copiar

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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

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
  isLoadingSettings?: boolean;
  isCalculating?: boolean;
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
  calculatedValue,
  handleApplyCalculation,
  isLoadingSettings = false,
  isCalculating = false,
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

        {isLoadingSettings ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando configurações...</span>
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

            {/* Opções de arredondamento */}
            <div className='space-y-2'>
              <Label>Arredondamento</Label>
              <RadioGroup
                value={roundingMethod}
                onValueChange={setRoundingMethod}
                className='grid grid-cols-3 gap-2'
              >
                <div className='flex items-center space-x-2 rounded-md border p-2'>
                  <RadioGroupItem value='nearest' id='nearest' />
                  <Label htmlFor='nearest' className='cursor-pointer'>
                    Mais próximo
                  </Label>
                </div>
                <div className='flex items-center space-x-2 rounded-md border p-2'>
                  <RadioGroupItem value='up' id='up' />
                  <Label htmlFor='up' className='cursor-pointer'>
                    Para cima
                  </Label>
                </div>
                <div className='flex items-center space-x-2 rounded-md border p-2'>
                  <RadioGroupItem value='down' id='down' />
                  <Label htmlFor='down' className='cursor-pointer'>
                    Para baixo
                  </Label>
                </div>
              </RadioGroup>
              
              <div className='grid grid-cols-4 items-center gap-4 mt-2'>
                <Label htmlFor='decimalPlaces' className='text-right'>
                  Casas decimais
                </Label>
                <Input
                  id='decimalPlaces'
                  type='number'
                  min='0'
                  max='5'
                  value={decimalPlaces}
                  onChange={(e) => setDecimalPlaces(e.target.value)}
                  className='col-span-3'
                />
              </div>
              
              <div className='flex items-center space-x-2 mt-2'>
                <Checkbox
                  id='saveAsDefault'
                  checked={saveAsDefault}
                  onCheckedChange={(checked) => setSaveAsDefault(checked === true)}
                />
                <Label htmlFor='saveAsDefault' className='cursor-pointer'>
                  Salvar como configuração padrão para este critério
                </Label>
              </div>
            </div>

            <div className='pt-2'>
              <Button
                variant='outline'
                onClick={handlePreviewCalculation}
                className='w-full'
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
            onClick={handleApplyCalculation}
            disabled={calculatedValue === null || isCalculating}
          >
            Aplicar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}