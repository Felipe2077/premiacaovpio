// apps/web/src/hooks/useOptimizedHandlers.ts
import { useCallback, useMemo } from 'react';
import { useModalsOptimized } from './useModalsOptimized';
import {
  CreateParameterFormValues,
  UpdateParameterFormValues,
} from './useParametersMutations';

interface UseOptimizedHandlersProps {
  selectedPeriod: any;
  uniqueCriteria: any[];
  sectors: any[];
  modals: ReturnType<typeof useModalsOptimized>;
  calculationActions: any;
  parametersMutations: any;
}

export const useOptimizedHandlers = ({
  selectedPeriod,
  uniqueCriteria,
  sectors,
  modals,
  calculationActions,
  parametersMutations,
}: UseOptimizedHandlersProps) => {
  // ✅ MEMOIZED HANDLERS - Evita re-criação desnecessária
  const handleEdit = useCallback(
    (criterionId: number, sectorId: number, currentValue?: number | null) => {
      // ✅ GARANTIR QUE SÃO NÚMEROS, NÃO OBJETOS
      const cleanCriterionId =
        typeof criterionId === 'object' ? criterionId.id : criterionId;
      const cleanSectorId =
        typeof sectorId === 'object'
          ? sectorId?.id || null
          : sectorId === -1
            ? null
            : sectorId;

      const criterion = uniqueCriteria?.find((c) => c.id === cleanCriterionId);
      const sector =
        cleanSectorId === null
          ? null
          : sectors?.find((s) => s.id === cleanSectorId);

      if (!criterion) {
        console.error('Critério não encontrado:', cleanCriterionId);
        return;
      }

      const editData = {
        criterionId: cleanCriterionId,
        sectorId: cleanSectorId,
        criterionName: criterion.nome,
        sectorName: sector?.nome || 'Geral',
        competitionPeriodId: selectedPeriod?.id,
      };

      console.log('✏️ handleEdit - dados limpos:', editData);
      modals.openEditModal(editData, currentValue);
    },
    [uniqueCriteria, sectors, selectedPeriod?.id, modals]
  );

  const handleCreate = useCallback(
    (criterionId: number, sectorId: number) => {
      // ✅ GARANTIR QUE SÃO NÚMEROS, NÃO OBJETOS
      const cleanCriterionId =
        typeof criterionId === 'object' ? criterionId.id : criterionId;
      const cleanSectorId =
        typeof sectorId === 'object'
          ? sectorId?.id || null
          : sectorId === -1
            ? null
            : sectorId;

      const criterion = uniqueCriteria?.find((c) => c.id === cleanCriterionId);
      const sector =
        cleanSectorId === null
          ? null
          : sectors?.find((s) => s.id === cleanSectorId);

      if (!criterion) {
        console.error('Critério não encontrado:', cleanCriterionId);
        return;
      }

      const createData = {
        criterionId: cleanCriterionId,
        sectorId: cleanSectorId,
        criterionName: criterion.nome,
        sectorName: sector?.nome || 'Geral',
        competitionPeriodId: selectedPeriod?.id,
      };

      console.log('➕ handleCreate - dados limpos:', createData);
      modals.openCreateModal(createData);
    },
    [uniqueCriteria, sectors, selectedPeriod?.id, modals]
  );

  const handleCalculate = useCallback(
    (
      criterionId: number,
      sectorId: number,
      criterionName: string,
      sectorName: string
    ) => {
      // ✅ GARANTIR QUE SÃO NÚMEROS, NÃO OBJETOS
      const cleanCriterionId =
        typeof criterionId === 'object' ? criterionId.id : criterionId;
      const cleanSectorId =
        typeof sectorId === 'object'
          ? sectorId?.id || null
          : sectorId === -1
            ? null
            : sectorId;

      const calculateData = {
        criterioId: cleanCriterionId,
        criterioNome: criterionName,
        setorId: cleanSectorId,
        setorNome: sectorName,
      };

      console.log('🧮 handleCalculate - dados limpos:', calculateData);
      modals.openCalculationModal(calculateData);
    },
    [modals]
  );

  const handleHistory = useCallback(
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

  const handleAcceptSuggestion = useCallback(
    (
      criterionId: number,
      sectorId: number,
      suggestedValue: number,
      defaultSettingsApplied: any,
      criterionName: string,
      sectorName?: string
    ) => {
      if (!selectedPeriod?.id || suggestedValue == null) return;

      calculationActions.handleAcceptSuggestion(
        criterionId,
        sectorId,
        selectedPeriod.id,
        suggestedValue,
        defaultSettingsApplied,
        criterionName,
        sectorName
      );
    },
    [selectedPeriod?.id, calculationActions]
  );

  const handleCreateSubmit = useCallback(
    async (data: CreateParameterFormValues) => {
      try {
        await parametersMutations.createMutation.mutateAsync(data);
        modals.closeCreateModal();
      } catch (error) {
        console.error('Erro ao criar parâmetro:', error);
        throw error; // Re-throw para que o componente pai possa tratar
      }
    },
    [parametersMutations, modals]
  );

  const handleEditSubmit = useCallback(
    async (data: UpdateParameterFormValues) => {
      try {
        await parametersMutations.updateMutation.mutateAsync(data);
        modals.closeEditModal();
      } catch (error) {
        console.error('Erro ao atualizar parâmetro:', error);
        throw error; // Re-throw para que o componente pai possa tratar
      }
    },
    [parametersMutations, modals]
  );

  const handleApplyCalculation = useCallback(
    async (payload: any) => {
      await calculationActions.handleApplyCalculation(payload, () =>
        modals.closeCalculationModal()
      );
    },
    [calculationActions, modals]
  );

  // ✅ MEMOIZED OBJECT - Evita re-criação do objeto a cada render
  return useMemo(
    () => ({
      handleEdit,
      handleCreate,
      handleCalculate,
      handleHistory,
      handleAcceptSuggestion,
      handleCreateSubmit,
      handleEditSubmit,
      handleApplyCalculation,
    }),
    [
      handleEdit,
      handleCreate,
      handleCalculate,
      handleHistory,
      handleAcceptSuggestion,
      handleCreateSubmit,
      handleEditSubmit,
      handleApplyCalculation,
    ]
  );
};
