// hooks/useParametersForms.ts
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ResultData } from './useParametersData';
import {
  CreateParameterFormValues,
  createParameterSchema,
  DeleteParameterFormValues,
  deleteParameterSchema,
  UpdateParameterFormValues,
  updateParameterSchema,
} from './useParametersMutations';

export function useParametersForms(selectedPeriod: string, periods: any[]) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Formulários
  const createForm = useForm<CreateParameterFormValues>({
    resolver: zodResolver(createParameterSchema),
    defaultValues: {
      nomeParametro: '',
      valor: 0,
      dataInicioEfetivo: todayStr,
      criterionId: 0,
      sectorId: 0,
      competitionPeriodId: 0,
      justificativa: 'Criação inicial da meta', // Adicionando justificativa padrão
    },
  });

  const updateForm = useForm<UpdateParameterFormValues>({
    resolver: zodResolver(updateParameterSchema),
    defaultValues: {
      id: 0,
      nomeParametro: '',
      valor: 0,
      dataInicioEfetivo: todayStr,
      criterionId: 0,
      sectorId: 0,
      competitionPeriodId: 0,
      justificativa: '',
    },
  });

  const deleteForm = useForm<DeleteParameterFormValues>({
    resolver: zodResolver(deleteParameterSchema),
    defaultValues: {
      id: 0,
      justificativa: '',
    },
  });

  // Atualizar formulário de criação quando o período mudar
  useEffect(() => {
    if (selectedPeriod && periods) {
      const selectedPeriodObj = periods.find(
        (p) => p.mesAno === selectedPeriod
      );
      if (selectedPeriodObj) {
        createForm.setValue('competitionPeriodId', selectedPeriodObj.id);
      }
    }
  }, [selectedPeriod, periods, createForm]);

  // Funções para resetar formulários
  const resetCreateForm = (criterionId?: number, sectorId?: number) => {
    const periodId = periods?.find((p) => p.mesAno === selectedPeriod)?.id || 0;

    createForm.reset({
      nomeParametro: '',
      valor: 0,
      dataInicioEfetivo: todayStr,
      criterionId: criterionId || 0,
      sectorId: sectorId || 0,
      competitionPeriodId: periodId,
      justificativa: 'Criação inicial da meta', // Adicionando justificativa padrão
    });
  };

  const resetUpdateForm = (item: ResultData) => {
    const periodId = periods?.find((p) => p.mesAno === selectedPeriod)?.id || 0;

    updateForm.reset({
      id: 0, // Precisamos buscar o ID real do parâmetro
      nomeParametro: item.criterioNome,
      valor: item.valorMeta,
      dataInicioEfetivo: todayStr,
      criterionId: item.criterioId,
      sectorId: item.setorId,
      competitionPeriodId: periodId,
      justificativa: '',
    });
  };

  const resetDeleteForm = () => {
    deleteForm.reset({
      id: 0,
      justificativa: '',
    });
  };

  return {
    createForm,
    updateForm,
    deleteForm,
    resetCreateForm,
    resetUpdateForm,
    resetDeleteForm,
    todayStr,
  };
}
