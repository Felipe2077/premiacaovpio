// apps/web/src/app/admin/parameters/page.tsx - VERSÃO OTIMIZADA (CORREÇÃO DE LOADING)
'use client';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Componentes
import { SimpleLazyModals } from '@/components/parameters/LazyModalsSimple';
import { ParametersHeader } from '@/components/parameters/ParametersHeader';
import ParametersMatrix from '@/components/parameters/ParametersMatrix';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Hooks
import { useCalculationActions } from '@/hooks/useCalculationActions';
import { useCalculationSettingsNew as useCalculationSettings } from '@/hooks/useCalculationSettingsNew';
import { useParametersData } from '@/hooks/useParametersData';
import { useParametersMutations } from '@/hooks/useParametersMutations';

// Tipos
import { ParametersAPI } from '@/services/parameters.api';
import { CompetitionPeriod, Sector } from '@/types/parameters.types';
import {
  Criterio as Criterion,
  RegrasAplicadasPadrao,
} from '@sistema-premiacao/shared-types';

// Tipos de payload para os handlers de submit
type EditPayload = {
  id: number;
  valor: string;
  justificativa: string;
  nomeParametro: string;
  dataInicioEfetivo: string;
};

type CreatePayload = {
  valor: string;
  justificativa: string;
  nomeParametro: string;
  dataInicioEfetivo: string;
};

export default function ParametersPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [modals, setModals] = useState({
    create: false,
    edit: false,
    calculation: false,
    history: false,
  });

  const [modalData, setModalData] = useState({
    editing: null as any,
    creating: null as any,
    calculating: null as any,
    history: null as any,
  });

  const {
    periods,
    uniqueCriteria,
    resultsBySector,
    sectors,
    isLoading,
    isLoadingResults,
    fetchResults,
    fetchAllData,
    getPeriodById,
    fetchCriterionCalculationSettings,
    fetchParameterByCriteriaSector,
  } = useParametersData();

  const selectedPeriod = useMemo(
    () => (selectedPeriodId ? getPeriodById(selectedPeriodId) : null),
    [selectedPeriodId, getPeriodById]
  );

  const calculationSettings = useCalculationSettings({
    uniqueCriteria,
    fetchCriterionCalculationSettings,
  });

  const calculationActions = useCalculationActions({
    fetchResults,
    selectedPeriodMesAno: selectedPeriod?.mesAno || '',
  });

  const { updateMutation, createMutation } = useParametersMutations(
    selectedPeriod?.mesAno || ''
  );

  const handlePeriodChange = useCallback((value: string) => {
    setSelectedPeriodId(parseInt(value));
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!selectedPeriod?.mesAno) return;
    try {
      await fetchAllData(selectedPeriod.mesAno);
      toast.success('Dados atualizados!');
    } catch {
      toast.error('Erro ao atualizar dados.');
    }
  }, [selectedPeriod?.mesAno, fetchAllData]);

  const openModal = useCallback((type: keyof typeof modals, data?: any) => {
    setModals((prev) => ({ ...prev, [type]: true }));
    if (data) {
      const key =
        type === 'edit'
          ? 'editing'
          : type === 'create'
            ? 'creating'
            : type === 'calculation'
              ? 'calculating'
              : 'history';
      setModalData((prev) => ({ ...prev, [key]: data }));
    }
  }, []);

  const closeModal = useCallback((type: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [type]: false }));
  }, []);

  const handleEdit = useCallback(
    async (
      criterion: Criterion,
      sector: Sector | null,
      initialValue: number | string | null
    ) => {
      try {
        const existingParameter = await fetchParameterByCriteriaSector(
          criterion.id,
          sector?.id || null,
          selectedPeriod?.id || 0
        );

        const dataForModal = {
          id: existingParameter?.id,
          criterionId: criterion.id,
          sectorId: sector?.id || null,
          criterionName: criterion.nome,
          sectorName: sector?.nome || 'Geral',
          competitionPeriodId: selectedPeriod?.id,
          nomeParametro:
            existingParameter?.nomeParametro || `Meta ${criterion.nome}`,
          dataInicioEfetivo:
            existingParameter?.dataInicioEfetivo ||
            new Date().toISOString().split('T')[0],
          valor: initialValue ?? existingParameter?.valor ?? '',
        };
        openModal('edit', dataForModal);
      } catch (error) {
        console.error('Erro ao buscar parâmetro para edição:', error);
        toast.error('Erro ao carregar dados para edição.');
      }
    },
    [selectedPeriod?.id, fetchParameterByCriteriaSector, openModal]
  );

  const handleCreate = useCallback(
    (criterion: Criterion, sector: Sector | null) => {
      const dataForModal = {
        criterionId: criterion.id,
        sectorId: sector?.id || null,
        criterionName: criterion.nome,
        sectorName: sector?.nome || 'Geral',
        competitionPeriodId: selectedPeriod?.id,
      };
      openModal('create', dataForModal);
    },
    [selectedPeriod?.id, openModal]
  );

  const handleCalculate = useCallback(
    (criterion: Criterion, sector: Sector | null) => {
      if (!selectedPeriod) {
        toast.error('Período não fornecido para cálculo.');
        return;
      }
      if (selectedPeriod.status !== 'PLANEJAMENTO') {
        toast.error('Metas só podem ser calculadas na fase de PLANEJAMENTO.');
        return;
      }

      const data = {
        criterioId: criterion.id,
        criterioNome: criterion.nome,
        setorId: sector?.id || null,
        setorNome: sector?.nome || 'Geral',
        competitionPeriodId: selectedPeriod.id,
      };
      setModalData((prev) => ({ ...prev, calculating: data }));
      openModal('calculation');
    },
    [selectedPeriod, openModal]
  );

  const handleHistory = useCallback(
    (data: {
      criterionId: number;
      sectorId: number;
      criterionName: string;
      sectorName: string;
    }) => {
      setModalData((prev) => ({ ...prev, history: data }));
      openModal('history');
    },
    [openModal]
  );

  const handleAcceptSuggestion = useCallback(
    async (
      criterionId: number,
      sectorId: number | null,
      competitionPeriodId: number,
      suggestedValue: number,
      defaultSettingsApplied: RegrasAplicadasPadrao | null,
      criterionName: string,
      sectorName?: string
    ) => {
      await calculationActions.handleAcceptSuggestion(
        criterionId,
        sectorId,
        competitionPeriodId,
        suggestedValue,
        defaultSettingsApplied,
        criterionName,
        sectorName
      );
    },
    [calculationActions]
  );

  const handleCreateSubmit = useCallback(
    async (payload: CreatePayload) => {
      if (!modalData.creating) return;

      try {
        await createMutation.mutateAsync({
          criterionId: modalData.creating.criterionId,
          sectorId: modalData.creating.sectorId,
          competitionPeriodId: modalData.creating.competitionPeriodId,
          valor: parseFloat(payload.valor),
          justificativa: payload.justificativa,
          nomeParametro: payload.nomeParametro,
          dataInicioEfetivo: payload.dataInicioEfetivo,
        } as any);

        closeModal('create');

        if (selectedPeriod?.mesAno) {
          await fetchResults(selectedPeriod.mesAno);
        }
        toast.success('Meta criada com sucesso!');
      } catch {
        toast.error('Erro ao criar meta.');
      }
    },
    [
      modalData.creating,
      createMutation,
      closeModal,
      selectedPeriod?.mesAno,
      fetchResults,
    ]
  );

  const handleEditSubmit = useCallback(
    async (payload: EditPayload) => {
      if (!payload.id) {
        toast.error('Dados de edição não encontrados.');
        return;
      }

      try {
        await updateMutation.mutateAsync({
          id: payload.id,
          valor: parseFloat(payload.valor),
          justificativa: payload.justificativa,
          nomeParametro: payload.nomeParametro,
          dataInicioEfetivo: payload.dataInicioEfetivo,
        });

        closeModal('edit');

        if (selectedPeriod?.mesAno) {
          await fetchResults(selectedPeriod.mesAno);
        }
        toast.success('Meta atualizada com sucesso!');
      } catch (error) {
        console.error('Erro ao atualizar meta:', error);
        toast.error('Erro ao atualizar meta.');
      }
    },
    [updateMutation, closeModal, selectedPeriod?.mesAno, fetchResults]
  );

  const handleApplyCalculation = useCallback(
    async (payload: any) => {
      await calculationActions.handleApplyCalculation(payload, () =>
        closeModal('calculation')
      );
    },
    [calculationActions, closeModal]
  );

  const fetchHistoricalData = useCallback(
    (criterionId: number, sectorId: number | null) => {
      return ParametersAPI.fetchHistoricalData(
        criterionId,
        sectorId,
        selectedPeriod?.mesAno || '',
        6
      );
    },
    [selectedPeriod?.mesAno]
  );

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const activePeriod = periods.find(
        (p: CompetitionPeriod) => p.status === 'ATIVA'
      );
      const planningPeriod = periods.find(
        (p: CompetitionPeriod) => p.status === 'PLANEJAMENTO'
      );
      const sortedPeriods = [...periods].sort(
        (a, b) =>
          new Date(b.dataInicio || 0).getTime() -
          new Date(a.dataInicio || 0).getTime()
      );

      const periodToSelect = activePeriod || planningPeriod || sortedPeriods[0];
      if (periodToSelect) setSelectedPeriodId(periodToSelect.id);
    }
  }, [periods, selectedPeriodId]);

  useEffect(() => {
    if (selectedPeriod?.mesAno) {
      fetchResults(selectedPeriod.mesAno);
    }
  }, [selectedPeriod?.mesAno, fetchResults]);

  if (isLoading && !selectedPeriod) {
    return (
      <div className='container mx-auto py-6'>
        <div className='flex justify-center items-center h-64'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          <span className='ml-2 text-muted-foreground'>
            Carregando dados...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <ParametersHeader
        periods={periods as CompetitionPeriod[]}
        selectedPeriodId={selectedPeriodId}
        isLoading={isLoading || isLoadingResults}
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
            {/* ✅ MUDANÇA PRINCIPAL AQUI */}
            {isLoadingResults ? (
              <div className='flex justify-center items-center min-h-[400px]'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                <span className='ml-2 text-muted-foreground'>
                  Carregando dados da matriz...
                </span>
              </div>
            ) : (
              <ParametersMatrix
                uniqueCriteria={uniqueCriteria}
                resultsBySector={resultsBySector}
                onEdit={handleEdit}
                onCreate={handleCreate}
                onCalculate={handleCalculate}
                isLoadingMatrixData={isLoadingResults}
                periodoAtual={selectedPeriod}
                sectors={sectors}
                onOpenHistory={handleHistory}
                onAcceptSuggestion={handleAcceptSuggestion}
              />
            )}
          </CardContent>
        </Card>
      )}

      {isMounted && (
        <SimpleLazyModals
          isCreateModalOpen={modals.create}
          createData={modalData.creating}
          onCreateModalChange={(open) =>
            open ? openModal('create') : closeModal('create')
          }
          onCreateSubmit={handleCreateSubmit}
          isEditModalOpen={modals.edit}
          editingParameter={modalData.editing}
          onEditModalChange={(open) =>
            open ? openModal('edit') : closeModal('edit')
          }
          onEditSubmit={handleEditSubmit}
          isCalculationModalOpen={modals.calculation}
          calculateData={modalData.calculating}
          onCalculationModalChange={(open) =>
            open ? openModal('calculation') : closeModal('calculation')
          }
          calculationSettings={calculationSettings}
          calculationActions={calculationActions}
          onApplyCalculation={handleApplyCalculation}
          fetchHistoricalData={fetchHistoricalData}
          uniqueCriteria={uniqueCriteria}
          historyModalOpen={modals.history}
          historyData={modalData.history}
          onHistoryModalChange={(open) =>
            open ? openModal('history') : closeModal('history')
          }
        />
      )}
    </div>
  );
}
