// apps/api/src/types/fastify.d.ts (VERSÃO FINAL)
import 'fastify';
// ...seus outros imports de serviços

// Define o que estará DENTRO do token JWT
interface UserPayload {
  id: number;
  email: string;
  roles: string[];
}

declare module 'fastify' {
  export interface FastifyInstance {
    // ...seus outros serviços...
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
  // Informa que TODA requisição (request) terá a propriedade `user` com o formato do nosso payload
  export interface FastifyRequest {
    user: UserPayload;
  }
}

// Informa ao plugin @fastify/jwt o formato do nosso payload
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}
