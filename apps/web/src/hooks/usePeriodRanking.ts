// hooks/usePeriodRanking.ts - VERSÃO CORRIGIDA
import { useCallback, useEffect, useState } from 'react';

interface RankingEntry {
  RANK: number;
  SETOR: string;
  PONTUACAO: number;
}

interface RankingForShare {
  position: number;
  setor: string;
  pontos: number;
  isWinner: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function usePeriodRanking(period: string | null) {
  const [ranking, setRanking] = useState<RankingForShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async (periodMesAno: string) => {
    if (!periodMesAno) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(
        '🔍 [usePeriodRanking] Buscando ranking para período:',
        periodMesAno
      );

      // ✅ CORREÇÃO: URL da API (sem duplicar /api se já está no base)
      const apiUrl = API_BASE_URL
        ? `${API_BASE_URL}/api/ranking?period=${periodMesAno}`
        : `/api/ranking?period=${periodMesAno}`;

      console.log('🌐 [usePeriodRanking] URL da requisição:', apiUrl);

      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('📡 [usePeriodRanking] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data: RankingEntry[] = await response.json();
      console.log('📊 [usePeriodRanking] Dados recebidos da API:', data);

      // ✅ CORREÇÃO: Validação mais robusta dos dados
      if (!Array.isArray(data)) {
        console.warn('⚠️ [usePeriodRanking] API não retornou um array:', data);
        throw new Error('Resposta da API em formato inválido');
      }

      if (data.length === 0) {
        console.warn(
          '⚠️ [usePeriodRanking] API retornou array vazio para período:',
          periodMesAno
        );
        setRanking([]);
        return;
      }

      // ✅ CORREÇÃO: Transformação mais segura dos dados
      const rankingForShare = data
        .filter((item) => item && typeof item === 'object') // Filtrar itens válidos
        .map((item, index) => {
          // Validar campos obrigatórios
          if (
            typeof item.RANK !== 'number' ||
            !item.SETOR ||
            typeof item.PONTUACAO !== 'number'
          ) {
            console.warn(
              '⚠️ [usePeriodRanking] Item com dados incompletos:',
              item
            );
            return null;
          }

          return {
            position: item.RANK,
            setor: item.SETOR,
            pontos: item.PONTUACAO,
            isWinner: item.RANK === 1,
          };
        })
        .filter(Boolean) as RankingForShare[]; // Remove itens null

      console.log(
        '🏆 [usePeriodRanking] Ranking formatado para compartilhamento:',
        rankingForShare
      );

      if (rankingForShare.length === 0) {
        console.warn(
          '⚠️ [usePeriodRanking] Nenhum item válido após transformação'
        );
      }

      setRanking(rankingForShare);
    } catch (err: any) {
      console.error('❌ [usePeriodRanking] Erro ao buscar ranking:', {
        error: err,
        message: err.message,
        period: periodMesAno,
      });
      setError(err.message || 'Erro ao buscar ranking');
      setRanking([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period) {
      console.log(
        '🎯 [usePeriodRanking] useEffect disparado para período:',
        period
      );
      fetchRanking(period);
    } else {
      console.log('🎯 [usePeriodRanking] Período é null, limpando ranking');
      setRanking([]);
      setError(null);
    }
  }, [period, fetchRanking]);

  return {
    ranking,
    isLoading,
    error,
    refetch: () => period && fetchRanking(period),
  };
}
