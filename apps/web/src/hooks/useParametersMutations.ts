// hooks/useParametersMutations.ts (CORRIGIDO COMPLETO)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

// Schemas para validação (MANTIDOS INTACTOS)
export const createParameterSchema = z.object({
  nomeParametro: z.string().min(1, 'Nome da meta é obrigatório'),
  valor: z.coerce.number().min(0, 'Valor deve ser maior ou igual a zero'),
  dataInicioEfetivo: z.string().min(1, 'Data de início é obrigatória'),
  criterionId: z.coerce.number().min(1, 'Critério é obrigatório'),
  sectorId: z.coerce.number().min(1, 'Setor é obrigatório'),
  competitionPeriodId: z.coerce.number().min(1, 'Período é obrigatório'),
  justificativa: z.string().min(1, 'Justificativa é obrigatória'),
});

export const updateParameterSchema = z.object({
  id: z.number(),
  valor: z.coerce.number().min(0, 'Valor deve ser maior ou igual a zero'),
  dataInicioEfetivo: z.string().min(1, 'Data de início é obrigatória'),
  justificativa: z.string().min(1, 'Justificativa é obrigatória'),
  nomeParametro: z.string().min(1, 'Nome da meta é obrigatório'),
  dataFimEfetivoAnterior: z.string().optional(),
  criterionId: z.coerce.number().min(1, 'Critério é obrigatório').optional(),
  sectorId: z.coerce.number().min(1, 'Setor é obrigatório').optional(),
  competitionPeriodId: z.coerce
    .number()
    .min(1, 'Período é obrigatório')
    .optional(),
});

export const deleteParameterSchema = z.object({
  id: z.number(),
  justificativa: z.string().min(1, 'Justificativa é obrigatória'),
});

// Tipos para os formulários (MANTIDOS INTACTOS)
export type CreateParameterFormValues = z.infer<typeof createParameterSchema>;
export type UpdateParameterFormValues = z.infer<typeof updateParameterSchema>;
export type DeleteParameterFormValues = z.infer<typeof deleteParameterSchema>;

// Interface para o parâmetro (MANTIDA INTACTA)
export interface Parameter {
  id: number;
  nomeParametro: string;
  valor: number;
  dataInicioEfetivo: string;
  dataFimEfetivo?: string;
  criterionId: number;
  sectorId: number;
  competitionPeriodId: number;
  justificativa?: string;
}

// 🎯 FUNÇÃO CORRIGIDA 1: createParameter
const createParameter = async (
  data: CreateParameterFormValues
): Promise<Parameter> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${API_BASE_URL}/api/parameters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || `Erro ${res.status} ao criar meta`);
  }

  const responseData = await res.json();
  return responseData;
};

// 🎯 FUNÇÃO CORRIGIDA 2: updateParameter
const updateParameter = async (
  data: UpdateParameterFormValues
): Promise<Parameter> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Verificar se todos os campos obrigatórios estão presentes
  if (
    !data.id ||
    !data.justificativa ||
    !data.valor ||
    !data.dataInicioEfetivo ||
    !data.nomeParametro
  ) {
    console.error('Campos obrigatórios faltando para atualização:', {
      id: !!data.id,
      valor: !!data.valor,
      dataInicioEfetivo: !!data.dataInicioEfetivo,
      justificativa: !!data.justificativa,
      nomeParametro: !!data.nomeParametro,
    });
    throw new Error('Campos obrigatórios estão faltando para atualização.');
  }

  // Preparar o corpo da requisição (apenas os campos necessários)
  const requestBody = {
    valor: data.valor,
    dataInicioEfetivo: data.dataInicioEfetivo,
    justificativa: data.justificativa,
    nomeParametro: data.nomeParametro,
  };

  // Adicionar dataFimEfetivoAnterior se estiver presente
  if (data.dataFimEfetivoAnterior) {
    requestBody.dataFimEfetivoAnterior = data.dataFimEfetivoAnterior;
  }

  // Usar o endpoint PUT /api/parameters/:id
  const url = `${API_BASE_URL}/api/parameters/${data.id}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    let errorMessage = `Erro ${res.status} ao atualizar meta`;
    try {
      const errorData = await res.json();
      console.error('Erro na resposta de atualização:', errorData);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      console.error('Erro ao processar resposta de erro:', e);
    }
    throw new Error(errorMessage);
  }

  const responseData = await res.json();
  return responseData;
};

// 🎯 FUNÇÃO CORRIGIDA 3: deleteParameter
const deleteParameter = async (
  data: DeleteParameterFormValues
): Promise<Parameter> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${API_BASE_URL}/api/parameters/${data.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    // ✅ CORREÇÃO: Adicionar credentials para autenticação
    credentials: 'include',
    body: JSON.stringify({ justificativa: data.justificativa }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || `Erro ${res.status} ao deletar meta`);
  }

  const responseData = await res.json();
  return responseData;
};

// Hook principal (MANTIDO INTACTO)
export function useParametersMutations(selectedPeriod: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createParameter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results', selectedPeriod] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar meta: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateParameter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results', selectedPeriod] });
      toast.success('Meta atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteParameter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results', selectedPeriod] });
      toast.success('Meta expirada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao expirar meta: ${error.message}`);
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
