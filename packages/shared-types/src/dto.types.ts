// Para o Ranking Final (usado na API e Frontend)
export interface EntradaRanking {
  RANK: number;
  SETOR: string; // Nome do setor
  PONTUACAO: number; // Pontuação final (lembrar: maior = pior)
}

// Para a Tabela Detalhada (usado na API e Frontend)
export interface EntradaResultadoDetalhado {
  setorId: number;
  setorNome: string;
  criterioId: number;
  criterioNome: string;
  periodo: string; // Ex: '2025-04'
  valorRealizado: number | null;
  valorMeta: number | string | null; // Meta pode ter vindo como string do parâmetro
  percentualAtingimento?: number | null; // Ou diferença, a definir
  pontos?: number | null; // Pontuação específica do critério
}
