// Extensão de tipos para o Fastify - resolve TODOS os erros de request.user

import 'fastify';

// Interface para o usuário autenticado
export interface AuthenticatedUser {
  id: number;
  email: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
}

// Estender tipos do Fastify
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
