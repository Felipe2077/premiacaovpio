// src/pages/ParametersPage.tsx
'use client';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Componentes
import CalculationModal from '@/components/parameters/CalculationModal';
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
    (
      criterion: Criterion,
      sector: Sector | null,
      currentParameterValue: string | number | null
    ) => {
      modals.openEditModal(
        {
          criterionId: criterion.id,
          criterioNome: criterion.nome,
          setorId: sector ? sector.id : null,
          setorNome: sector ? sector.nome : 'Geral',
        },
        currentParameterValue
      );
    },
    [modals]
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

  const handleSaveEdit = async () => {
    if (!modals.editData || modals.newMetaValue === '') return;

    // TODO: Implementar chamada à API para salvar meta editada
    // await updateParameter(...);

    toast.success('Meta atualizada com sucesso! (Simulado)');
    if (selectedPeriod?.mesAno) await fetchResults(selectedPeriod.mesAno);
    modals.closeEditModal();
  };

  const handleSaveCreate = async () => {
    if (!modals.createData || modals.newMetaValue === '') return;

    // TODO: Implementar chamada à API para criar nova meta
    // await createParameter(...);

    toast.success('Meta criada com sucesso! (Simulado)');
    if (selectedPeriod?.mesAno) await fetchResults(selectedPeriod.mesAno);
    modals.closeCreateModal();
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
        onMetaValueChange={modals.setNewMetaValue}
        onSave={handleSaveEdit}
      />

      <CreateDialog
        open={modals.createModalOpen}
        onOpenChange={modals.setCreateModalOpen}
        createData={modals.createData}
        newMetaValue={modals.newMetaValue}
        onMetaValueChange={modals.setNewMetaValue}
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
    </div>
  );
}
