// hooks/useCompetitionPeriods.ts
import { apiService, CompetitionPeriodForSelect } from '@/services/api-service';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

// hooks/useCompetitionPeriods.ts
export function useCompetitionPeriods() {
  const [selectedPeriodMesAno, setSelectedPeriodMesAno] = useState<string>('');

  const {
    data: competitionPeriodsData,
    isLoading,
    error,
  } = useQuery<CompetitionPeriodForSelect[]>({
    queryKey: ['competitionPeriodsForAdminParamsPage'],
    queryFn: apiService.fetchCompetitionPeriodsForSelect,
    staleTime: 1000 * 60 * 15, // 15 minutos
  });

  const competitionPeriods = competitionPeriodsData || [];

  // Efeito para definir o período inicial - MODIFICADO
  useEffect(() => {
    // Só roda se os períodos foram carregados
    if (competitionPeriods.length > 0) {
      // Tenta pegar do localStorage
      let initialPeriodToSet = '';
      if (typeof window !== 'undefined') {
        const savedPeriod = localStorage.getItem(
          'selectedAdminParameterPeriod'
        );

        // Verifica se o período salvo existe na lista de períodos
        if (
          savedPeriod &&
          competitionPeriods.find((p) => p.mesAno === savedPeriod)
        ) {
          initialPeriodToSet = savedPeriod;
        }
      }

      // Se não achou no localStorage ou não é válido, define um default
      if (!initialPeriodToSet) {
        const planningPeriod = competitionPeriods.find(
          (p) => p.status === 'PLANEJAMENTO'
        );
        const activePeriod = competitionPeriods.find(
          (p) => p.status === 'ATIVA'
        );

        // Fallback para o período mais recente
        const sortedPeriods = [...competitionPeriods].sort(
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

      // Define o período selecionado
      if (initialPeriodToSet && initialPeriodToSet !== selectedPeriodMesAno) {
        setSelectedPeriodMesAno(initialPeriodToSet);

        // Salva no localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'selectedAdminParameterPeriod',
            initialPeriodToSet
          );
        }
      }
    }
  }, [competitionPeriods]); // Removido selectedPeriodMesAno da dependência para evitar loop

  // Efeito para salvar no localStorage quando o usuário muda o período manualmente
  const saveToLocalStorage = useCallback((period: string) => {
    if (typeof window !== 'undefined' && period) {
      localStorage.setItem('selectedAdminParameterPeriod', period);
    }
  }, []);

  // Função para mudar o período selecionado
  const changePeriod = useCallback(
    (period: string) => {
      setSelectedPeriodMesAno(period);
      saveToLocalStorage(period);
    },
    [saveToLocalStorage]
  );

  return {
    competitionPeriods,
    selectedPeriodMesAno,
    setSelectedPeriodMesAno: changePeriod, // Usando a função que também salva no localStorage
    isLoading,
    error,
  };
}
