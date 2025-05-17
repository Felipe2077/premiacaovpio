// services/api-service.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CompetitionPeriodForSelect {
  id: number;
  mesAno: string;
  status: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface CriterionForSelect {
  id: number;
  nome: string;
}

export interface SectorForSelect {
  id: number;
  nome: string;
}

export const apiService = {
  async fetchActiveCriteriaSimple(): Promise<CriterionForSelect[]> {
    const url = `${API_BASE_URL}/api/criteria/active`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Erro ${res.status} ao buscar critérios`);
    }
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((c) => ({ id: c.id, nome: c.nome }))
      : [];
  },

  async fetchActiveSectorsSimple(): Promise<SectorForSelect[]> {
    const url = `${API_BASE_URL}/api/sectors/active`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Erro ${res.status} ao buscar setores`);
    }
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((s) => ({ id: s.id, nome: s.nome }))
      : [];
  },

  async fetchCompetitionPeriodsForSelect(): Promise<
    CompetitionPeriodForSelect[]
  > {
    const url = `${API_BASE_URL}/api/periods`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Erro ${res.status} ao buscar períodos`);
    }
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((p) => ({
          id: p.id,
          mesAno: p.mesAno,
          status: p.status,
          dataInicio: p.dataInicio,
          dataFim: p.dataFim,
        }))
      : [];
  },
};
