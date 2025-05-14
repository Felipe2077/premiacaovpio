// apps/web/src/hooks/useParameters.ts (CORRIGIDO)
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
// Removido axios, vamos usar fetch como no seu padrão
// import axios from 'axios';
import { CreateParameterDto } from '@sistema-premiacao/shared-types';

// Tipagem para o retorno da API de parâmetros
export interface ParameterValueAPI {
  id: number;
  nomeParametro: string;
  valor: string;
  dataInicioEfetivo: string;
  dataFimEfetivo: string | null;
  criterionId: number;
  sectorId: number | null;
  competitionPeriodId: number;
  createdByUserId?: number; // Pode ser opcional se não sempre retornado
  justificativa?: string; // Pode ser opcional
  createdAt: string; // ou Date
  previousVersionId?: number | null;
  criterio?: { id: number; nome: string };
  setor?: { id: number; nome: string };
  competitionPeriod?: { id: number; mesAno: string };
  criadoPor?: { id: number; nome: string };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Função para buscar parâmetros/metas usando fetch
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

  if (!periodMesAno) {
    // Não faz a chamada se periodMesAno não estiver definido,
    // embora a opção 'enabled' no useQuery já deva cuidar disso.
    return Promise.resolve([]);
  }

  const params = new URLSearchParams();
  params.append('period', periodMesAno);
  if (sectorId !== undefined) params.append('sectorId', String(sectorId));
  if (criterionId !== undefined)
    params.append('criterionId', String(criterionId));
  // A API em ParameterService.findParametersForPeriod tem onlyActive: true por padrão
  // Para buscar todas, a API precisa de um param como onlyActive=false
  if (onlyActive === false) {
    // Verifica explicitamente por false
    params.append('onlyActive', 'false');
  }

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

// Função para criar um novo parâmetro/meta usando fetch
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

// TODO: Funções para updateParameter e deleteParameter

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

  // Correção Erro 1: useQuery com objeto de opções
  const {
    data: parameters,
    isLoading,
    error,
    refetch,
  } = useQuery<ParameterValueAPI[], Error>({
    queryKey: queryKey,
    queryFn: fetchParameters, // queryFn agora recebe um objeto com queryKey
    enabled: !!periodMesAno,
  });

  // Correção Erro 2: useMutation com mutationFn e options
  const createParameterMutation = useMutation<
    ParameterValueAPI, // TData (tipo do retorno do onSuccess)
    Error, // TError
    CreateParameterDto, // TVariables (tipo do input da mutationFn)
    unknown // TContext (tipo do contexto do onMutate)
  >({
    mutationFn: createParameter, // Passa a função de mutação
    onSuccess: (data: ParameterValueAPI) => {
      // Tipar 'data' explicitamente
      // Correção Erro 2 (invalidateQueries):
      queryClient.invalidateQueries({ queryKey: queryKey });
      console.log('Parâmetro criado com sucesso:', data);
      // TODO: Adicionar notificação de sucesso
    },
    onError: (error: Error) => {
      // Tipar 'error' explicitamente
      console.error('Erro ao criar parâmetro:', error.message);
      // TODO: Adicionar notificação de erro
    },
  });

  return {
    parameters: parameters || [],
    isLoadingParameters: isLoading,
    parametersError: error,
    refetchParameters: refetch,
    createParameter: createParameterMutation.mutateAsync,
    isCreatingParameter: createParameterMutation.isPending, // MUDAR PARA isPending
    createParameterError: createParameterMutation.error?.message,
  };
};
