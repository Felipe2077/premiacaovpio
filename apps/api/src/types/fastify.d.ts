// apps/api/src/types/fastify.d.ts (CORREÇÃO FINAL)
import 'fastify';

// Define o formato completo do usuário autenticado
interface AuthenticatedUser {
  id: number;
  email: string;
  nome?: string;
  roles: string[];
  permissions: string[];
  sectorId?: number | null;
  roleNames: string[];
  sessionId?: string;
}

// Define o payload do JWT (o que vem no token)
interface JWTPayload {
  sub: number; // ID do usuário
  email: string;
  nome?: string;
  roles: string[];
  permissions: string[];
  sectorId?: number | null;
  roleNames?: string[];
  sessionId?: string;
  iat?: number;
  exp?: number;
}

declare module 'fastify' {
  export interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  export interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

// Informa ao plugin @fastify/jwt o formato do nosso payload
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}
