// hooks/useParametersData.ts
import {
  Criterio as Criterion,
  RegrasAplicadasPadrao,
} from '@sistema-premiacao/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export interface Period {
  id: number;
  mesAno: string;
  status: 'ATIVA' | 'FECHADA' | 'PLANEJAMENTO';
  dataInicio: string;
  dataFim: string;
}

export interface Sector {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface ResultData {
  setorId: number;
  setorNome: string;
  criterioId: number;
  criterioNome: string;
  periodo: string;
  valorRealizado: number | null;
  valorMeta: number | null;
  percentualAtingimento: number | null;
  pontos: number | null;
  metaPropostaPadrao: number | null;
  metaAnteriorValor: number | null;
  metaAnteriorPeriodo: number | null;
  regrasAplicadasPadrao: RegrasAplicadasPadrao | null; // ✅ CORRIGIR TIPO
  metaDefinidaValor: number | null; // ✅ ADICIONAR
  isMetaDefinida: boolean; // ✅ ADICIONAR
}

const API_BASE_URL = 'http://localhost:3001';

export function useParametersData(selectedPeriod?: string) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [results, setResults] = useState<ResultData[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [isLoadingSectors, setIsLoadingSectors] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adicionar função para buscar configurações de cálculo
  const fetchCriterionCalculationSettings = async (criterionId: number) => {
    try {
      const response = await fetch(
        `/api/criteria/${criterionId}/calculation-settings`
      );
      console.log('[DEBUG] 📊 Response status:', response.status);
      console.log('[DEBUG] 📊 Response OK:', response.ok);

      if (response.status === 404) {
        return {
          criterionId,
          calculationMethod: 'media3',
          adjustmentPercentage: 0,
          requiresRounding: true,
          roundingMethod: 'nearest',
          roundingDecimalPlaces: 0,
        };
      }

      if (!response.ok) {
        console.warn(
          `Erro ${response.status} ao buscar configurações: ${response.statusText}`
        );
        console.log('[DEBUG] ❌ Response failed:', await response.text());

        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            errorData.error ||
            `Erro ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('[DEBUG] 📦 Raw data received:', data);
      console.log('[DEBUG] 📦 First item setorId:', data[0]?.setorId);

      // Se não houver configurações, o backend retorna defaultSettings
      if (data.defaultSettings) {
        return data.defaultSettings;
      }

      return data;
    } catch (error) {
      console.error('Erro ao carregar configurações de cálculo:', error);

      // Retornar configurações padrão em caso de erro
      return {
        criterionId,
        calculationMethod: 'media3',
        adjustmentPercentage: 0,
        requiresRounding: true,
        roundingMethod: 'nearest',
        roundingDecimalPlaces: 0,
      };
    }
  };
  // Função para buscar períodos
  const fetchPeriods = useCallback(async () => {
    setIsLoadingPeriods(true);
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(
        `${API_BASE_URL}/api/periods?_t=${timestamp}`
      );
      if (!response.ok) {
        throw new Error('Falha ao buscar períodos');
      }
      const data = await response.json();
      setPeriods(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar períodos:', error);
      setError('Falha ao carregar períodos. Tente novamente mais tarde.');
      return [];
    } finally {
      setIsLoadingPeriods(false);
    }
  }, []);

  // Função para buscar resultados
  const fetchResults = useCallback(
    async (period: string): Promise<ResultData[]> => {
      // Ou Promise<EntradaResultadoDetalhado[]>

      setIsLoadingResults(true);
      setError(null);
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(
          `${API_BASE_URL}/api/results/by-period?period=${period}&_t=${timestamp}`
        );

        if (!response.ok) {
          // Tenta pegar uma mensagem de erro mais detalhada do corpo da resposta
          let errorMessage = `Falha ao buscar resultados para o período ${period}. Status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            // Ignora erro ao fazer parse do JSON de erro, mantém a mensagem de status
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log(
          `[useParametersData] Resultados recebidos para ${period}:`,
          data.length > 0 ? data[0] : 'Array vazio ou dados ausentes'
        ); // Log do primeiro item

        setResults(data);
        return data;
      } catch (error: any) {
        console.error(
          `[useParametersData] Erro final ao buscar resultados para o período ${period}:`,
          error
        );
        setError(
          error.message ||
            'Falha ao carregar resultados. Verifique o console do backend.'
        );
        toast.error(
          `Erro ao carregar resultados para ${period}: ${error.message}`
        );
        setResults([]); // Limpa os resultados em caso de erro
        return []; // Retorna array vazio para manter a consistência do tipo de retorno
      } finally {
        setIsLoadingResults(false);
      }
    },
    [setResults, setIsLoadingResults, setError]
  ); // Dependências do useCallback

  // Função para buscar critérios
  const fetchCriteria = useCallback(async () => {
    setIsLoadingCriteria(true);
    try {
      const timestamp = new Date().getTime();
      // Usar o endpoint correto para critérios ativos
      const response = await fetch(
        `${API_BASE_URL}/api/criteria/active?_t=${timestamp}`
      );
      if (!response.ok) {
        throw new Error('Falha ao buscar critérios');
      }
      const data = await response.json();

      setCriteria(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar critérios:', error);
      setError('Falha ao carregar critérios. Tente novamente mais tarde.');
      return [];
    } finally {
      setIsLoadingCriteria(false);
    }
  }, []);

  // Função para buscar setores
  const fetchSectors = useCallback(async () => {
    setIsLoadingSectors(true);
    try {
      const timestamp = new Date().getTime();
      // Usar o endpoint correto para setores ativos
      const response = await fetch(
        `${API_BASE_URL}/api/sectors/active?_t=${timestamp}`
      );
      if (!response.ok) {
        throw new Error('Falha ao buscar setores');
      }
      const data = await response.json();
      setSectors(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      setError('Falha ao carregar setores. Tente novamente mais tarde.');
      return [];
    } finally {
      setIsLoadingSectors(false);
    }
  }, []);

  // Função para buscar todos os dados
  const fetchAllData = useCallback(
    async (period?: string) => {
      setError(null);
      try {
        // Buscar períodos primeiro
        const periodsData = await fetchPeriods();

        // Se não houver período especificado, usar o período ATIVO ou o mais recente
        let targetPeriod = period;
        if (!targetPeriod && periodsData.length > 0) {
          const activePeriod = periodsData.find(
            (p: Period) => p.status === 'ATIVA'
          );
          if (activePeriod) {
            targetPeriod = activePeriod.mesAno;
          } else {
            // Ordenar períodos por data de início (decrescente)
            const sortedPeriods = [...periodsData].sort((a, b) => {
              return (
                new Date(b.dataInicio).getTime() -
                new Date(a.dataInicio).getTime()
              );
            });
            if (sortedPeriods.length > 0) {
              targetPeriod = sortedPeriods[0].mesAno;
            }
          }
        }

        // Buscar resultados se houver um período alvo
        if (targetPeriod) {
          await fetchResults(targetPeriod);
        } else {
          console.warn('Nenhum período encontrado para buscar resultados');
          setResults([]);
        }

        // Buscar critérios e setores em paralelo
        await Promise.all([fetchCriteria(), fetchSectors()]);

        return {
          periods: periodsData,
          targetPeriod,
        };
      } catch (error) {
        console.error('Erro ao buscar todos os dados:', error);
        setError('Falha ao carregar dados. Tente novamente mais tarde.');
        toast.error('Erro ao carregar dados. Tente novamente mais tarde.');
        return {
          periods: [],
          targetPeriod: undefined,
        };
      }
    },
    [fetchPeriods, fetchResults, fetchCriteria, fetchSectors]
  );

  // Função para forçar a atualização dos resultados
  const refetchResults = useCallback(
    async (period?: string) => {
      const periodToFetch = period || selectedPeriod;
      if (!periodToFetch) {
        console.error('Nenhum período especificado para refetch');
        return [];
      }

      try {
        // Limpar o cache do navegador para esta URL
        try {
          const cache = await caches.open('v1');
          const url = `${API_BASE_URL}/api/results?period=${periodToFetch}`;
          console.log('[DEBUG] 🔍 URL REAL sendo chamada:', url);

          await cache.delete(url);
        } catch (cacheError) {
          console.warn('Erro ao limpar cache:', cacheError);
        }

        // Buscar resultados novamente
        return await fetchResults(periodToFetch);
      } catch (error) {
        console.error(
          `Erro ao forçar refetch para período ${periodToFetch}:`,
          error
        );
        toast.error('Erro ao atualizar resultados. Tente novamente.');
        return [];
      }
    },
    [fetchResults, selectedPeriod]
  );

  // Função para buscar um período específico por ID
  const getPeriodById = useCallback(
    (id: number) => {
      return periods.find((p) => p.id === id);
    },
    [periods]
  );

  // Função para buscar um período específico por mesAno
  const getPeriodByMesAno = useCallback(
    (mesAno: string) => {
      return periods.find((p) => p.mesAno === mesAno);
    },
    [periods]
  );

  // Função para buscar um critério específico por ID
  const getCriterionById = useCallback(
    (id: number) => {
      return criteria.find((c) => c.id === id);
    },
    [criteria]
  );

  // Função para buscar um setor específico por ID
  const getSectorById = useCallback(
    (id: number) => {
      return sectors.find((s) => s.id === id);
    },
    [sectors]
  );

  // Função para buscar resultados filtrados por critério e/ou setor
  const getFilteredResults = useCallback(
    (criterionId?: number, sectorId?: number) => {
      let filtered = [...results];

      if (criterionId !== undefined) {
        filtered = filtered.filter((r) => r.criterioId === criterionId);
      }

      if (sectorId !== undefined) {
        filtered = filtered.filter((r) => r.setorId === sectorId);
      }

      return filtered;
    },
    [results]
  );

  // NOVO: Processar resultados por setor
  const resultsBySector = useMemo(() => {
    if (!results || results.length === 0) {
      return {};
    }

    const bySector = {};

    results.forEach((result) => {
      const sectorId = String(result.setorId);
      const criterioId = String(result.criterioId);

      if (!bySector[sectorId]) {
        bySector[sectorId] = {
          setorId: result.setorId,
          setorNome: result.setorNome,
          criterios: {},
        };
      }

      // 🎯 CORREÇÃO PRINCIPAL: Incluir setorId em cada critério
      bySector[sectorId].criterios[criterioId] = {
        criterioId: result.criterioId,
        criterioNome: result.criterioNome,
        setorId: result.setorId,
        setorNome: result.setorNome,
        valorRealizado: result.valorRealizado,
        valorMeta: result.valorMeta,
        percentualAtingimento: result.percentualAtingimento,
        pontos: result.pontos,
        metaPropostaPadrao: result.metaPropostaPadrao,
        metaAnteriorValor: result.metaAnteriorValor,
        metaAnteriorPeriodo: result.metaAnteriorPeriodo,
        regrasAplicadasPadrao: result.regrasAplicadasPadrao,
        metaDefinidaValor: result.metaDefinidaValor,
        isMetaDefinida: result.isMetaDefinida,
      };
    });

    return bySector;
  }, [results]);

  // NOVO: Processar resultados por critério
  const resultsByCriterio = useMemo(() => {
    if (!results || results.length === 0) {
      return {};
    }

    const byCriterio = {};

    results.forEach((result) => {
      const criterioId = String(result.criterioId);
      const sectorId = String(result.setorId);

      if (!byCriterio[criterioId]) {
        byCriterio[criterioId] = {
          criterioId: result.criterioId,
          criterioNome: result.criterioNome,
          setores: {},
        };
      }

      byCriterio[criterioId].setores[sectorId] = {
        valorRealizado: result.valorRealizado,
        valorMeta: result.valorMeta,
        percentualAtingimento: result.percentualAtingimento,
        pontos: result.pontos,
      };
    });

    return byCriterio;
  }, [results]);

  // NOVO: Extrair critérios únicos dos resultados
  const uniqueCriteria = useMemo(() => {
    if (!criteria || criteria.length === 0) {
      return [];
    }

    const criteriaMap = new Map();

    // Primeiro adicionar todos os critérios da lista de critérios
    criteria.forEach((criterion) => {
      criteriaMap.set(criterion.id, {
        id: criterion.id,
        nome: criterion.nome,
        sentido_melhor: criterion.sentido_melhor,
        index: criterion.index,
        descricao: criterion.descricao,
        ativo: criterion.ativo,
        // unidade_medida: criterion.unidade_medida, // Se fizesse parte da interface local
        casasDecimaisPadrao: criterion.casasDecimaisPadrao, // <<< ADICIONE ESTA LINHA
      });
    });

    // Depois adicionar critérios dos resultados (caso haja algum que não esteja na lista de critérios)
    if (results && results.length > 0) {
      results.forEach((result) => {
        if (!criteriaMap.has(result.criterioId)) {
          criteriaMap.set(result.criterioId, {
            id: result.criterioId,
            nome: result.criterioNome,
          });
        }
      });
    }

    // Converter o Map para array e ordenar por index ou id
    const uniqueCriteriaArray = Array.from(criteriaMap.values()).sort(
      (a, b) => {
        // Ordenar por index se disponível, senão por id
        if (a.index !== undefined && b.index !== undefined) {
          return a.index - b.index;
        }
        return a.id - b.id;
      }
    );
    if (uniqueCriteriaArray.length > 0) {
    }

    return uniqueCriteriaArray;
  }, [results, criteria]);

  const fetchParameterByCriteriaSector = useCallback(
    async (
      criterionId: number,
      sectorId: number,
      periodId: number
    ): Promise<any | null> => {
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(
          `${API_BASE_URL}/api/parameters?period=${getPeriodById(periodId)?.mesAno}&criterionId=${criterionId}&sectorId=${sectorId}&_t=${timestamp}`
        );

        if (!response.ok) {
          console.warn(
            `Erro ${response.status} ao buscar parâmetro específico`
          );
          return null;
        }

        const data = await response.json();

        // A API retorna um array, pegar o primeiro (deveria ser único)
        if (Array.isArray(data) && data.length > 0) {
          return data[0];
        }

        console.warn(
          'Nenhum parâmetro encontrado para os critérios especificados'
        );
        return null;
      } catch (error) {
        console.error('Erro ao buscar parâmetro específico:', error);
        return null;
      }
    },
    [periods] // Dependência para acessar getPeriodById
  );

  // Efeito para carregar dados iniciais
  useEffect(() => {
    fetchAllData(selectedPeriod);
  }, [fetchAllData, selectedPeriod]);

  // Efeito para recarregar resultados quando o período selecionado mudar
  useEffect(() => {
    if (selectedPeriod) {
      fetchResults(selectedPeriod);
    }
  }, [selectedPeriod, fetchResults]);

  return {
    periods,
    criteria,
    sectors,
    results,
    resultsBySector, // NOVO
    resultsByCriterio, // NOVO
    uniqueCriteria, // NOVO
    isLoadingPeriods,
    isLoadingCriteria,
    isLoadingSectors,
    isLoadingResults,
    isLoading:
      isLoadingPeriods ||
      isLoadingCriteria ||
      isLoadingSectors ||
      isLoadingResults, // NOVO
    error,
    fetchPeriods,
    fetchCriteria,
    fetchSectors,
    fetchResults,
    fetchAllData,
    refetchResults,
    getPeriodById,
    getPeriodByMesAno,
    getCriterionById,
    getSectorById,
    getFilteredResults,
    fetchCriterionCalculationSettings,
    fetchParameterByCriteriaSector,
  };
}
