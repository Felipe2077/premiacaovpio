// apps/web/src/hooks/useModalsOptimized.ts
import { CalculateData, CreateData, EditData } from '@/types/parameters.types';
import { useCallback, useState } from 'react';

interface HistoryModalState {
  criterionId: number;
  sectorId: number;
  criterionName: string;
  sectorName: string;
}

export const useModalsOptimized = () => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryModalState | null>(
    null
  );
  const [editData, setEditData] = useState<EditData | null>(null);
  const [createData, setCreateData] = useState<CreateData | null>(null);
  const [calculateData, setCalculateData] = useState<CalculateData | null>(
    null
  );
  const [newMetaValue, setNewMetaValue] = useState<string>('');

  // ✅ MEMOIZED CALLBACKS - Evita re-renders desnecessários
  const openEditModal = useCallback(
    (data: EditData, currentValue: string | number | null) => {
      setEditData(data);
      setNewMetaValue(currentValue?.toString() || '');
      setEditModalOpen(true);
    },
    []
  );

  const openHistoryModal = useCallback((data: HistoryModalState) => {
    setHistoryData(data);
    setHistoryModalOpen(true);
  }, []);

  const closeHistoryModal = useCallback(() => {
    setHistoryModalOpen(false);
    setHistoryData(null);
  }, []);

  const openCreateModal = useCallback((data: CreateData) => {
    setCreateData(data);
    setNewMetaValue('');
    setCreateModalOpen(true);
  }, []);

  const openCalculationModal = useCallback((data: CalculateData) => {
    setCalculateData(data);
    setCalculationModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditData(null);
    setNewMetaValue('');
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setCreateData(null);
    setNewMetaValue('');
  }, []);

  const closeCalculationModal = useCallback(() => {
    setCalculationModalOpen(false);
    setCalculateData(null);
  }, []);

  // ✅ MEMOIZED SETTERS - Para inputs controlados
  const handleMetaValueChange = useCallback((value: string) => {
    setNewMetaValue(value);
  }, []);

  const handleEditModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeEditModal();
      }
    },
    [closeEditModal]
  );

  const handleCreateModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeCreateModal();
      }
    },
    [closeCreateModal]
  );

  const handleCalculationModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeCalculationModal();
      }
    },
    [closeCalculationModal]
  );

  const handleHistoryModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeHistoryModal();
      }
    },
    [closeHistoryModal]
  );

  return {
    // Estados (não mudam referência)
    editModalOpen,
    createModalOpen,
    calculationModalOpen,
    historyModalOpen,
    editData,
    createData,
    calculateData,
    historyData,
    newMetaValue,

    // ✅ CALLBACKS MEMOIZADOS
    openEditModal,
    openCreateModal,
    openCalculationModal,
    openHistoryModal,
    closeEditModal,
    closeCreateModal,
    closeCalculationModal,
    closeHistoryModal,

    // Handlers para controlled components
    handleMetaValueChange,
    handleEditModalOpenChange,
    handleCreateModalOpenChange,
    handleCalculationModalOpenChange,
    handleHistoryModalOpenChange,

    // Setters diretos quando necessário
    setNewMetaValue,
    setEditModalOpen,
    setCreateModalOpen,
    setCalculationModalOpen,
    setHistoryModalOpen,
  };
};
