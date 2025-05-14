// apps/web/src/hooks/useParameters.ts (ADICIONANDO getParameterHistory)
import {
  CreateParameterDto,
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
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// fetchParameters, createParameter, updateParameterAPI, deleteParameterAPI (COMO NA ÚLTIMA VERSÃO QUE TE MANDEI)
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
    `${API_BASE_URL}/parameters?${params.toString()}`
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
const createParameter = async (
  newParameterData: CreateParameterDto
): Promise<ParameterValueAPI> => {
  const response = await fetch(`${API_BASE_URL}/parameters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
const updateParameterAPI = async ({
  id,
  data,
}: UpdateParameterPayload): Promise<ParameterValueAPI> => {
  const response = await fetch(`${API_BASE_URL}/parameters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.message || `Erro ao atualizar parâmetro: ${response.status}`
    );
  }
  return response.json();
};
interface DeleteParameterPayload {
  id: number;
  justificativa: string;
}
const deleteParameterAPI = async ({
  id,
  justificativa,
}: DeleteParameterPayload): Promise<ParameterValueAPI> => {
  const response = await fetch(`${API_BASE_URL}/parameters/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
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

// --- ADICIONAR ESTA FUNÇÃO ---
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
    `${API_BASE_URL}/parameters/history?${params.toString()}`
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
// -----------------------------

export const useParameters = (
  periodMesAno: string,
  initialSectorId?: number,
  initialCriterionId?: number,
  initialOnlyActive: boolean = true // Alterado para false na page.tsx para ver todas
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
      console.log('Parâmetro criado:', data); /* toast... */
    },
    onError: (error: Error) => {
      console.error('Erro ao criar parâmetro:', error.message); /* toast... */
    },
  });
  const updateParameterMutation = useMutation<
    ParameterValueAPI,
    Error,
    UpdateParameterPayload,
    unknown
  >({
    mutationFn: updateParameterAPI,
    onSuccess: (data) => {
      /* ... invalidateQueries ... */ console.log(
        'Parâmetro atualizado:',
        data
      ); /* toast... */
    },
    onError: (error: Error) => {
      console.error(
        'Erro ao atualizar parâmetro:',
        error.message
      ); /* toast... */
    },
  });
  const deleteParameterMutation = useMutation<
    ParameterValueAPI,
    Error,
    DeleteParameterPayload,
    unknown
  >({
    mutationFn: deleteParameterAPI,
    onSuccess: (data) => {
      /* ... invalidateQueries ... */ console.log(
        'Parâmetro deletado:',
        data
      ); /* toast... */
    },
    onError: (error: Error) => {
      console.error('Erro ao deletar parâmetro:', error.message); /* toast... */
    },
  });

  // --- ADICIONAR ESTA FUNÇÃO AO RETORNO ---
  const getParameterHistory = async (
    periodId: number,
    criterionId: number,
    sectorId?: number | null
  ) => {
    // Não usa useQuery aqui para ser uma chamada sob demanda
    try {
      return await fetchParameterHistory(periodId, criterionId, sectorId);
    } catch (error) {
      console.error('Erro ao buscar histórico no hook useParameters:', error);
      // toast.error(error.message || "Falha ao buscar histórico."); // O toast já está na page.tsx
      throw error; // Relança para o componente tratar
    }
  };
  // ------------------------------------

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
    getParameterHistory, // <<< EXPORTAR AQUI
  };
};
