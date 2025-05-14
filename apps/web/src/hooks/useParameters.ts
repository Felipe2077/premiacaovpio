// apps/web/src/hooks/useParameters.ts (ADICIONANDO UPDATE E DELETE)
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

// Interface ParameterValueAPI como antes
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
  competitionPeriod?: { id: number; mesAno: string; status?: string }; // Adicionado status
  criadoPor?: { id: number; nome: string };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// fetchParameters e createParameter como antes
const fetchParameters = async ({
  queryKey,
}: {
  queryKey: QueryKey;
}): Promise<ParameterValueAPI[]> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// --- NOVAS FUNÇÕES PARA UPDATE E DELETE ---
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
  justificativa: string; // Justificativa é obrigatória para o DELETE no backend
}

const deleteParameterAPI = async ({
  id,
  justificativa,
}: DeleteParameterPayload): Promise<ParameterValueAPI> => {
  const response = await fetch(`${API_BASE_URL}/parameters/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ justificativa }), // API espera a justificativa no corpo
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      errorData.message || `Erro ao deletar parâmetro: ${response.status}`
    );
  }
  return response.json(); // Retorna o parâmetro "expirado"
};
// ---------------------------------------

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
      console.log('Parâmetro criado com sucesso:', data);
      // toast.success(`Meta "${data.nomeParametro}" criada!`);
    },
    onError: (error: Error) => {
      console.error('Erro ao criar parâmetro:', error.message);
      // toast.error(`Falha ao criar meta: ${error.message}`);
    },
  });

  // --- NOVAS MUTAÇÕES ---
  const updateParameterMutation = useMutation<
    ParameterValueAPI,
    Error,
    UpdateParameterPayload,
    unknown
  >({
    mutationFn: updateParameterAPI,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKey }); // Invalida a lista para mostrar a nova versão e a antiga expirada
      queryClient.invalidateQueries({ queryKey: ['parameter', data.id] }); // Se houver query de buscar por ID
      queryClient.invalidateQueries({
        queryKey: [
          'parameterHistory',
          data.competitionPeriodId,
          data.criterionId,
          data.sectorId,
        ],
      }); // Invalida histórico
      console.log('Parâmetro atualizado com sucesso (nova versão):', data);
      // toast.success(`Meta "${data.nomeParametro}" atualizada!`);
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar parâmetro:', error.message);
      // toast.error(`Falha ao atualizar meta: ${error.message}`);
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
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({
        queryKey: [
          'parameterHistory',
          data.competitionPeriodId,
          data.criterionId,
          data.sectorId,
        ],
      });
      console.log('Parâmetro deletado (logicamente) com sucesso:', data);
      // toast.success(`Meta "${data.nomeParametro}" deletada!`);
    },
    onError: (error: Error) => {
      console.error('Erro ao deletar parâmetro:', error.message);
      // toast.error(`Falha ao deletar meta: ${error.message}`);
    },
  });
  // --------------------

  return {
    parameters: parameters || [],
    isLoadingParameters,
    parametersError,
    refetchParameters,
    createParameter: createParameterMutation.mutateAsync,
    isCreatingParameter: createParameterMutation.isPending,
    createParameterError: createParameterMutation.error?.message,
    // --- EXPOR NOVAS FUNÇÕES E ESTADOS ---
    updateParameter: updateParameterMutation.mutateAsync,
    isUpdatingParameter: updateParameterMutation.isPending,
    updateParameterError: updateParameterMutation.error?.message,
    deleteParameter: deleteParameterMutation.mutateAsync,
    isDeletingParameter: deleteParameterMutation.isPending,
    deleteParameterError: deleteParameterMutation.error?.message,
    // ------------------------------------
  };
};
