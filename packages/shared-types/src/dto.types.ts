//packages/shared-types/src/dto.types.ts
// Para o Ranking Final (usado na API e Frontend)
export interface EntradaRanking {
  RANK: number;
  SETOR: string; // Nome do setor
  PONTUACAO: number; // Pontuação final (lembrar: maior = pior)
}
export interface RegrasAplicadasPadrao {
  // Novo tipo para clareza
  calculationMethod: string;
  calculationMethodLabel: string;
  adjustmentPercentage: number;
  roundingMethod: string;
  roundingDecimalPlaces: number;
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
  percentualAtingimento?: number | null;
  pontos: number | null;
  // --- Novos Campos (Opcionais) ---
  metaPropostaPadrao?: number | null;
  metaAnteriorValor?: number | null;
  metaAnteriorPeriodo?: string | null;
  regrasAplicadasPadrao?: RegrasAplicadasPadrao | null;
  metaDefinidaValor: number | null;
  isMetaDefinida: boolean;
}

interface RelatedUser {
  id: number;
  nome: string /* outros campos? */;
}
interface RelatedCriterion {
  id: number;
  nome: string /* outros campos? */;
}
interface RelatedSector {
  id: number;
  nome: string /* outros campos? */;
}

export interface ExpurgoEventEntity {
  id: number;
  criterionId: number;
  sectorId: number;
  dataEvento: string; // Ou Date
  descricaoEvento?: string;
  justificativa: string;
  status: string; // Ou o tipo ExpurgoStatus se exportado de shared-types
  registradoPorUserId: number;
  registradoEm: string; // Ou Date
  aprovadoPorUserId?: number | null;
  aprovadoEm?: string | Date | null;
  // Dados relacionados que a API agora envia:
  criterio?: RelatedCriterion | null;
  setor?: RelatedSector | null;
  registradoPor?: RelatedUser | null;
  aprovadoPor?: RelatedUser | null;
}
