// src/hooks/useModals.ts
import { CalculateData, CreateData, EditData } from '@/types/parameters.types';
import { useState } from 'react';

export const useModals = () => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);

  const [editData, setEditData] = useState<EditData | null>(null);
  const [createData, setCreateData] = useState<CreateData | null>(null);
  const [calculateData, setCalculateData] = useState<CalculateData | null>(
    null
  );

  const [newMetaValue, setNewMetaValue] = useState<string>('');

  const openEditModal = (
    data: EditData,
    currentValue: string | number | null
  ) => {
    setEditData(data);
    setNewMetaValue(currentValue?.toString() || '');
    setEditModalOpen(true);
  };

  const openCreateModal = (data: CreateData) => {
    setCreateData(data);
    setNewMetaValue('');
    setCreateModalOpen(true);
  };

  const openCalculationModal = (data: CalculateData) => {
    setCalculateData(data);
    setCalculationModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditData(null);
    setNewMetaValue('');
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateData(null);
    setNewMetaValue('');
  };

  const closeCalculationModal = () => {
    setCalculationModalOpen(false);
    setCalculateData(null);
  };

  return {
    // Estados
    editModalOpen,
    createModalOpen,
    calculationModalOpen,
    editData,
    createData,
    calculateData,
    newMetaValue,

    // Setters
    setNewMetaValue,
    setEditModalOpen,
    setCreateModalOpen,
    setCalculationModalOpen,

    // Funções auxiliares
    openEditModal,
    openCreateModal,
    openCalculationModal,
    closeEditModal,
    closeCreateModal,
    closeCalculationModal,
  };
};
