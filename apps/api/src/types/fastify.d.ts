// apps/api/src/types/fastify.d.ts

import { FastifyReply } from 'fastify';

import 'fastify';

// Tipos para o usuário autenticado
interface AuthenticatedUser {
  id: number;
  email: string;
  name?: string;
  nome?: string;
  roles?: string[];
  permissions?: string[];
  sectorId?: number;
  roleNames?: string[];
}

// Serviços disponíveis via DI
interface Services {
  ranking: import('../modules/ranking/ranking.service').RankingService;
  parameter: import('../modules/parameters/parameter.service').ParameterService;
  auditLog: import('../modules/audit/audit.service').AuditLogService;
  expurgo: import('../modules/expurgos/expurgo.service').ExpurgoService;
  competitionPeriod: import('../modules/periods/period.service').CompetitionPeriodService;
  history: import('../modules/historical/history.service').HistoryService;
  auth: import('../services/auth.service').AuthService;
}

// Extensão do Fastify para nossos métodos
declare module 'fastify' {
  interface FastifyInstance {
    services: Services;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    generateToken: (payload: any) => string;
    verifyToken?: (token: string) => any;
  }

  interface FastifyRequest {
    user?: AuthenticatedUser;
    sessionId?: string;
  }
}
