// apps/api/src/database/mocks/ranking.mock.ts
export interface MockRankingEntry {
  RANK: number;
  SETOR: string;
  PONTUACAO: number;
}

export const mockRankingData: MockRankingEntry[] = [
  { RANK: 1, SETOR: 'SÃO SEBASTIÃO', PONTUACAO: 20.5 },
  { RANK: 2, SETOR: 'PARANOÁ', PONTUACAO: 23.0 },
  { RANK: 3, SETOR: 'GAMA', PONTUACAO: 26.0 },
  { RANK: 4, SETOR: 'SANTA MARIA', PONTUACAO: 28.0 },
];
