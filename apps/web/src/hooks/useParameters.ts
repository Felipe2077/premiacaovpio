/* eslint-disable @typescript-eslint/no-unused-vars */
// apps/web/src/hooks/useParameters.ts (CORRIGIDO COMPLETO)
import {
  CalculateParameterDto,
  CreateParameterDto,
  CriterionCalculationSettingsDto,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export interface ParameterValueAPI {
  id: number;
  nomeParametro: string;
  valor: string;
  dataInicioEfetivo: string;
  dataFimEfetivo: string | null;
  criterionId: number;
  sectorId: number | null;
  competitionPeriodId: number;
  createdByUserId?: number;
  justificativa?: string;
  createdAt: string;
  previousVersionId?: number | null;
  criterio?: { id: number; nome: string };
  setor?: { id: number; nome: string };
  competitionPeriod?: { id: number; mesAno: string; status?: string };
  criadoPor?: { id: number; nome: string };
  metadata?: {
    calculationMethod?: 'media3' | 'media6' | 'ultimo' | 'melhor3' | 'manual';
    adjustmentPercentage?: number;
    baseValue?: number;
    wasRounded?: boolean;
    roundingMethod?: 'nearest' | 'up' | 'down';
    roundingDecimalPlaces?: number;
  };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// 🎯 FUNÇÃO CORRIGIDA 1: fetchParameters
const fetchParameters = async ({
  queryKey,
}: {
  queryKey: QueryKey;
}): Promise<ParameterValueAPI[]> => {
  const [_key, periodMesAno, sectorId, criterionId, onlyActive] = queryKey as [
    string,
    string,
    number?,
    number?,
    boolean?,
  ];
  if (!periodMesAno) return Promise.resolve([]);
  const params = new URLSearchParams();
  params.append('period', periodMesAno);
  if (sectorId !== undefined) params.append('sectorId', String(sectorId));
  if (criterionId !== undefined)
    params.append('criterionId', String(criterionId));
  if (onlyActive === false) params.append('onlyActive', 'false');

  const response = await fetch(
    `${API_BASE_URL}/parameters?${params.toString()}`,
    {
      // ✅ CORREÇÃO: Adicionar credentials para autenticação
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.message || `Erro ao buscar parâmetros: ${response.status}`
    );
  }
  return response.json();
};

// 🎯 FUNÇÃO CORRIGIDA 2: createParameter
const createParameter = async (
  newParameterData: CreateParameterDto
): Promise<ParameterValueAPI> => {
  const response = await fetch(`${API_BASE_URL}/parameters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    body: JSON.stringify(newParameterData),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.message || `Erro ao criar parâmetro: ${response.status}`
    );
  }
  return response.json();
};

interface UpdateParameterPayload {
  id: number;
  data: UpdateParameterDto;
}

// 🎯 FUNÇÃO CORRIGIDA 3: updateParameterAPI
const updateParameterAPI = async ({
  id,
  data,
}: UpdateParameterPayload): Promise<ParameterValueAPI> => {
  const response = await fetch(`${API_BASE_URL}/parameters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));

    console.error(`Erro ${response.status} ao atualizar parâmetro:`, errorData);

    throw new Error(
      errorData.message || `Erro ao atualizar parâmetro: ${response.status}`
    );
  }

  const responseData = await response.json();
  return responseData;
};

interface DeleteParameterPayload {
  id: number;
  justificativa: string;
}

// 🎯 FUNÇÃO CORRIGIDA 4: deleteParameterAPI
const deleteParameterAPI = async ({
  id,
  justificativa,
}: DeleteParameterPayload): Promise<ParameterValueAPI> => {
  const response = await fetch(`${API_BASE_URL}/parameters/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    body: JSON.stringify({ justificativa }),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.message || `Erro ao deletar parâmetro: ${response.status}`
    );
  }
  return response.json();
};

// 🎯 FUNÇÃO CORRIGIDA 5: fetchParameterHistory
const fetchParameterHistory = async (
  periodId: number,
  criterionId: number,
  sectorId?: number | null
): Promise<ParameterValueAPI[]> => {
  const params = new URLSearchParams();
  params.append('periodId', String(periodId));
  params.append('criterionId', String(criterionId));
  if (sectorId !== undefined && sectorId !== null) {
    params.append('sectorId', String(sectorId));
  } else if (sectorId === null) {
    params.append('sectorId', 'null');
  }

  const response = await fetch(
    `${API_BASE_URL}/parameters/history?${params.toString()}`,
    {
      // ✅ CORREÇÃO: Adicionar credentials para autenticação
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.message || `Erro ao buscar histórico: ${response.status}`
    );
  }
  return response.json();
};

// 🎯 FUNÇÃO CORRIGIDA 6: calculateParameterValue
const calculateParameterValue = async (
  calculateData: CalculateParameterDto
): Promise<{ value: number; metadata: any }> => {
  const response = await fetch(`${API_BASE_URL}/parameters/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    body: JSON.stringify(calculateData),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ao calcular parâmetro: ${response.status}`
    );
  }

  return response.json();
};

// 🎯 FUNÇÃO CORRIGIDA 7: fetchCriterionCalculationSettings
const fetchCriterionCalculationSettings = async (
  criterionId: number
): Promise<CriterionCalculationSettingsDto> => {
  const response = await fetch(
    `${API_BASE_URL}/criteria/${criterionId}/calculation-settings`,
    {
      // ✅ CORREÇÃO: Adicionar credentials para autenticação
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    // Se for 404, retornar configurações padrão
    if (response.status === 404) {
      const data = await response.json();
      if (data.defaultSettings) {
        return data.defaultSettings;
      }
    }

    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ao buscar configurações de cálculo: ${response.status}`
    );
  }

  return response.json();
};

// Hook principal para usar parâmetros
export const useParameters = (
  periodMesAno: string,
  initialSectorId?: number,
  initialCriterionId?: number,
  initialOnlyActive: boolean = true
) => {
  const queryClient = useQueryClient();
  const queryKey: QueryKey = [
    'parameters',
    periodMesAno,
    initialSectorId,
    initialCriterionId,
    initialOnlyActive,
  ];

  const {
    data: parameters,
    isLoading: isLoadingParameters,
    error: parametersError,
    refetch: refetchParameters,
  } = useQuery<ParameterValueAPI[], Error>({
    queryKey: queryKey,
    queryFn: fetchParameters,
    enabled: !!periodMesAno,
  });

  const createParameterMutation = useMutation<
    ParameterValueAPI,
    Error,
    CreateParameterDto,
    unknown
  >({
    mutationFn: createParameter,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar parâmetro:', error.message);
    },
  });

  const updateParameterMutation = useMutation<
    ParameterValueAPI,
    Error,
    UpdateParameterPayload,
    unknown
  >({
    mutationFn: updateParameterAPI,
    onSuccess: (data) => {},
    onError: (error: Error) => {
      console.error('Erro ao atualizar parâmetro:', error.message);
    },
  });

  const deleteParameterMutation = useMutation<
    ParameterValueAPI,
    Error,
    DeleteParameterPayload,
    unknown
  >({
    mutationFn: deleteParameterAPI,
    onSuccess: (data) => {},
    onError: (error: Error) => {
      console.error('Erro ao deletar parâmetro:', error.message);
    },
  });

  // Função para buscar histórico de parâmetros
  const getParameterHistory = async (
    periodId: number,
    criterionId: number,
    sectorId?: number | null
  ) => {
    try {
      return await fetchParameterHistory(periodId, criterionId, sectorId);
    } catch (error) {
      console.error('Erro ao buscar histórico no hook useParameters:', error);
      throw error;
    }
  };

  return {
    parameters: parameters || [],
    isLoadingParameters,
    parametersError,
    refetchParameters,
    createParameter: createParameterMutation.mutateAsync,
    isCreatingParameter: createParameterMutation.isPending,
    createParameterError: createParameterMutation.error?.message,
    updateParameter: updateParameterMutation.mutateAsync,
    isUpdatingParameter: updateParameterMutation.isPending,
    updateParameterError: updateParameterMutation.error?.message,
    deleteParameter: deleteParameterMutation.mutateAsync,
    isDeletingParameter: deleteParameterMutation.isPending,
    deleteParameterError: deleteParameterMutation.error?.message,
    getParameterHistory,
    fetchCriterionCalculationSettings,
  };
};
