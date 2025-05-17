// hooks/useDropdownData.ts
import {
  apiService,
  CriterionForSelect,
  SectorForSelect,
} from '@/services/api-service';
import { useQuery } from '@tanstack/react-query';

export function useDropdownData() {
  const {
    data: activeCriteria,
    isLoading: isLoadingCriteria,
    error: criteriaError,
  } = useQuery<CriterionForSelect[]>({
    queryKey: ['activeCriteriaSimpleForParams'],
    queryFn: apiService.fetchActiveCriteriaSimple,
    staleTime: Infinity,
  });

  const {
    data: activeSectors,
    isLoading: isLoadingSectors,
    error: sectorsError,
  } = useQuery<SectorForSelect[]>({
    queryKey: ['activeSectorsSimpleForParams'],
    queryFn: apiService.fetchActiveSectorsSimple,
    staleTime: Infinity,
  });

  return {
    activeCriteria: activeCriteria || [],
    activeSectors: activeSectors || [],
    isLoading: isLoadingCriteria || isLoadingSectors,
    error: criteriaError || sectorsError,
  };
}
