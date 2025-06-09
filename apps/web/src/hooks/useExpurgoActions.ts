// apps/web/src/hooks/expurgos/useExpurgoActions.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Tipos para as ações de expurgo
interface ApproveExpurgoData {
  valorAprovado: number;
  justificativaAprovacao: string;
  observacoes?: string;
}

interface RejectExpurgoData {
  justificativaRejeicao: string;
  observacoes?: string;
}

interface ExpurgoActionResponse {
  id: number;
  status: string;
  valorAprovado?: number;
  justificativaAprovacao?: string;
  aprovadoPor?: {
    id: number;
    nome: string;
  };
  aprovadoEm?: string;
}

// API functions
const approveExpurgo = async (
  expurgoId: number,
  data: ApproveExpurgoData
): Promise<ExpurgoActionResponse> => {
  const response = await fetch(
    `http://localhost:3001/api/expurgos/${expurgoId}/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao aprovar expurgo');
  }

  return response.json();
};

const rejectExpurgo = async (
  expurgoId: number,
  data: RejectExpurgoData
): Promise<ExpurgoActionResponse> => {
  const response = await fetch(
    `http://localhost:3001/api/expurgos/${expurgoId}/reject`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao rejeitar expurgo');
  }

  return response.json();
};

// Hook principal para ações de expurgo
export function useExpurgoActions() {
  const queryClient = useQueryClient();

  // Mutation para aprovar expurgo
  const approveMutation = useMutation({
    mutationFn: ({
      expurgoId,
      data,
    }: {
      expurgoId: number;
      data: ApproveExpurgoData;
    }) => approveExpurgo(expurgoId, data),
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['expurgos'] });
      queryClient.invalidateQueries({
        queryKey: ['expurgo', variables.expurgoId],
      });

      // Toast de sucesso
      const isPartial = data.status === 'APROVADO_PARCIAL';
      toast.success(
        `Expurgo ${isPartial ? 'aprovado parcialmente' : 'aprovado integralmente'}!`,
        {
          description: `Valor aprovado: ${data.valorAprovado || 'N/A'}`,
        }
      );
    },
    onError: (error: Error) => {
      toast.error('Erro ao aprovar expurgo', {
        description: error.message,
      });
    },
  });

  // Mutation para rejeitar expurgo
  const rejectMutation = useMutation({
    mutationFn: ({
      expurgoId,
      data,
    }: {
      expurgoId: number;
      data: RejectExpurgoData;
    }) => rejectExpurgo(expurgoId, data),
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['expurgos'] });
      queryClient.invalidateQueries({
        queryKey: ['expurgo', variables.expurgoId],
      });

      // Toast de sucesso
      toast.success('Expurgo rejeitado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao rejeitar expurgo', {
        description: error.message,
      });
    },
  });

  // Função para aprovar expurgo
  const handleApprove = async (expurgoId: number, data: ApproveExpurgoData) => {
    return approveMutation.mutateAsync({ expurgoId, data });
  };

  // Função para rejeitar expurgo
  const handleReject = async (expurgoId: number, data: RejectExpurgoData) => {
    return rejectMutation.mutateAsync({ expurgoId, data });
  };

  return {
    // Actions
    handleApprove,
    handleReject,

    // States
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isLoading: approveMutation.isPending || rejectMutation.isPending,

    // Errors
    approveError: approveMutation.error,
    rejectError: rejectMutation.error,
  };
}

// Hook específico para aprovar expurgo (mais granular)
export function useApproveExpurgo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      expurgoId,
      data,
    }: {
      expurgoId: number;
      data: ApproveExpurgoData;
    }) => approveExpurgo(expurgoId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expurgos'] });
      queryClient.invalidateQueries({
        queryKey: ['expurgo', variables.expurgoId],
      });

      const isPartial = data.status === 'APROVADO_PARCIAL';
      toast.success(
        `Expurgo ${isPartial ? 'aprovado parcialmente' : 'aprovado integralmente'}!`,
        {
          description: `Valor aprovado: ${data.valorAprovado || 'N/A'}`,
        }
      );
    },
    onError: (error: Error) => {
      toast.error('Erro ao aprovar expurgo', {
        description: error.message,
      });
    },
  });
}

// Hook específico para rejeitar expurgo (mais granular)
export function useRejectExpurgo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      expurgoId,
      data,
    }: {
      expurgoId: number;
      data: RejectExpurgoData;
    }) => rejectExpurgo(expurgoId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expurgos'] });
      queryClient.invalidateQueries({
        queryKey: ['expurgo', variables.expurgoId],
      });

      toast.success('Expurgo rejeitado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao rejeitar expurgo', {
        description: error.message,
      });
    },
  });
}
