// src/pages/ParametersPage.tsx
'use client';
import CalculationModal from '@/components/parameters/CalculationModal';
import ParametersMatrix from '@/components/parameters/ParametersMatrix';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useParametersData } from '@/hooks/useParametersData';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ParametersPage() {
  // Estados para gerenciar a seleção de período e modais
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [createData, setCreateData] = useState<any>(null);
  const [newMetaValue, setNewMetaValue] = useState<string>('');
  // Estados adicionais
  const [calculateModalOpen, setCalculateModalOpen] = useState(false);
  const [calculationMethod, setCalculationMethod] = useState<string>('media3');
  const [calculationAdjustment, setCalculationAdjustment] =
    useState<string>('0');
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);
  const [calculateData, setCalculateData] = useState<{
    criterioId: number;
    criterioNome: string;
    setorId: number | null;
    setorNome: string;
  } | null>(null);
  const [roundingMethod, setRoundingMethod] = useState<string>('nearest');
  const [decimalPlaces, setDecimalPlaces] = useState<string>('0');
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Obter dados do hook
  const {
    periods,
    uniqueCriteria,
    resultsBySector,
    isLoading,
    fetchResults,
    fetchAllData,
    getPeriodById,
    refetchResults,
    parameters,
    isLoadingParameters,
    createParameter,
    updateParameter,
    calculateParameterValue,
    fetchCriterionCalculationSettings,
  } = useParametersData();

  // Função para abrir o modal de cálculo
  const handleOpenCalculationModal = (
    criterionId: number,
    sectorId: number | null,
    criterionName: string
  ) => {
    // Verificar se está na fase de planejamento
    const isPlanejamentoActive = selectedPeriod?.status === 'PLANEJAMENTO';

    // Só permitir cálculo em fase de planejamento
    if (!isPlanejamentoActive) {
      toast.error('Metas só podem ser calculadas na fase de planejamento');
      return;
    }

    // Encontrar o nome do setor
    const sectorName =
      sectorId === null
        ? 'Geral'
        : Object.values(resultsBySector).find(
            (s: any) => s.setorId === sectorId || s.id === sectorId
          )?.setorNome || `Setor ${sectorId}`;

    setCalculateData({
      criterioId: criterionId,
      criterioNome: criterionName,
      setorId: sectorId,
      setorNome: sectorName,
    });

    // Resetar estados
    setCalculatedValue(null);

    // Carregar configurações padrão para este critério
    loadDefaultSettings(criterionId);

    // Abrir o modal
    setCalculationModalOpen(true);
  };

  // Adicionar esta função se não existir
  const refetchParameters = async () => {
    if (selectedPeriod?.mesAno) {
      await fetchResults(selectedPeriod.mesAno);
    }
  };
  // Função para carregar configurações padrão
  // Função para carregar configurações padrão
  const loadDefaultSettings = async (criterionId: number) => {
    setIsLoadingSettings(true);
    try {
      const settings = await fetchCriterionCalculationSettings(criterionId);

      // Aplicar configurações carregadas
      if (settings) {
        setCalculationMethod(settings.calculationMethod || 'media3');
        setCalculationAdjustment(
          settings.adjustmentPercentage?.toString() || '0'
        );
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

  // Efeito para selecionar o período ativo por padrão quando os períodos são carregados
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      // Tentar encontrar um período ativo
      const activePeriod = periods.find((p) => p.status === 'ATIVA');

      if (activePeriod) {
        setSelectedPeriodId(activePeriod.id);
        console.log('Período ativo selecionado automaticamente:', activePeriod);
      } else {
        // Se não houver período ativo, selecionar o primeiro da lista
        setSelectedPeriodId(periods[0].id);
        console.log('Primeiro período selecionado:', periods[0]);
      }
    }
  }, [periods, selectedPeriodId]);

  // Obter o período selecionado com base no ID
  const selectedPeriod = selectedPeriodId
    ? getPeriodById(selectedPeriodId)
    : null;

  // Efeito para carregar os resultados quando o período selecionado mudar
  useEffect(() => {
    if (selectedPeriod?.mesAno) {
      console.log('Carregando resultados para período:', selectedPeriod.mesAno);
      fetchResults(selectedPeriod.mesAno);
    }
  }, [selectedPeriod, fetchResults]);

  // Manipuladores de eventos
  const handlePeriodChange = (value: string) => {
    const periodId = parseInt(value);
    setSelectedPeriodId(periodId);
    console.log('Período alterado para:', periodId);
  };

  const handleRefresh = async () => {
    if (selectedPeriod?.mesAno) {
      console.log('Atualizando dados para período:', selectedPeriod.mesAno);
      await fetchAllData(selectedPeriod.mesAno);
      toast.success('Dados atualizados com sucesso!');
    }
  };

  const handleEditMeta = (item: any) => {
    console.log('Editar meta:', item);
    setEditData(item);
    setNewMetaValue(item.valorMeta?.toString() || '');
    setEditModalOpen(true);
  };

  const handleCreateMeta = (
    criterionId: number,
    sectorId: number,
    criterionName: string
  ) => {
    console.log('Criar meta:', { criterionId, sectorId, criterionName });
    setCreateData({
      criterioId: criterionId,
      criterioNome: criterionName,
      setorId: sectorId,
      setorNome:
        Object.values(resultsBySector).find((s: any) => s.setorId === sectorId)
          ?.setorNome || '',
    });
    setNewMetaValue('');
    setCreateModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editData || !newMetaValue) return;

    try {
      // Aqui você implementaria a chamada à API para salvar a meta editada
      console.log('Salvando meta editada:', {
        ...editData,
        valorMeta: parseFloat(newMetaValue),
      });

      // Simulação de uma chamada à API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Recarregar os resultados após a edição
      if (selectedPeriod?.mesAno) {
        await refetchResults(selectedPeriod.mesAno);
      }

      toast.success('Meta atualizada com sucesso!');
      setEditModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao atualizar meta. Tente novamente.');
    }
  };

  const handleSaveCreate = async () => {
    if (!createData || !newMetaValue) return;

    try {
      // Aqui você implementaria a chamada à API para criar a meta
      console.log('Criando nova meta:', {
        ...createData,
        valorMeta: parseFloat(newMetaValue),
      });

      // Simulação de uma chamada à API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Recarregar os resultados após a criação
      if (selectedPeriod?.mesAno) {
        await refetchResults(selectedPeriod.mesAno);
      }

      toast.success('Meta criada com sucesso!');
      setCreateModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      toast.error('Erro ao criar meta. Tente novamente.');
    }
  };

  // Log para debug
  console.log('Dados para renderização:', {
    totalPeriods: periods.length,
    selectedPeriodId,
    selectedPeriod,
    uniqueCriteriaCount: uniqueCriteria?.length || 0,
    resultsBySectorCount: resultsBySector
      ? Object.keys(resultsBySector).length
      : 0,
    isLoading,
  });

  // Função para visualizar o cálculo
  const handlePreviewCalculation = async () => {
    if (!calculateData || !selectedPeriod) return;

    setIsCalculating(true);
    try {
      // Preparar dados para a API
      const calculateDto = {
        criterionId: calculateData.criterioId,
        sectorId: calculateData.setorId,
        competitionPeriodId: selectedPeriod.id,
        calculationMethod,
        adjustmentPercentage: parseFloat(calculationAdjustment) || 0,
        wasRounded: true,
        roundingMethod,
        roundingDecimalPlaces: parseInt(decimalPlaces, 10) || 0,
        finalValue: calculatedValue,
        previewOnly: true, // Indicar que é apenas uma prévia
        saveAsDefault: false, // Não salvar como padrão na prévia
        justificativa: `Prévia de cálculo usando ${calculationMethod} com ajuste de ${calculationAdjustment}%.`,
      };

      // Chamar a API para calcular a prévia
      const response = await fetch('/api/parameters/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calculateDto),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Erro ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      // Atualizar o valor calculado
      setCalculatedValue(result.value);
    } catch (error) {
      console.error('Erro ao calcular prévia:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao calcular prévia. Verifique os dados e tente novamente.'
      );
    } finally {
      setIsCalculating(false);
    }
  };

  // Função para aplicar o cálculo
  const handleApplyCalculation = async () => {
    if (!calculateData || calculatedValue === null || !selectedPeriod) return;

    try {
      // Preparar dados para a API
      const calculateDto = {
        criterionId: calculateData.criterioId,
        sectorId: calculateData.setorId,
        competitionPeriodId: selectedPeriod.id,
        calculationMethod,
        adjustmentPercentage: parseFloat(calculationAdjustment) || 0,
        wasRounded: true,
        roundingMethod,
        roundingDecimalPlaces: parseInt(decimalPlaces, 10) || 0,
        finalValue: calculatedValue, // Adicionar o valor calculado
        previewOnly: false, // Indicar que deve salvar o resultado
        saveAsDefault, // Salvar como padrão se solicitado
        justificativa: `Meta calculada automaticamente usando ${calculationMethod} com ajuste de ${calculationAdjustment}%.`,
      };

      // Chamar a API para calcular e salvar
      const response = await fetch('/api/parameters/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calculateDto),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Erro ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      // Fechar o modal e exibir mensagem de sucesso
      setCalculationModalOpen(false);
      toast.success('Meta calculada e aplicada com sucesso!');

      // Atualizar a lista de parâmetros
      if (selectedPeriod?.mesAno) {
        await fetchResults(selectedPeriod.mesAno);
      }
    } catch (error) {
      console.error('Erro ao aplicar cálculo:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao aplicar o cálculo. Verifique os dados e tente novamente.'
      );
    }
  };
  // Função para buscar dados históricos (implementação real)
  const fetchHistoricalData = async (
    criterionId: number,
    sectorId: number | null
  ) => {
    try {
      // Verificar se temos um período selecionado
      if (!selectedPeriod?.id) {
        throw new Error('Nenhum período selecionado');
      }

      // Fazer a requisição para a API
      const response = await fetch(
        `/api/criteria/${criterionId}/historical-data?sectorId=${sectorId}&periodId=${selectedPeriod.id}`
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar dados históricos:', error);
      throw error;
    }
  };

  // Função simulada para obter dados históricos
  // Em um cenário real, você substituiria isso por uma chamada à API
  const getHistoricalData = async (criterioId: number, setorId: number) => {
    // Simulando uma chamada à API com dados fictícios
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Dados fictícios para demonstração
    return [
      { periodo: 'Abr/2023', valor: 450 },
      { periodo: 'Mar/2023', valor: 462 },
      { periodo: 'Fev/2023', valor: 470 },
      { periodo: 'Jan/2023', valor: 455 },
      { periodo: 'Dez/2022', valor: 448 },
      { periodo: 'Nov/2022', valor: 460 },
    ];
  };

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Parâmetros</h1>
          <p className='text-muted-foreground'>
            Gerencie as metas e parâmetros para cada setor e critério.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Select
            value={selectedPeriodId?.toString() || ''}
            onValueChange={handlePeriodChange}
            disabled={isLoading || periods.length === 0}
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Selecione um período' />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.id.toString()}>
                  {period.mesAno} - {period.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant='outline'
            size='icon'
            onClick={handleRefresh}
            disabled={isLoading || !selectedPeriod}
          >
            {isLoading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <RefreshCw className='h-4 w-4' />
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className='flex justify-center items-center h-64'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      ) : !selectedPeriod ? (
        <Card>
          <CardContent className='flex justify-center items-center h-64'>
            <p className='text-muted-foreground'>
              Selecione um período para visualizar os parâmetros.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Matriz de Parâmetros - {selectedPeriod.mesAno}
              <span className='ml-2 text-sm font-normal text-muted-foreground'>
                ({selectedPeriod.status})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParametersMatrix
              uniqueCriteria={uniqueCriteria}
              resultsBySector={resultsBySector}
              onEdit={handleEditMeta}
              onCreate={handleCreateMeta}
              onCalculate={handleOpenCalculationModal}
              isLoading={isLoading}
              periodoAtual={selectedPeriod}
            />
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Editar Meta</DialogTitle>
            <DialogDescription>
              Atualize o valor da meta para {editData?.criterioNome} no setor{' '}
              {editData?.setorNome}.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='meta' className='text-right'>
                Meta
              </Label>
              <Input
                id='meta'
                type='number'
                step='0.01'
                value={newMetaValue}
                onChange={(e) => setNewMetaValue(e.target.value)}
                className='col-span-3'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Criar Meta</DialogTitle>
            <DialogDescription>
              Defina o valor da meta para {createData?.criterioNome} no setor{' '}
              {createData?.setorNome}.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='newMeta' className='text-right'>
                Meta
              </Label>
              <Input
                id='newMeta'
                type='number'
                step='0.01'
                value={newMetaValue}
                onChange={(e) => setNewMetaValue(e.target.value)}
                className='col-span-3'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCreate}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Cálculo Automático */}

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
        fetchHistoricalData={fetchHistoricalData} // Adicionar esta prop
      />
    </div>
  );
}
