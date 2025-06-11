// apps/api/src/types/fastify.d.ts

import { MultipartFile } from '@fastify/multipart';

declare module 'fastify' {
  interface FastifyRequest {
    // Métodos do plugin @fastify/multipart
    isMultipart(): boolean;
    file(): Promise<MultipartFile | undefined>;
    files(): AsyncIterableIterator<MultipartFile>;

    // Propriedades de autenticação
    user?: {
      id: number;
      email: string;
      nome?: string;
      name?: string;
      roles?: string[];
      permissions?: string[];
      sectorId?: number;
      roleNames?: string[];
    };

    sessionId?: string;
  }

  interface FastifyInstance {
    // Método de autenticação personalizado
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;

    // Método para gerar token
    generateToken: (payload: any) => string;

    // Serviços injetados
    services: {
      ranking: import('../modules/ranking/ranking.service').RankingService;
      parameter: import('../modules/parameters/parameter.service').ParameterService;
      auditLog: import('../modules/audit/audit.service').AuditLogService;
      expurgo: import('../modules/expurgos/expurgo.service').ExpurgoService;
      competitionPeriod: import('../modules/periods/period.service').CompetitionPeriodService;
      history: import('../modules/historical/history.service').HistoryService;
      auth: import('../services/auth.service').AuthService;
    };
  }
}
