// hooks/usePeriodRanking.ts
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function usePeriodRanking(period: string | null) {
  const [ranking, setRanking] = useState<RankingForShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async (periodMesAno: string) => {
    if (!periodMesAno) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Buscando ranking específico para período:', periodMesAno);

      const response = await fetch(
        `${API_BASE_URL}/api/ranking?period=${periodMesAno}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data: RankingEntry[] = await response.json();
      console.log('📊 Ranking recebido da API:', data);

      // Converter para formato de compartilhamento
      const rankingForShare = data.map((item, index) => ({
        position: item.RANK,
        setor: item.SETOR,
        pontos: item.PONTUACAO,
        isWinner: item.RANK === 1,
      }));

      console.log(
        '🏆 Ranking formatado para compartilhamento:',
        rankingForShare
      );
      setRanking(rankingForShare);
    } catch (err: any) {
      console.error('❌ Erro ao buscar ranking:', err);
      setError(err.message || 'Erro ao buscar ranking');
      setRanking([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period) {
      fetchRanking(period);
    } else {
      setRanking([]);
    }
  }, [period, fetchRanking]);

  return {
    ranking,
    isLoading,
    error,
    refetch: () => period && fetchRanking(period),
  };
}
