// utils/periodSelection.ts
// Lógica centralizada para seleção do período padrão
import React from 'react';

interface Period {
  id: number;
  mesAno: string;
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  dataInicio: string;
  dataFim: string;
}

/**
 * Seleciona o período padrão baseado nas regras de negócio:
 *
 * PRIORIDADE:
 * 1. ATIVA (sempre prioridade máxima)
 * 2. PRE_FECHADA (mais recente)
 * 3. FECHADA (mais recente)
 * 4. PLANEJAMENTO (só como última opção)
 */
export function selectDefaultPeriod(periods: Period[]): Period | null {
  if (!periods || periods.length === 0) return null;

  // 1º: Procurar período ATIVO (sempre prioridade)
  const active = periods.find((p) => p.status === 'ATIVA');
  if (active) return active;

  // 2º: Procurar períodos PRE_FECHADA (mais recente)
  const preClosed = periods
    .filter((p) => p.status === 'PRE_FECHADA')
    .sort(
      (a, b) =>
        new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
    )[0];
  if (preClosed) return preClosed;

  // 3º: Procurar períodos FECHADA (mais recente)
  const closed = periods
    .filter((p) => p.status === 'FECHADA')
    .sort(
      (a, b) =>
        new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
    )[0];
  if (closed) return closed;

  // 4º: PLANEJAMENTO como última opção (só se não houver nada)
  const planning = periods.find((p) => p.status === 'PLANEJAMENTO');
  return planning || null;
}

/**
 * Hook customizado para usar a lógica de seleção de período
 */
export function useDefaultPeriodSelection(periods: Period[]) {
  const defaultPeriod = React.useMemo(() => {
    return selectDefaultPeriod(periods);
  }, [periods]);

  return defaultPeriod;
}
