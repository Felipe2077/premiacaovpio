// hooks/useParameterModals.ts
import { ParameterValueAPI } from '@/hooks/useParameters';
import { useState } from 'react';
import { toast } from 'sonner';

export function useParameterModals(
  todayStr: string,
  competitionPeriods: any[]
) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParameter, setEditingParameter] =
    useState<ParameterValueAPI | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [parameterToDelete, setParameterToDelete] =
    useState<ParameterValueAPI | null>(null);
  const [deleteJustification, setDeleteJustification] = useState('');

  const [historyParam, setHistoryParam] = useState<ParameterValueAPI | null>(
    null
  );
  const [parameterHistoryData, setParameterHistoryData] = useState<
    ParameterValueAPI[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleOpenEditModal = (parameter: ParameterValueAPI) => {
    const periodOfParam = competitionPeriods?.find(
      (p) => p.id === parameter.competitionPeriodId
    );
    if (periodOfParam && periodOfParam.status !== 'PLANEJAMENTO') {
      toast.error(
        `Metas do período ${periodOfParam.mesAno} (${periodOfParam.status}) não podem ser editadas. Apenas de períodos em PLANEJAMENTO.`
      );
      return;
    }
    if (
      parameter.dataFimEfetivo &&
      new Date(parameter.dataFimEfetivo) < new Date(todayStr)
    ) {
      toast.error(
        'Esta meta já está expirada e não pode ser editada. Crie uma nova se necessário.'
      );
      return;
    }
    setEditingParameter(parameter);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (parameter: ParameterValueAPI) => {
    const periodOfParam = competitionPeriods?.find(
      (p) => p.id === parameter.competitionPeriodId
    );
    if (periodOfParam && periodOfParam.status !== 'PLANEJAMENTO') {
      toast.error(
        `Metas do período ${periodOfParam.mesAno} (${periodOfParam.status}) não podem ser deletadas (expiradas). Apenas de períodos em PLANEJAMENTO.`
      );
      return;
    }
    if (
      parameter.dataFimEfetivo &&
      new Date(parameter.dataFimEfetivo) < new Date(todayStr)
    ) {
      toast.error(
        'Esta meta já está expirada e não pode ser deletada novamente.'
      );
      return;
    }
    setParameterToDelete(parameter);
    setDeleteJustification('');
    setIsDeleteConfirmOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingParameter(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteConfirmOpen(false);
    setParameterToDelete(null);
    setDeleteJustification('');
  };

  const closeHistoryModal = () => {
    setHistoryParam(null);
    setParameterHistoryData([]);
  };

  return {
    // Create modal
    isCreateModalOpen,
    setIsCreateModalOpen,

    // Edit modal
    isEditModalOpen,
    editingParameter,
    handleOpenEditModal,
    closeEditModal,

    // Delete modal
    isDeleteConfirmOpen,
    parameterToDelete,
    deleteJustification,
    setDeleteJustification,
    handleOpenDeleteModal,
    closeDeleteModal,

    // History modal
    historyParam,
    setHistoryParam,
    parameterHistoryData,
    setParameterHistoryData,
    isLoadingHistory,
    setIsLoadingHistory,
    closeHistoryModal,
  };
}
