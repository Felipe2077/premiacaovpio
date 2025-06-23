// packages/shared-types/src/index.ts (ATUALIZADO)

// === ENUMS ===
export * from './enums/expurgo-status.enum';

// === DTOs E INTERFACES ===
export * from './dto/expurgo.dto';
export * from './dto/history.dto'; // Se existir
export * from './dto/parameter.dto';
export * from './dto/planning.dto';
export * from './dto/ranking.dto';

// === FUNÇÕES UTILITÁRIAS DOS ENUMS ===
export {
  getExpurgoStatusColor,
  getExpurgoStatusDescription,
  getExpurgoStatusIcon, // 🆕
  getNextPossibleStatuses, // 🆕
  isStatusAprovado,
  isValidExpurgoStatus, // 🆕
  statusPermiteEdicao,
} from './enums/expurgo-status.enum';

// === FUNÇÕES DE VALIDAÇÃO ===
export {
  validateApproveExpurgo,
  validateCreateExpurgo, // 🆕
  validateFindExpurgos, // 🆕
  validateRejectExpurgo,
} from './dto/expurgo.dto';

// === EXPORTS DIRETOS PARA CONVENIENCE ===
export { ExpurgoStatus } from './enums/expurgo-status.enum';

// === EXPORTS DIRETOS DE RANKING (para compatibilidade) ===
export type {
  DetailedResultsResponseDto,
  EntradaRanking,
  EntradaResultadoDetalhado,
  GetRankingDto,
  GetResultsDto,
  RankingResponseDto,
  RegrasAplicadasPadrao,
} from './dto/ranking.dto';

// === EXPORTS DIRETOS DE PLANNING (para compatibilidade) ===
export type {
  CalculateProposedMetaDto,
  GetPlanningDataDto,
  HistoricalPerformanceDataItem,
  PlanningCellOutput,
  ProposedMetaResponseDto,
} from './dto/planning.dto';

// === 🆕 EXPORTS DIRETOS DE EXPURGO (NOVOS) ===
export type {
  ApproveExpurgoDto,
  ApproveRejectExpurgoDto,
  CreateExpurgoDto,
  ExpurgoAttachmentDto,
  ExpurgoResponseDto,
  ExpurgoStatisticsDto,
  FindExpurgosDto,
  RejectExpurgoDto,
  UploadExpurgoAttachmentDto,
} from './dto/expurgo.dto';

// === EXPORTS DIRETOS DE PARAMETER (para compatibilidade) ===
export type {
  CalculateData,
  CalculateParameterDto,
  CreateData,
  CreateParameterDto,
  CriterionCalculationSettingsDto,
  EditData,
  ParameterMetadata,
  UpdateParameterDto,
} from './dto/parameter.dto';

// ================================
// 🆕 NOVAS EXPORTAÇÕES - ANEXOS
// ================================

// DTOs de Anexos
export * from './dto/attachment.dto';

// Tipos específicos de anexos
export type {
  AttachmentConstraints,
  AttachmentEntity,
  AttachmentItemProps,
  AttachmentListProps,
  AttachmentPreviewProps,
  AttachmentStatistics,
  AttachmentUploadProps,
  FileValidationResult,
  PreviewData,
  UploadAttachmentDto,
  UploadProgressDto,
  UploadResponseDto,
} from './dto/attachment.dto';

// Enums e constantes de anexos
export {
  ATTACHMENT_CONSTRAINTS,
  FileType,
  formatFileSize,
  getFileTypeFromMimeType,
  validateFile,
} from './dto/attachment.dto';

// ================================
// VERSÃO E METADADOS
// ================================

export const SHARED_TYPES_VERSION = '2.0.0'; // Incrementado para incluir anexos
export const ATTACHMENT_FEATURE_VERSION = '1.0.0';

// packages/shared-types/src/index.ts

// === NOVOS DTOs DE AUTH ===
export * from './dto/auth.dto';

// === RE-EXPORTS ESPECÍFICOS PARA COMPATIBILIDADE ===
export {
  getPermissionLabel,
  getRoleLabel,
  getRolePermissions,
  Permission,
  Role,
} from './enums/permission.enum';

export {
  AuthAuditEvent,
  AuthErrorCode,
  formatSessionDevice,
  validatePassword,
} from './dto/auth.dto';

// ===== SCHEDULING TYPES (SPRINT 2 FASE 3) =====
export * from './dto/scheduling.dto';
