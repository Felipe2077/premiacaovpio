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
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Interface para o objeto de período (ajuste conforme sua definição real)
interface CompetitionPeriod {
  id: number;
  mesAno: string;
  status: string;
  startDate: Date | string; // Data de início ou referência do período
  // Adicione outras propriedades se necessário
}

// Interface para o objeto de critério (ajuste conforme sua definição real)
interface Criterion {
  id: number;
  nome: string;
  // Adicione outras propriedades se necessário
}

// Interface para o objeto de setor (ajuste conforme sua definição real)
interface Sector {
  id: number;
  nome: string;
  // Adicione outras propriedades se necessário
}

export default function ParametersPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [createData, setCreateData] = useState<any>(null);
  const [newMetaValue, setNewMetaValue] = useState<string>('');

  // --- Estados para o CalculationModal ---
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);
  const [calculateData, setCalculateData] = useState<null | {
    criterioId: number;
    criterioNome: string;
    setorId: number | null;
    setorNome: string;
    competitionPeriodId: number;
    competitionPeriodDate: Date | string | number; // Data de referência do período
  }>(null);
  const [calculationMethod, setCalculationMethod] = useState<string>('media3');
  const [calculationAdjustment, setCalculationAdjustment] =
    useState<string>('0');
  const [roundingMethod, setRoundingMethod] = useState<string>('none');
  const [decimalPlaces, setDecimalPlaces] = useState<string>('2');
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);

  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(false);
  const [calculatedValuePreview, setCalculatedValuePreview] = useState<
    number | null
  >(null);
  const [isCalculatingPreview, setIsCalculatingPreview] =
    useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const {
    periods, // Supondo que periods é CompetitionPeriod[]
    uniqueCriteria, // Supondo que uniqueCriteria é Criterion[]
    resultsBySector,
    sectors, // Supondo que sectors é Sector[]
    isLoading,
    fetchResults,
    fetchAllData,
    getPeriodById,
    fetchCriterionCalculationSettings,
  } = useParametersData();

  // Obter o período selecionado com base no ID
  // selectedPeriod terá o tipo CompetitionPeriod | null
  const selectedPeriod: CompetitionPeriod | null = selectedPeriodId
    ? (getPeriodById(selectedPeriodId) as CompetitionPeriod | null) // Cast se getPeriodById retorna any
    : null;

  // Função para abrir o modal de cálculo
  // *** ASSINATURA CORRIGIDA E USO DOS PARÂMETROS ***
  const handleOpenCalculationModal = (
    criterion: Criterion, // Objeto do critério
    sector: Sector | null, // Objeto do setor ou null
    currentCompetitionPeriod: CompetitionPeriod // Objeto do período da competição
  ) => {
    if (!currentCompetitionPeriod) {
      toast.error('Período da competição não fornecido para cálculo.');
      return;
    }
    if (currentCompetitionPeriod.status !== 'PLANEJAMENTO') {
      toast.error('Metas só podem ser calculadas na fase de PLANEJAMENTO.');
      return;
    }

    setCalculateData({
      criterioId: criterion.id,
      criterioNome: criterion.nome,
      setorId: sector ? sector.id : null,
      setorNome: sector ? sector.nome : 'Geral',
      // Usa o objeto currentCompetitionPeriod passado como parâmetro
      competitionPeriodId: currentCompetitionPeriod.id,
      competitionPeriodDate: currentCompetitionPeriod.dataInicio, // Assumindo que seu objeto Period tem startDate
    });

    setCalculatedValuePreview(null);
    loadDefaultSettings(criterion.id);
    setCalculationModalOpen(true);
  };

  const loadDefaultSettings = async (criterionId: number) => {
    setIsLoadingSettings(true);
    try {
      const settings = await fetchCriterionCalculationSettings(criterionId);
      if (settings) {
        setCalculationMethod(settings.calculationMethod || 'media3');
        setCalculationAdjustment(
          settings.adjustmentPercentage?.toString() || '0'
        );
        setRoundingMethod(settings.roundingMethod || 'none');
        setDecimalPlaces(settings.roundingDecimalPlaces?.toString() || '2');
      } else {
        setCalculationMethod('media3');
        setCalculationAdjustment('0');
        setRoundingMethod('none');
        setDecimalPlaces('2');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de cálculo:', error);
      toast.error('Não foi possível carregar as configurações padrão.');
      setCalculationMethod('media3');
      setCalculationAdjustment('0');
      setRoundingMethod('none');
      setDecimalPlaces('2');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const activePeriod = periods.find(
        (p: CompetitionPeriod) =>
          p.status === 'ATIVA' || p.status === 'PLANEJAMENTO'
      );
      if (activePeriod) {
        setSelectedPeriodId(activePeriod.id);
      } else if (periods.length > 0) {
        setSelectedPeriodId(periods[0].id);
      }
    }
  }, [periods, selectedPeriodId]);

  useEffect(() => {
    if (selectedPeriod?.mesAno) {
      fetchResults(selectedPeriod.mesAno);
    }
  }, [selectedPeriod, fetchResults]);

  const handlePeriodChange = (value: string) => {
    const periodId = parseInt(value);
    setSelectedPeriodId(periodId);
  };

  const handleRefresh = async () => {
    if (selectedPeriod?.mesAno) {
      await fetchAllData(selectedPeriod.mesAno);
      toast.success('Dados atualizados com sucesso!');
    }
  };

  const handleEditMeta = (
    criterion: Criterion, // Espera objeto critério
    sector: Sector | null, // Espera objeto setor ou null
    currentParameterValue: string | number | null // Valor atual da meta para preencher
  ) => {
    setEditData({
      criterionId: criterion.id,
      criterioNome: criterion.nome,
      setorId: sector ? sector.id : null,
      setorNome: sector ? sector.nome : 'Geral',
    });
    setNewMetaValue(currentParameterValue?.toString() || '');
    setEditModalOpen(true);
  };

  const handleCreateMeta = (
    criterion: Criterion,
    sector: Sector | null,
    currentCompetitionPeriod: CompetitionPeriod
  ) => {
    setCreateData({
      criterioId: criterion.id,
      criterioNome: criterion.nome,
      setorId: sector ? sector.id : null,
      setorNome: sector ? sector.nome : 'Geral',
      competitionPeriodId: currentCompetitionPeriod.id,
    });
    setNewMetaValue('');
    setCreateModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editData || newMetaValue === '') return; // Permitir 0 como valor
    // Chamar API para salvar meta editada
    console.log('Salvando meta editada:', {
      ...editData,
      valorMeta: parseFloat(newMetaValue),
    });
    // await updateParameter(...);
    toast.success('Meta atualizada com sucesso! (Simulado)');
    if (selectedPeriod?.mesAno) await fetchResults(selectedPeriod.mesAno);
    setEditModalOpen(false);
  };

  const handleSaveCreate = async () => {
    if (!createData || newMetaValue === '') return;
    // Chamar API para criar nova meta
    console.log('Criando nova meta:', {
      ...createData,
      valorMeta: parseFloat(newMetaValue),
    });
    // await createParameter(...);
    toast.success('Meta criada com sucesso! (Simulado)');
    if (selectedPeriod?.mesAno) await fetchResults(selectedPeriod.mesAno);
    setCreateModalOpen(false);
  };

  const handleApiCalculation = useCallback(async (payload: any) => {
    // Envolvida com useCallback
    try {
      const response = await fetch('/api/parameters/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Erro ${response.status}` }));
        throw new Error(
          errorData.message || `Erro ${response.status}: ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error('Erro na chamada API de cálculo:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao calcular.'
      );
      throw error;
    }
  }, []);

  const handlePreviewCalculation = useCallback(
    async (payload: any) => {
      setIsCalculatingPreview(true);
      setCalculatedValuePreview(null);
      try {
        const result = await handleApiCalculation(payload);
        setCalculatedValuePreview(result.value);
        toast.info('Pré-visualização calculada.');
      } catch (error) {
        /* já tratado em handleApiCalculation */
      } finally {
        setIsCalculatingPreview(false);
      }
    },
    [handleApiCalculation]
  );

  const handleApplyCalculationCallback = useCallback(
    async (payload: any) => {
      setIsApplying(true);
      try {
        await handleApiCalculation(payload);
        setCalculationModalOpen(false);
        toast.success('Meta calculada e aplicada com sucesso!');
        if (selectedPeriod?.mesAno) {
          // Verifica se selectedPeriod existe
          await fetchResults(selectedPeriod.mesAno);
        }
      } catch (error) {
        /* já tratado em handleApiCalculation */
      } finally {
        setIsApplying(false);
      }
    },
    [
      handleApiCalculation,
      selectedPeriod,
      fetchResults,
      setIsApplying,
      setCalculationModalOpen,
    ]
  );

  const fetchHistoricalData = useCallback(
    async (
      criterionId: number,
      sectorId: number | null,
      currentPeriodYYYYMM: string,
      count: number = 6
    ): Promise<any[]> => {
      let apiUrl = `/api/results/historical?criterionId=${criterionId}&currentPeriod=${currentPeriodYYYYMM}&count=${count}`;
      if (sectorId !== null && sectorId !== undefined) {
        apiUrl += `&sectorId=${sectorId}`;
      }
      console.log(
        '[ParametersPage] Fetching historical data from URL:',
        apiUrl
      );
      console.log('[ParametersPage]', currentPeriodYYYYMM);

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `Erro ${response.status}: ${response.statusText} - ${errorBody}`
          );
        }
        const result = await response.json();
        if (result.success && result.data && result.data.history) {
          return result.data.history.map((item: any) => ({
            periodo: item.period,
            valorRealizado:
              item.realizedValue !== null
                ? parseFloat(item.realizedValue)
                : null,
            status:
              item.realizedValue !== null ? 'FECHADO' : 'ABERTO_OU_SEM_DADOS',
          }));
        }
        return [];
      } catch (error) {
        console.error('[ParametersPage] Erro em fetchHistoricalData:', error);
        toast.error('Falha ao buscar dados históricos.');
        throw error;
      }
    },
    []
  );

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
            <SelectTrigger className='w-[220px]'>
              <SelectValue placeholder='Selecione um período' />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period: CompetitionPeriod) => (
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
            <p className='text-muted-foreground'>Selecione um período.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Matriz de Parâmetros - {selectedPeriod.mesAno}
              <span
                className={`ml-2 text-sm font-normal px-2 py-0.5 rounded-full ${selectedPeriod.status === 'PLANEJAMENTO' ? 'bg-blue-100 text-blue-700' : selectedPeriod.status === 'ATIVA' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
              >
                {selectedPeriod.status}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* *** AQUI É ONDE VOCÊ PRECISA AJUSTAR A CHAMADA `onCalculate` *** */}
            <ParametersMatrix
              uniqueCriteria={uniqueCriteria} // Deve ser Criterion[]
              resultsBySector={resultsBySector}
              sectors={sectors as Sector[]} // Passando sectors, que deve ser Sector[]
              onEdit={handleEditMeta} // Ajustar os params que onEdit espera também
              onCreate={handleCreateMeta} // Ajustar os params que onCreate espera também
              onCalculate={handleOpenCalculationModal} // ESTA É A PROP CORRETA
              isLoading={isLoading}
              periodoAtual={selectedPeriod as CompetitionPeriod} // Passa o objeto do período selecionado
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
      {calculationModalOpen && calculateData && (
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
          calculatedValuePreview={calculatedValuePreview}
          handleApplyCalculation={handleApplyCalculationCallback}
          isLoadingSettings={isLoadingSettings}
          isCalculatingPreview={isCalculatingPreview}
          isApplying={isApplying}
          fetchHistoricalData={fetchHistoricalData}
        />
      )}
    </div>
  );
}
