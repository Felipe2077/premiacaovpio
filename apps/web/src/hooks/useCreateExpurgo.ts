// apps/web/src/hooks/expurgos/useCreateExpurgo.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Tipo para dados de criação de expurgo
interface CreateExpurgoData {
  competitionPeriodId: number;
  sectorId: number;
  criterionId: number;
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorSolicitado: number;
}

// Tipo de resposta da API
interface CreateExpurgoResponse {
  id: number;
  competitionPeriodId: number;
  sectorId: number;
  criterionId: number;
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorSolicitado: number;
  status: 'PENDENTE';
  registradoPorUserId: number;
  createdAt: string;

  // Dados relacionados
  competitionPeriod?: {
    id: number;
    mesAno: string;
    status: string;
  };
  sector?: {
    id: number;
    nome: string;
  };
  criterion?: {
    id: number;
    nome: string;
    unidade_medida?: string;
  };
  registradoPor?: {
    id: number;
    nome: string;
    email: string;
  };
}

// Função para criar expurgo via API
const createExpurgo = async (
  data: CreateExpurgoData
): Promise<CreateExpurgoResponse> => {
  const response = await fetch('http://localhost:3001/api/expurgos/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao criar expurgo');
  }

  return response.json();
};

// Hook principal para criação de expurgo
export function useCreateExpurgo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExpurgo,
    onSuccess: (data) => {
      // Invalidar queries relacionadas para forçar reload
      queryClient.invalidateQueries({ queryKey: ['expurgos'] });

      // Toast de sucesso com informações específicas
      toast.success('Expurgo solicitado com sucesso!', {
        description: `Solicitação #${data.id} criada para ${data.sector?.nome || 'setor'} - ${data.criterion?.nome || 'critério'}`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      // Toast de erro com detalhes
      toast.error('Erro ao solicitar expurgo', {
        description: error.message,
        duration: 5000,
      });
    },
  });
}

// Hook específico para validação prévia
export function useValidateExpurgoData() {
  const validateData = (data: CreateExpurgoData): string[] => {
    const errors: string[] = [];

    // Validação de campos obrigatórios
    if (!data.competitionPeriodId) {
      errors.push('Período de competição é obrigatório');
    }

    if (!data.sectorId) {
      errors.push('Setor é obrigatório');
    }

    if (!data.criterionId) {
      errors.push('Critério é obrigatório');
    }

    if (!data.dataEvento) {
      errors.push('Data do evento é obrigatória');
    }

    if (!data.descricaoEvento || data.descricaoEvento.trim().length < 10) {
      errors.push('Descrição deve ter pelo menos 10 caracteres');
    }

    if (
      !data.justificativaSolicitacao ||
      data.justificativaSolicitacao.trim().length < 20
    ) {
      errors.push('Justificativa deve ter pelo menos 20 caracteres');
    }

    if (!data.valorSolicitado || data.valorSolicitado <= 0) {
      errors.push('Valor solicitado deve ser maior que zero');
    }

    // Validação de data (não pode ser futura)
    if (data.dataEvento) {
      const eventDate = new Date(data.dataEvento);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Permitir hoje até o final do dia

      if (eventDate > today) {
        errors.push('Data do evento não pode ser no futuro');
      }
    }

    // Validação de formato de data
    if (data.dataEvento && !/^\d{4}-\d{2}-\d{2}$/.test(data.dataEvento)) {
      errors.push('Formato de data inválido');
    }

    return errors;
  };

  return { validateData };
}

// Hook para buscar períodos disponíveis
export function useAvailablePeriods() {
  return useQuery({
    queryKey: ['available-periods'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/periods');
      if (!response.ok) {
        throw new Error('Erro ao buscar períodos');
      }
      const data = await response.json();

      // Filtrar apenas períodos em PLANEJAMENTO ou ATIVA
      return data.filter(
        (period: any) =>
          period.status === 'PLANEJAMENTO' || period.status === 'ATIVA'
      );
    },
    staleTime: 60000, // 1 minuto
  });
}

// Hook para pré-validação de critérios elegíveis
export function useEligibleCriteria(criterios: any[] = []) {
  const eligibleCriteriaNames = [
    'QUEBRA',
    'DEFEITO',
    'KM OCIOSA',
    'FALTA FUNC',
    'ATRASO',
    'PEÇAS',
    'PNEUS',
  ];

  const eligibleCriteria = criterios.filter((criterio) =>
    eligibleCriteriaNames.includes(criterio.nome.toUpperCase())
  );

  return {
    eligibleCriteria,
    isEligible: (criterioId: number) =>
      eligibleCriteria.some((c) => c.id === criterioId),
    eligibleCount: eligibleCriteria.length,
    totalCount: criterios.length,
  };
}
