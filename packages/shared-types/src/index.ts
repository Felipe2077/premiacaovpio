// packages/shared-types/src/index.ts - CORRIGIDO SEM DUPLICAÇÕES

// ===================================
// ENUMS PRINCIPAIS
// ===================================
export * from './dto/notification.dto';
export * from './enums/permission.enum';
export * from './enums/role.enum';

// ===================================
// DTOs E INTERFACES PRINCIPAIS
// ===================================
export * from './dto/attachment.dto';
export * from './dto/auth.dto';
export * from './dto/expurgo.dto';
export * from './dto/parameter.dto';
export * from './dto/planning.dto';
export * from './dto/ranking.dto';
export * from './dto/user.dto'; // 🆕 NOVO - CRUD de usuários

// ===================================
// FUNÇÕES UTILITÁRIAS DOS ENUMS
// ===================================

// Expurgo Status
export {
  getExpurgoStatusColor,
  getExpurgoStatusDescription,
  getExpurgoStatusIcon,
  getNextPossibleStatuses,
  isStatusAprovado,
  isValidExpurgoStatus,
  statusPermiteEdicao,
} from './enums/expurgo-status.enum';

// Permissions e Roles
export {
  getPermissionLabel,
  getRoleLabel,
  getRolePermissions,
} from './enums/permission.enum';

// ===================================
// FUNÇÕES DE VALIDAÇÃO
// ===================================

// Validações de Expurgos
export {
  validateApproveExpurgo,
  validateCreateExpurgo,
  validateFindExpurgos,
  validateRejectExpurgo,
} from './dto/expurgo.dto';

// 🆕 Validações de Usuários
export {
  validateAdminAction,
  validateCreateUser,
  validateUpdateUser,
  validateUserFilters,
} from './dto/user.dto';

// Validações de Auth
export { formatSessionDevice, validatePassword } from './dto/auth.dto';

// ===================================
// EXPORTS DIRETOS (ENUMS)
// ===================================
export { ExpurgoStatus } from './enums/expurgo-status.enum';
export { Permission, Role } from './enums/permission.enum';

// ===================================
// TYPES PARA CONVENIÊNCIA
// ===================================

// 🆕 User Management Types
export type {
  // Ações administrativas
  AdminResetPasswordDto,
  // Principais DTOs de usuário
  CreateUserDto,
  CreateUserResponse,
  PaginatedUsersResponse,
  ResetPasswordResponse,
  ToggleUserStatusDto,
  UnlockUserDto,
  UpdateUserDto,
  UserActivity,
  UserDetail,
  UserFilters,
  UserStatistics,
  UserSummary,
} from './dto/user.dto';

// Auth Types
export type {
  ActiveSessionsResponse,
  AuthAuditEvent,
  // Errors e Audit
  AuthError,
  AuthErrorCode,
  AuthUser,
  ChangePasswordDto,
  ForgotPasswordDto,
  // Login e autenticação
  LoginDto,
  LoginResponse,
  PasswordValidation,
  RefreshTokenDto,
  RefreshTokenResponse,
  ResetPasswordDto,
  // Sessões e perfil
  SessionInfo,
  UserProfile,
} from './dto/auth.dto';

// Expurgo Types
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

// Parameter Types
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

// Ranking Types
export type {
  DetailedResultsResponseDto,
  EntradaRanking,
  EntradaResultadoDetalhado,
  GetRankingDto,
  GetResultsDto,
  RankingResponseDto,
  RegrasAplicadasPadrao,
} from './dto/ranking.dto';

// Planning Types
export type {
  CalculateProposedMetaDto,
  GetPlanningDataDto,
  HistoricalPerformanceDataItem,
  PlanningCellOutput,
  ProposedMetaResponseDto,
} from './dto/planning.dto';

// Attachment Types
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

// Attachment utilities
export {
  ATTACHMENT_CONSTRAINTS,
  FileType,
  formatFileSize,
  getFileTypeFromMimeType,
  validateFile,
} from './dto/attachment.dto';

// ===================================
// CONSTANTES E METADADOS
// ===================================

export const SHARED_TYPES_VERSION = '2.1.0'; // 🆕 Incrementado para incluir user management
export const USER_MANAGEMENT_VERSION = '1.0.0'; // 🆕 Nova feature
export const ATTACHMENT_FEATURE_VERSION = '1.0.0';

// 🆕 Constantes utilitárias para usuários
export const USER_CONSTRAINTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 150,
  MAX_JUSTIFICATION_LENGTH: 500,
  MIN_JUSTIFICATION_LENGTH: 10,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Nota: UserFilters será importado via export * from './dto/user.dto'
// então não precisamos da tipagem aqui para evitar erro de referência circular
