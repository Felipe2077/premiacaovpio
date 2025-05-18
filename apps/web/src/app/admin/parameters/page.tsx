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
  const [calculateData, setCalculateData] = useState<any>(null);
  const [calculationMethod, setCalculationMethod] = useState<string>('media3');
  const [calculationAdjustment, setCalculationAdjustment] =
    useState<string>('0');
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);

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
  } = useParametersData();

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

  // Adicione estas funções e estados ao seu ParametersPage.tsx

  // Função para calcular meta automaticamente
  const handleCalculateMeta = (
    criterionId: number,
    sectorId: number,
    criterionName: string
  ) => {
    // Verificar se está na fase de planejamento
    const isPlanejamentoActive = selectedPeriod?.status === 'PLANEJAMENTO';

    // Só permitir cálculo em fase de planejamento
    if (!isPlanejamentoActive) {
      toast.error('Metas só podem ser calculadas na fase de planejamento');
      return;
    }

    const criterio = uniqueCriteria.find((c) => c.id === criterionId);
    const setor = Object.values(resultsBySector).find(
      (s: any) => s.setorId === sectorId || s.id === sectorId
    );

    if (!criterio || !setor) {
      toast.error('Dados insuficientes para cálculo');
      return;
    }

    setCalculateData({
      criterioId: criterionId,
      criterioNome: criterio.nome,
      setorId: sectorId,
      setorNome: setor.setorNome,
    });

    // Resetar valores
    setCalculationMethod('media3');
    setCalculationAdjustment('0');
    setCalculatedValue(null);

    setCalculateModalOpen(true);
  };

  // Função para visualizar o cálculo
  const handlePreviewCalculation = async () => {
    if (!calculateData) return;

    try {
      // Simulação de obtenção de dados históricos
      // Em um cenário real, você chamaria sua API para obter esses dados
      const historicalData = await getHistoricalData(
        calculateData.criterioId,
        calculateData.setorId
      );

      let calculatedValue = 0;
      const adjustment = parseFloat(calculationAdjustment) / 100; // Converter percentual para decimal

      switch (calculationMethod) {
        case 'media3':
          // Média dos últimos 3 meses
          calculatedValue =
            historicalData
              .slice(0, 3)
              .reduce((sum, item) => sum + item.valor, 0) / 3;
          break;
        case 'media6':
          // Média dos últimos 6 meses
          calculatedValue =
            historicalData
              .slice(0, 6)
              .reduce((sum, item) => sum + item.valor, 0) / 6;
          break;
        case 'ultimo':
          // Valor do último mês
          calculatedValue = historicalData[0]?.valor || 0;
          break;
        case 'melhor3':
          // Melhor valor dos últimos 3 meses
          calculatedValue = Math.max(
            ...historicalData.slice(0, 3).map((item) => item.valor)
          );
          break;
        default:
          calculatedValue = 0;
      }

      // Aplicar ajuste percentual
      if (adjustment !== 0) {
        calculatedValue = calculatedValue * (1 + adjustment);
      }

      // Arredondar para 2 casas decimais
      calculatedValue = Math.round(calculatedValue * 100) / 100;

      setCalculatedValue(calculatedValue);
    } catch (error) {
      console.error('Erro ao calcular meta:', error);
      toast.error('Erro ao calcular valor da meta');
    }
  };

  // Função para aplicar o cálculo
  const handleApplyCalculation = async () => {
    if (!calculateData || calculatedValue === null) return;

    try {
      // Aqui você implementaria a chamada à API para salvar a meta calculada
      console.log('Salvando meta calculada:', {
        ...calculateData,
        valorMeta: calculatedValue,
      });

      // Simulação de uma chamada à API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Recarregar os resultados após a criação
      if (selectedPeriod?.mesAno) {
        await refetchResults(selectedPeriod.mesAno);
      }

      toast.success('Meta calculada aplicada com sucesso!');
      setCalculateModalOpen(false);
    } catch (error) {
      console.error('Erro ao aplicar meta calculada:', error);
      toast.error('Erro ao aplicar meta calculada. Tente novamente.');
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
              onCalculate={handleCalculateMeta}
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
        open={calculateModalOpen}
        onOpenChange={setCalculateModalOpen}
        calculateData={calculateData}
        calculationMethod={calculationMethod}
        setCalculationMethod={setCalculationMethod}
        calculationAdjustment={calculationAdjustment}
        setCalculationAdjustment={setCalculationAdjustment}
        handlePreviewCalculation={handlePreviewCalculation}
        calculatedValue={calculatedValue}
        handleApplyCalculation={handleApplyCalculation}
      />
    </div>
  );
}
