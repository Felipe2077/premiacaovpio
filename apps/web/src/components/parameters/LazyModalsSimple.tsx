// apps/web/src/components/parameters/LazyModalsSimple.tsx - VERSÃO OTIMIZADA FASE 1
'use client';
import { Loader2 } from 'lucide-react';
import React, { Suspense, lazy } from 'react';

// Lazy imports
const CalculationModal = lazy(
  () => import('@/components/parameters/CalculationModal')
);
const HistoryModal = lazy(() =>
  import('@/components/parameters/HistoryModal').then((module) => ({
    default: module.HistoryModal,
  }))
);
const CreateDialog = lazy(() =>
  import('@/components/parameters/ParameterDialogs').then((module) => ({
    default: module.CreateDialog,
  }))
);
const EditDialog = lazy(() =>
  import('@/components/parameters/ParameterDialogs').then((module) => ({
    default: module.EditDialog,
  }))
);

const ModalLoader = () => (
  <div className='fixed inset-0 bg-black/20 flex items-center justify-center z-50'>
    <Loader2 className='h-6 w-6 animate-spin text-white' />
  </div>
);

interface LazyModalProps {
  isOpen: boolean;
  children: React.ReactNode;
}

const LazyWrapper = ({ isOpen, children }: LazyModalProps) => {
  if (!isOpen) return null;
  return <Suspense fallback={<ModalLoader />}>{children}</Suspense>;
};

// Tipos de payload para os handlers
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

interface SimpleLazyModalsProps {
  // Create Modal
  isCreateModalOpen: boolean;
  createData: any;
  onCreateModalChange: (open: boolean) => void;
  onCreateSubmit: (payload: CreatePayload) => void;

  // Edit Modal
  isEditModalOpen: boolean;
  editingParameter: any;
  onEditModalChange: (open: boolean) => void;
  onEditSubmit: (payload: EditPayload) => void;

  // Calculation Modal
  isCalculationModalOpen: boolean;
  calculateData: any;
  onCalculationModalChange: (open: boolean) => void;
  calculationSettings: any;
  calculationActions: any;
  onApplyCalculation: (payload: any) => void;
  fetchHistoricalData: (
    criterionId: number,
    sectorId: number | null
  ) => Promise<any[]>;
  uniqueCriteria: any[]; // Mantido para o CalculationModal

  // History Modal
  historyModalOpen: boolean;
  historyData: any;
  onHistoryModalChange: (open: boolean) => void;
}

export const SimpleLazyModals = ({
  isCreateModalOpen,
  createData,
  onCreateModalChange,
  onCreateSubmit,
  isEditModalOpen,
  editingParameter,
  onEditModalChange,
  onEditSubmit,
  isCalculationModalOpen,
  calculateData,
  onCalculationModalChange,
  calculationSettings,
  calculationActions,
  onApplyCalculation,
  fetchHistoricalData,
  uniqueCriteria,
  historyModalOpen,
  historyData,
  onHistoryModalChange,
}: SimpleLazyModalsProps) => {
  return (
    <>
      {/* Create Modal */}
      <LazyWrapper isOpen={isCreateModalOpen}>
        <CreateDialog
          open={isCreateModalOpen}
          onOpenChange={onCreateModalChange}
          createData={createData}
          onSave={onCreateSubmit}
        />
      </LazyWrapper>

      {/* Edit Modal */}
      <LazyWrapper isOpen={isEditModalOpen}>
        <EditDialog
          open={isEditModalOpen}
          onOpenChange={onEditModalChange}
          editData={editingParameter}
          onSave={onEditSubmit}
        />
      </LazyWrapper>

      {/* Calculation Modal */}
      <LazyWrapper isOpen={isCalculationModalOpen}>
        <CalculationModal
          open={isCalculationModalOpen}
          onOpenChange={onCalculationModalChange}
          calculateData={calculateData}
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
          handleApplyCalculation={onApplyCalculation}
          isLoadingSettings={calculationSettings.isLoadingSettings}
          isCalculatingPreview={calculationActions.isCalculatingPreview}
          isApplying={calculationActions.isApplying}
          fetchHistoricalData={fetchHistoricalData}
          uniqueCriteria={uniqueCriteria}
        />
      </LazyWrapper>

      {/* History Modal */}
      <LazyWrapper isOpen={historyModalOpen}>
        <HistoryModal
          isOpen={historyModalOpen}
          onClose={() => onHistoryModalChange(false)}
          criterionId={historyData?.criterionId}
          sectorId={historyData?.sectorId}
          criterionName={historyData?.criterionName}
          sectorName={historyData?.sectorName}
        />
      </LazyWrapper>
    </>
  );
};
