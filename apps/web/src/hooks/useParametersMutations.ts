// hooks/useParametersMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

// Schemas para validação
export const createParameterSchema = z.object({
  nomeParametro: z.string().min(1, 'Nome da meta é obrigatório'),
  valor: z.coerce.number().min(0, 'Valor deve ser maior ou igual a zero'),
  dataInicioEfetivo: z.string().min(1, 'Data de início é obrigatória'),
  criterionId: z.coerce.number().min(1, 'Critério é obrigatório'),
  sectorId: z.coerce.number().min(1, 'Setor é obrigatório'),
  competitionPeriodId: z.coerce.number().min(1, 'Período é obrigatório'),
});

export const updateParameterSchema = z.object({
  id: z.number(),
  nomeParametro: z.string().min(1, 'Nome da meta é obrigatório'),
  valor: z.coerce.number().min(0, 'Valor deve ser maior ou igual a zero'),
  dataInicioEfetivo: z.string().min(1, 'Data de início é obrigatória'),
  criterionId: z.coerce.number().min(1, 'Critério é obrigatório'),
  sectorId: z.coerce.number().min(1, 'Setor é obrigatório'),
  competitionPeriodId: z.coerce.number().min(1, 'Período é obrigatório'),
  justificativa: z.string().min(1, 'Justificativa é obrigatória'),
});

export const deleteParameterSchema = z.object({
  id: z.number(),
  justificativa: z.string().min(1, 'Justificativa é obrigatória'),
});

// Tipos para os formulários
export type CreateParameterFormValues = z.infer<typeof createParameterSchema>;
export type UpdateParameterFormValues = z.infer<typeof updateParameterSchema>;
export type DeleteParameterFormValues = z.infer<typeof deleteParameterSchema>;

// Interface para o parâmetro
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

// Funções de mutação
const createParameter = async (
  data: CreateParameterFormValues
): Promise<Parameter> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('Criando meta:', data);
  const res = await fetch(`${API_BASE_URL}/api/parameters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || `Erro ${res.status} ao criar meta`);
  }

  const responseData = await res.json();
  console.log('Meta criada:', responseData);
  return responseData;
};

const updateParameter = async (
  data: UpdateParameterFormValues
): Promise<Parameter> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('Atualizando meta:', data);
  const res = await fetch(`${API_BASE_URL}/api/parameters/${data.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || `Erro ${res.status} ao atualizar meta`);
  }

  const responseData = await res.json();
  console.log('Meta atualizada:', responseData);
  return responseData;
};

const deleteParameter = async (
  data: DeleteParameterFormValues
): Promise<Parameter> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('Deletando meta:', data);
  const res = await fetch(`${API_BASE_URL}/api/parameters/${data.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ justificativa: data.justificativa }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || `Erro ${res.status} ao deletar meta`);
  }

  const responseData = await res.json();
  console.log('Meta deletada:', responseData);
  return responseData;
};

// Hook principal
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
