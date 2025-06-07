// src/pages/ParametersPage.tsx
'use client';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

// Componentes
import CalculationModal from '@/components/parameters/CalculationModal';
import { HistoryModal } from '@/components/parameters/HistoryModal';
import {
  CreateDialog,
  EditDialog,
} from '@/components/parameters/ParameterDialogs';
import { ParametersHeader } from '@/components/parameters/ParametersHeader';
import ParametersMatrix from '@/components/parameters/ParametersMatrix';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Hooks
import { useCalculationActions } from '@/hooks/useCalculationActions';
import { useCalculationSettingsNew as useCalculationSettings } from '@/hooks/useCalculationSettingsNew';
import { useModals } from '@/hooks/useModals';
import { useParametersData } from '@/hooks/useParametersData';
import {
  CreateParameterFormValues,
  UpdateParameterFormValues,
  useParametersMutations,
} from '@/hooks/useParametersMutations';

// Tipos
import {
  CalculateData,
  CompetitionPeriod,
  Sector,
} from '@/types/parameters.types';
import {
  Criterio as Criterion,
  RegrasAplicadasPadrao,
} from '@sistema-premiacao/shared-types';

// Serviços
import { ParametersAPI } from '@/services/parameters.api';

export default function ParametersPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Hook de dados
  const {
    periods,
    uniqueCriteria,
    resultsBySector,
    sectors,
    isLoading,
    fetchResults,
    fetchAllData,
    getPeriodById,
    fetchCriterionCalculationSettings,
    fetchParameterByCriteriaSector,
  } = useParametersData();

  // Hook de modais
  const modals = useModals();

  // Hook de configurações de cálculo
  const calculationSettings = useCalculationSettings({
    uniqueCriteria,
    fetchCriterionCalculationSettings,
  });

  // Período selecionado
  const selectedPeriod: CompetitionPeriod | null = selectedPeriodId
    ? (getPeriodById(selectedPeriodId) as CompetitionPeriod | null)
    : null;

  // Hook de ações de cálculo
  const calculationActions = useCalculationActions({
    fetchResults,
    selectedPeriodMesAno: selectedPeriod?.mesAno,
  });

  // Hook para mutations
  const { updateMutation, createMutation } = useParametersMutations(
    selectedPeriod?.mesAno || ''
  );

  // Verificar se está montado (para SSR)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Inicialização do período
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

  // Buscar resultados quando o período mudar
  useEffect(() => {
    if (selectedPeriod?.mesAno) {
      fetchResults(selectedPeriod.mesAno);
    }
  }, [selectedPeriod, fetchResults]);

  // Handlers
  const handlePeriodChange = (value: string) => {
    const periodId = parseInt(value);
    setSelectedPeriodId(periodId);
  };

  const handleOpenHistory = useCallback(
    (data: {
      criterionId: number;
      sectorId: number;
      criterionName: string;
      sectorName: string;
    }) => {
      modals.openHistoryModal(data);
    },
    [modals]
  );

  const handleRefresh = async () => {
    if (selectedPeriod?.mesAno) {
      await fetchAllData(selectedPeriod.mesAno);
      toast.success('Dados atualizados com sucesso!');
    }
  };

  const handleOpenCalculationModal = useCallback(
    (
      criterion: Criterion,
      sector: Sector | null,
      currentCompetitionPeriod: CompetitionPeriod
    ) => {
      if (!currentCompetitionPeriod) {
        toast.error('Período da competição não fornecido para cálculo.');
        return;
      }
      if (currentCompetitionPeriod.status !== 'PLANEJAMENTO') {
        toast.error('Metas só podem ser calculadas na fase de PLANEJAMENTO.');
        return;
      }

      const data: CalculateData = {
        criterioId: criterion.id,
        criterioNome: criterion.nome,
        setorId: sector ? sector.id : null,
        setorNome: sector ? sector.nome : 'Geral',
        competitionPeriodId: currentCompetitionPeriod.id,
        competitionPeriodDate:
          currentCompetitionPeriod.dataInicio ||
          currentCompetitionPeriod.startDate,
      };

      modals.openCalculationModal(data);
      calculationActions.setCalculatedValuePreview(null);
      calculationSettings.loadDefaultSettings(criterion.id);
    },
    [modals, calculationActions, calculationSettings]
  );

  const handleEditMeta = useCallback(
    async (
      criterion: Criterion,
      sector: Sector | null,
      currentParameterValue: string | number | null
    ) => {
      if (!selectedPeriod) {
        toast.error('Período não selecionado');
        return;
      }

      if (selectedPeriod.status !== 'PLANEJAMENTO') {
        toast.error('Metas só podem ser editadas na fase de PLANEJAMENTO.');
        return;
      }

      try {
        // Buscar o parâmetro específico com ID usando os IDs do critério e setor
        const parameter = await fetchParameterByCriteriaSector(
          criterion.id,
          sector?.id || 0, // Se sector for null, usar 0 como fallback
          selectedPeriod.id
        );

        if (!parameter) {
          toast.error('Parâmetro não encontrado para edição.');
          return;
        }

        console.log('[DEBUG] Parâmetro encontrado para edição:', parameter);

        // Preparar dados para o modal
        const editData = {
          parameterId: parameter.id,
          criterionId: criterion.id,
          criterioNome: criterion.nome,
          setorId: sector?.id || 0,
          setorNome: sector?.nome || 'Geral',
          currentValue: currentParameterValue,
          dataInicioEfetivo:
            parameter.dataInicioEfetivo || selectedPeriod.dataInicio,
          nomeParametro: parameter.nomeParametro,
        };

        console.log('[DEBUG] Dados preparados para edição:', editData);

        // Abrir modal com valor atual
        modals.openEditModal(
          editData,
          currentParameterValue?.toString() ||
            parameter.valor?.toString() ||
            '0'
        );
      } catch (error) {
        console.error('Erro ao preparar edição:', error);
        toast.error('Erro ao carregar dados para edição.');
      }
    },
    [selectedPeriod, fetchParameterByCriteriaSector, modals]
  );

  const handleCreateMeta = useCallback(
    (
      criterion: Criterion,
      sector: Sector | null,
      currentCompetitionPeriod: CompetitionPeriod
    ) => {
      modals.openCreateModal({
        criterionId: criterion.id,
        criterioNome: criterion.nome,
        setorId: sector ? sector.id : null,
        setorNome: sector ? sector.nome : 'Geral',
        competitionPeriodId: currentCompetitionPeriod.id,
      });
    },
    [modals]
  );

  // Handler para salvar edição
  const handleSaveEdit = async (
    justificativa: string,
    nomeParametro?: string,
    dataInicioEfetivo?: string
  ) => {
    if (!modals.editData || !justificativa.trim()) {
      toast.error('Justificativa é obrigatória.');
      return;
    }

    if (!modals.newMetaValue || modals.newMetaValue.trim() === '') {
      toast.error('Valor da meta é obrigatório.');
      return;
    }

    if (!selectedPeriod) {
      toast.error('Período não selecionado.');
      return;
    }

    // ⭐ CORREÇÃO PRINCIPAL: Usar data do período atual para evitar conflito
    const dataInicioFinal = dataInicioEfetivo || selectedPeriod.dataInicio;

    // Validar se a data está dentro do período
    const periodoInicio = new Date(selectedPeriod.dataInicio);
    const periodoFim = new Date(selectedPeriod.dataFim);
    const dataInicio = new Date(dataInicioFinal);

    if (dataInicio < periodoInicio || dataInicio > periodoFim) {
      toast.error(
        `Data de início deve estar entre ${selectedPeriod.dataInicio} e ${selectedPeriod.dataFim}`
      );
      return;
    }

    const updateData: UpdateParameterFormValues = {
      id: modals.editData.parameterId || 0,
      valor: parseFloat(modals.newMetaValue) || 0,
      dataInicioEfetivo: dataInicioFinal,
      justificativa: justificativa.trim(),
      nomeParametro: nomeParametro || modals.editData.nomeParametro || '',
    };

    console.log('[DEBUG] Dados enviados para atualização:', updateData);

    try {
      await updateMutation.mutateAsync(updateData);
      modals.closeEditModal();

      // Recarregar dados
      if (selectedPeriod?.mesAno) {
        await fetchResults(selectedPeriod.mesAno);
      }
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
    }
  };

  // Handler para salvar criação
  const handleSaveCreate = async (
    justificativa: string,
    nomeParametro?: string,
    dataInicioEfetivo?: string
  ) => {
    if (!modals.createData || !justificativa.trim()) {
      toast.error('Justificativa é obrigatória.');
      return;
    }

    if (!modals.newMetaValue || modals.newMetaValue.trim() === '') {
      toast.error('Valor da meta é obrigatório.');
      return;
    }

    if (!selectedPeriod) {
      toast.error('Período não selecionado.');
      return;
    }

    const createData: CreateParameterFormValues = {
      competitionPeriodId: modals.createData.competitionPeriodId,
      criterionId: modals.createData.criterionId,
      sectorId: modals.createData.setorId || 0,
      valor: parseFloat(modals.newMetaValue) || 0,
      dataInicioEfetivo: dataInicioEfetivo || selectedPeriod.dataInicio,
      justificativa: justificativa.trim(),
      nomeParametro:
        nomeParametro ||
        `META_${modals.createData.criterioNome.replace(/\s+/g, '_')}_SETOR${modals.createData.setorId}`,
    };

    try {
      await createMutation.mutateAsync(createData);
      modals.closeCreateModal();

      // Recarregar dados
      if (selectedPeriod?.mesAno) {
        await fetchResults(selectedPeriod.mesAno);
      }
    } catch (error) {
      console.error('Erro ao criar meta:', error);
    }
  };

  const handleAcceptSuggestion = useCallback(
    async (
      criterionId: number,
      sectorId: number | null,
      competitionPeriodId: number,
      suggestedValue: number,
      defaultSettingsApplied: RegrasAplicadasPadrao | null
    ) => {
      console.log(
        '[DEBUG ParametersPage] handleAcceptSystemSuggestion RECEBEU:'
      );
      console.log('[DEBUG] criterionId:', criterionId, typeof criterionId);
      console.log('[DEBUG] sectorId:', sectorId, typeof sectorId);
      console.log(
        '[DEBUG] competitionPeriodId:',
        competitionPeriodId,
        typeof competitionPeriodId
      );
      console.log(
        '[DEBUG] suggestedValue:',
        suggestedValue,
        typeof suggestedValue
      );

      const criterion = uniqueCriteria.find((c) => c.id === criterionId);
      const sector = sectors.find((s) => s.id === sectorId);

      if (!criterion) {
        toast.error('Dados de critério ausentes para salvar sugestão.');
        return;
      }

      await calculationActions.handleAcceptSuggestion(
        criterionId,
        sectorId,
        competitionPeriodId,
        suggestedValue,
        defaultSettingsApplied,
        criterion.nome,
        sector?.nome
      );
    },
    [uniqueCriteria, sectors, calculationActions]
  );

  const handleApplyCalculation = useCallback(
    async (payload: any) => {
      await calculationActions.handleApplyCalculation(payload, () =>
        modals.closeCalculationModal()
      );
    },
    [calculationActions, modals]
  );

  // Handler para onChange do valor da meta
  const handleMetaValueChange = useCallback(
    (value: string) => {
      modals.setNewMetaValue(value);
    },
    [modals]
  );

  // Estados de loading
  if (isLoading && !selectedPeriod) {
    return (
      <div className='container mx-auto py-6'>
        <div className='flex justify-center items-center h-64'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <ParametersHeader
        periods={periods as CompetitionPeriod[]}
        selectedPeriodId={selectedPeriodId}
        isLoading={isLoading}
        onPeriodChange={handlePeriodChange}
        onRefresh={handleRefresh}
      />

      {!selectedPeriod ? (
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
                className={`ml-2 text-sm font-normal px-2 py-0.5 rounded-full ${
                  selectedPeriod.status === 'PLANEJAMENTO'
                    ? 'bg-blue-100 text-blue-700'
                    : selectedPeriod.status === 'ATIVA'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                {selectedPeriod.status}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParametersMatrix
              uniqueCriteria={uniqueCriteria}
              resultsBySector={resultsBySector}
              sectors={sectors as Sector[]}
              onEdit={handleEditMeta}
              onCreate={handleCreateMeta}
              onCalculate={handleOpenCalculationModal}
              isLoading={isLoading}
              periodoAtual={selectedPeriod as CompetitionPeriod}
              fetchHistoricalData={ParametersAPI.fetchHistoricalData}
              onAcceptSuggestion={handleAcceptSuggestion}
              isLoadingMatrixData={isLoading}
              onOpenHistory={handleOpenHistory}
            />
          </CardContent>
        </Card>
      )}

      {/* Modais */}
      <EditDialog
        open={modals.editModalOpen}
        onOpenChange={modals.setEditModalOpen}
        editData={modals.editData}
        newMetaValue={modals.newMetaValue}
        onMetaValueChange={handleMetaValueChange}
        onSave={handleSaveEdit}
      />

      <CreateDialog
        open={modals.createModalOpen}
        onOpenChange={modals.setCreateModalOpen}
        createData={modals.createData}
        newMetaValue={modals.newMetaValue}
        onMetaValueChange={handleMetaValueChange}
        onSave={handleSaveCreate}
      />

      {modals.calculationModalOpen && modals.calculateData && (
        <CalculationModal
          open={modals.calculationModalOpen}
          onOpenChange={modals.setCalculationModalOpen}
          calculateData={modals.calculateData}
          calculationMethod={calculationSettings.settings.calculationMethod}
          setCalculationMethod={calculationSettings.setCalculationMethod}
          calculationAdjustment={
            calculationSettings.settings.calculationAdjustment
          }
          setCalculationAdjustment={
            calculationSettings.setCalculationAdjustment
          }
          roundingMethod={calculationSettings.settings.roundingMethod}
          setRoundingMethod={calculationSettings.setRoundingMethod}
          decimalPlaces={calculationSettings.settings.decimalPlaces}
          setDecimalPlaces={calculationSettings.setDecimalPlaces}
          saveAsDefault={calculationSettings.settings.saveAsDefault}
          setSaveAsDefault={calculationSettings.setSaveAsDefault}
          handlePreviewCalculation={calculationActions.handlePreviewCalculation}
          calculatedValuePreview={calculationActions.calculatedValuePreview}
          handleApplyCalculation={handleApplyCalculation}
          isLoadingSettings={calculationSettings.isLoadingSettings}
          isCalculatingPreview={calculationActions.isCalculatingPreview}
          isApplying={calculationActions.isApplying}
          fetchHistoricalData={ParametersAPI.fetchHistoricalData}
        />
      )}

      {isMounted &&
        modals.historyModalOpen &&
        modals.historyData &&
        createPortal(
          <HistoryModal
            isOpen={modals.historyModalOpen}
            onClose={modals.closeHistoryModal}
            criterionId={modals.historyData.criterionId}
            sectorId={modals.historyData.sectorId}
            criterionName={modals.historyData.criterionName}
            sectorName={modals.historyData.sectorName}
          />,
          document.body
        )}
    </div>
  );
}
