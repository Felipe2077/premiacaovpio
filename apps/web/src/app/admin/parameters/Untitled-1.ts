// apps/web/src/app/admin/parameters/page.tsx (LÓGICA DO SELETOR DE PERÍODO REFEITA)
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreateParameterDto, UpdateParameterDto } from 'shared-types';

import { ParameterValueAPI, useParameters } from '@/hooks/useParameters';
import { columnsParameters } from './_components/columns-parameters';
// import { PeriodSelector, PeriodOption } from '@/components/shared/period-selector'; // Vamos usar o Select direto por enquanto

// Interfaces
interface CompetitionPeriodForSelect {
  id: number;
  mesAno: string;
  status: string;
  dataInicio?: string;
}
interface CriterionForSelect {
  id: number;
  nome: string;
}
interface SectorForSelect {
  id: number;
  nome: string;
}

// Fetch functions
const fetchActiveCriteriaSimple = async (): Promise<CriterionForSelect[]> => {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/criteria/active`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erro ${res.status} ao buscar critérios`);
  }
  return res.json();
};
const fetchActiveSectorsSimple = async (): Promise<SectorForSelect[]> => {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sectors/active`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erro ${res.status} ao buscar setores`);
  }
  return res.json();
};
const fetchCompetitionPeriodsForSelect = async (): Promise<
  CompetitionPeriodForSelect[]
> => {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/periods`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erro ${res.status} ao buscar períodos`);
  }
  return res.json();
};

const queryClient = useQueryClient();
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

const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

// Estado para o período selecionado
const [selectedPeriodMesAno, setSelectedPeriodMesAno] = useState<string>('');

// Busca de dados para dropdowns
const {
  data: competitionPeriodsData,
  isLoading: isLoadingPeriods,
  error: periodsError,
} = useQuery<CompetitionPeriodForSelect[]>({
  queryKey: ['competitionPeriodsForAdminParamsPage'],
  queryFn: fetchCompetitionPeriodsForSelect,
  staleTime: 1000 * 60 * 15, // 15 minutos
});
const competitionPeriodsForSelect = useMemo(
  () => competitionPeriodsData || [],
  [competitionPeriodsData]
);

// Efeito para definir o período inicial ou quando o usuário ainda não selecionou um
useEffect(() => {
  // Só roda se os períodos foram carregados e NENHUM período está selecionado ainda
  if (competitionPeriodsForSelect.length > 0 && !selectedPeriodMesAno) {
    let initialPeriodToSet = '';
    // Tenta pegar do localStorage
    if (typeof window !== 'undefined') {
      const savedPeriod = localStorage.getItem('selectedAdminParameterPeriod');
      if (
        savedPeriod &&
        competitionPeriodsForSelect.find((p) => p.mesAno === savedPeriod)
      ) {
        initialPeriodToSet = savedPeriod;
      }
    }
    // Se não achou no localStorage ou não é válido, define um default
    if (!initialPeriodToSet) {
      const planningPeriod = competitionPeriodsForSelect.find(
        (p) => p.status === 'PLANEJAMENTO'
      );
      const activePeriod = competitionPeriodsForSelect.find(
        (p) => p.status === 'ATIVA'
      );
      // Fallback para o período mais recente (pela data de início)
      const sortedPeriods = [...competitionPeriodsForSelect].sort(
        (a, b) =>
          new Date(b.dataInicio || 0).getTime() -
          new Date(a.dataInicio || 0).getTime()
      );
      const defaultPeriod =
        planningPeriod ||
        activePeriod ||
        (sortedPeriods.length > 0 ? sortedPeriods[0] : null);
      if (defaultPeriod) {
        initialPeriodToSet = defaultPeriod.mesAno;
      }
    }
    // Define o estado APENAS SE encontrou um período válido para setar
    if (initialPeriodToSet) {
      setSelectedPeriodMesAno(initialPeriodToSet);
    }
  }
}, [competitionPeriodsForSelect]); // Dependência: Apenas quando a lista de períodos é carregada/alterada

// Efeito para salvar no localStorage QUANDO selectedPeriodMesAno MUDA pelo usuário
useEffect(() => {
  if (typeof window !== 'undefined' && selectedPeriodMesAno) {
    localStorage.setItem('selectedAdminParameterPeriod', selectedPeriodMesAno);
  }
}, [selectedPeriodMesAno]);

const {
  data: activeCriteria,
  isLoading: isLoadingCriteria,
  error: criteriaError,
} = useQuery<CriterionForSelect[]>({
  queryKey: ['activeCriteriaSimpleForParams'],
  queryFn: fetchActiveCriteriaSimple,
  staleTime: Infinity,
});
const {
  data: activeSectors,
  isLoading: isLoadingSectors,
  error: sectorsError,
} = useQuery<SectorForSelect[]>({
  queryKey: ['activeSectorsSimpleForParams'],
  queryFn: fetchActiveSectorsSimple,
  staleTime: Infinity,
});

const {
  parameters,
  isLoadingParameters,
  parametersError,
  createParameter,
  isCreatingParameter,
  updateParameter,
  isUpdatingParameter,
  deleteParameter,
  isDeletingParameter,
  getParameterHistory,
} = useParameters(
  selectedPeriodMesAno, // Passa o período selecionado
  undefined,
  undefined,
  false // Mostrar todas as metas (ativas e expiradas) por padrão
);

// HANDLERS (envolvidos em useCallback)
const handleCreateParameter = useCallback(
  async (data: CreateParameterDto) => {
    /* ... como antes ... */
  },
  [createParameter]
);
const handleOpenEditModal = useCallback(
  (parameter: ParameterValueAPI) => {
    /* ... como antes ... */
  },
  [competitionPeriodsForSelect, todayStr]
);
const handleUpdateParameter = useCallback(
  async (data: UpdateParameterDto) => {
    /* ... como antes ... */
  },
  [editingParameter, updateParameter]
);
const handleOpenDeleteModal = useCallback(
  (parameter: ParameterValueAPI) => {
    /* ... como antes ... */
  },
  [competitionPeriodsForSelect, todayStr]
);
const handleDeleteParameter = useCallback(async () => {
  /* ... como antes ... */
}, [parameterToDelete, deleteJustification, deleteParameter]);
const handleShowHistory = useCallback(
  async (param: ParameterValueAPI) => {
    /* ... como antes ... */
  },
  [getParameterHistory]
);

const isLoadingPageEssentials =
  isLoadingPeriods || isLoadingCriteria || isLoadingSectors;

const tableColumns = useMemo(
  () =>
    columnsParameters({
      onEdit: handleOpenEditModal,
      onDelete: handleOpenDeleteModal,
      onShowHistory: handleShowHistory,
      todayStr: todayStr,
      competitionPeriods: competitionPeriodsForSelect, // Passa o array garantido
    }),
  [
    todayStr,
    competitionPeriodsForSelect,
    handleOpenEditModal,
    handleOpenDeleteModal,
    handleShowHistory,
  ]
);
