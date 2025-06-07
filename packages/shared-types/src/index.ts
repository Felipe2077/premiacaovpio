// === ENUMS ===
export * from './enums/expurgo-status.enum';

// === DTOs E INTERFACES ===
export * from './dto/expurgo.dto';
export * from './dto/parameter.dto';
export * from './dto/ranking.dto';
export * from './dto/planning.dto';

// === FUNÇÕES UTILITÁRIAS DOS ENUMS ===
export { 
  isValidExpurgoStatus, 
  getExpurgoStatusDescription, 
  getExpurgoStatusColor 
} from './enums/expurgo-status.enum';

// === FUNÇÕES DE VALIDAÇÃO ===
export {
  validateCreateExpurgo,
  validateApproveRejectExpurgo,
  validateFindExpurgos
} from './dto/expurgo.dto';

// === EXPORTS DIRETOS PARA CONVENIENCE ===
export { ExpurgoStatus } from './enums/expurgo-status.enum';

// === EXPORTS DIRETOS DE RANKING (para compatibilidade) ===
export type {
  EntradaRanking,
  EntradaResultadoDetalhado,
  RegrasAplicadasPadrao,
  GetRankingDto,
  GetResultsDto,
  RankingResponseDto,
  DetailedResultsResponseDto
} from './dto/ranking.dto';

// === EXPORTS DIRETOS DE PLANNING (para compatibilidade) ===
export type {
  HistoricalPerformanceDataItem,
  PlanningCellOutput,
  GetPlanningDataDto,
  CalculateProposedMetaDto,
  ProposedMetaResponseDto
} from './dto/planning.dto';
