// src/hooks/useLastETLExecution.tsx
import { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LastExecution {
  executedAt: string;
  status: string;
  durationMs?: number | null;
  durationFormatted?: string | null;
  recordsProcessed?: number | null;
  triggeredBy: string;
  periodProcessed?: string | null;
  executedAtFormatted: string;
  relativeTime: string;
}

interface ETLData {
  lastExecution: LastExecution | null;
  hasExecutions: boolean;
}

interface UseLastETLExecutionReturn {
  data: ETLData | null;
  loading: boolean;
  error: string | null;
}

export default function useLastETLExecution(): UseLastETLExecutionReturn {
  const [data, setData] = useState<ETLData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLastExecution() {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/api/automation/last-execution`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.message || 'Erro desconhecido');
        }
      } catch (err) {
        console.error('Erro ao buscar última execução ETL:', err);
        setError('Erro ao buscar última execução');
      } finally {
        setLoading(false);
      }
    }

    fetchLastExecution();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchLastExecution, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
