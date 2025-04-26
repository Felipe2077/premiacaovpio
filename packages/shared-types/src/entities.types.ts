export interface Setor {
  id: number;
  nome: string;
  // Outros campos relevantes? Ex: sigla, gestor_id, etc.
}

export interface Criterio {
  id: number;
  nome: string; // Ex: 'ATRASO', 'IPK', 'COMBUSTIVEL'
  index: number | null; // O INDEX que vimos ser usado na Pontuação % (10, 11?) - pode ser nulo se não aplicável
  descricao?: string; // Opcional
  unidade_medida?: string; // Ex: '%', 'KM/L', 'R$'
  sentido_melhor?: 'MAIOR' | 'MENOR'; // Indica se um valor maior é melhor ou pior
  ativo: boolean;
}

// Para parâmetros (metas, pesos, fatores de ajuste) - estrutura inicial
export interface ParametroValor {
  id: number;
  nomeParametro: string; // Ex: 'META_IPK', 'PESO_ATRASO', 'AJUSTE_DEFEITO_PARANOA'
  valor: string; // Guardar como string para flexibilidade (converter depois)
  dataInicioEfetivo: string; // Formato ISO Date 'YYYY-MM-DD' ou Timestamp string
  dataFimEfetivo: string | null; // Null significa que está vigente
  criterioId?: number; // Opcional: Parâmetro pode ser específico para um critério
  setorId?: number; // Opcional: Parâmetro pode ser específico para um setor
  // Info de auditoria (quem criou/quando) pode vir da tabela de logs ou aqui
  justificativa?: string; // Justificativa da criação/mudança (IMPORTANTE!)
}
// Para dados brutos de desempenho vindos do ETL
export interface DadoDesempenhoBruto {
  id: number;
  setorId: number;
  criterioId: number;
  dataMetrica: string; // Formato ISO Date 'YYYY-MM-DD' ou Timestamp string
  valor: number; // O valor numérico do desempenho
  // Info da carga ETL? timestamp_carga, fonte, etc.
}
// Para os Logs de Auditoria
export interface EntradaLogAuditoria {
  id: number;
  timestamp: string; // ISO Timestamp string
  userId?: number;
  userName?: string; // Nome do usuário que fez a ação
  actionType: string; // Ex: 'PARAMETRO_ALTERADO', 'LOGIN_FALHOU', 'ETL_EXECUTADO'
  entityType?: string; // Ex: 'ParametroValor', 'Usuario'
  entityId?: string | number;
  details?: Record<string, any>; // JSON/Objeto com detalhes (ex: valor antigo/novo)
  justification?: string; // Justificativa associada à ação
  ipAddress?: string;
}
