// apps/web/src/app/admin/parameters/page.tsx - VERSÃO COMPLETA COM FILTRO NA MATRIZ
'use client';
import { FilterX, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Componentes
import { AnalysisPanel } from '@/components/parameters/analysis/AnalysisPanel';
import { SimpleLazyModals } from '@/components/parameters/LazyModalsSimple';
import { ParametersHeader } from '@/components/parameters/ParametersHeader';
import ParametersMatrix from '@/components/parameters/ParametersMatrix';
import { ProgressCards } from '@/components/parameters/ProgressCards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  // ✅ NOVO ESTADO PARA O FILTRO DA MATRIZ
  const [matrixCriterionFilterId, setMatrixCriterionFilterId] = useState<
    string | null
  >(null);

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

  // ✅ NOVA LÓGICA PARA FILTRAR OS CRITÉRIOS A SEREM EXIBIDOS NA MATRIZ
  const matrixCriteria = useMemo(() => {
    if (!matrixCriterionFilterId) {
      return uniqueCriteria; // Se nenhum filtro, mostra todos
    }
    return uniqueCriteria.filter(
      (c) => c.id === Number(matrixCriterionFilterId)
    );
  }, [uniqueCriteria, matrixCriterionFilterId]);

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
    setMatrixCriterionFilterId(null); // Limpa o filtro da matriz ao trocar de período
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
      // 1. Validação inicial para garantir que temos o contexto do modal
      if (!modalData.editing || !selectedPeriod) {
        toast.error('Erro: Dados de contexto ausentes para salvar a meta.');
        return;
      }

      // 2. Monta o corpo da requisição no formato EXATO que o backend espera na rota de cálculo
      const apiPayload = {
        // Dados de contexto do modal
        criterionId: modalData.editing.criterionId,
        sectorId: modalData.editing.sectorId,
        competitionPeriodId: selectedPeriod.id,
        // Dados do formulário
        justificativa: `Meta definida manualmente: ${payload.justificativa}`,
        // ✅ A MUDANÇA CRÍTICA: O valor vai no campo "finalValue"
        finalValue: parseFloat(payload.valor),
        // Campos adicionais para compatibilidade com a rota de cálculo
        calculationMethod: 'manual',
        adjustmentPercentage: 0,
        wasRounded: false,
        roundingMethod: 'none',
        roundingDecimalPlaces: 0,
        saveAsDefault: false,
        previewOnly: false,
      };

      try {
        // 3. Faz a chamada diretamente para a API de cálculo, resolvendo o erro de API_BASE_URL
        const response = await fetch(
          'http://localhost:3001/api/parameters/calculate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload),
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Fornece uma mensagem de erro mais clara vinda da API
          throw new Error(
            errorData.message ||
              `Falha ao salvar meta. Status: ${response.status}`
          );
        }

        toast.success('Meta salva e ranking atualizado com sucesso!');
        closeModal('edit');
        await fetchResults(selectedPeriod.mesAno);
      } catch (error: any) {
        console.error('Erro ao salvar meta manualmente:', error);
        toast.error(error.message);
      }
    },
    [modalData.editing, selectedPeriod, fetchResults, closeModal]
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
      const activePeriod = periods.find((p) => p.status === 'ATIVA');
      const planningPeriod = periods.find((p) => p.status === 'PLANEJAMENTO');
      const sortedPeriods = [...periods].sort(
        (a, b) =>
          new Date(b.dataInicio || '').getTime() -
          new Date(a.dataInicio || '').getTime()
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
      <div className='container mx-auto py-6 flex justify-center items-center h-64'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-2 text-muted-foreground'>Carregando dados...</span>
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
        <>
          {selectedPeriod.status === 'PLANEJAMENTO' && (
            <ProgressCards
              resultsBySector={resultsBySector}
              sectors={sectors}
              totalCriteriaCount={uniqueCriteria.length}
            />
          )}
          <AnalysisPanel
            allCriteria={uniqueCriteria}
            sectors={sectors}
            period={selectedPeriod}
            resultsBySector={resultsBySector}
          />
          <Card>
            <CardHeader>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
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
                <div className='flex items-center gap-2'>
                  <Select
                    value={matrixCriterionFilterId ?? ''}
                    onValueChange={(value) => setMatrixCriterionFilterId(value)}
                  >
                    <SelectTrigger className='w-full sm:w-[250px]'>
                      <SelectValue placeholder='Filtrar por critério...' />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueCriteria.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {matrixCriterionFilterId && (
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => setMatrixCriterionFilterId(null)}
                    >
                      <FilterX className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingResults ? (
                <div className='flex justify-center items-center min-h-[400px]'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                  <span className='ml-2 text-muted-foreground'>
                    Carregando dados da matriz...
                  </span>
                </div>
              ) : (
                <ParametersMatrix
                  uniqueCriteria={matrixCriteria}
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
        </>
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
