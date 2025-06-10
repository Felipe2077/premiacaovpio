# 🔐 Roadmap Detalhado - Implementação de Autenticação e RBAC

## Sistema de Premiação da Viação Pioneira

**Versão:** 2.0  
**Data:** 10 de Junho de 2025  
**Estimativa Total:** 4-6 semanas (dependendo da complexidade dos testes)

---

## 📊 RESUMO EXECUTIVO

### **Objetivo:**

Implementar sistema completo de autenticação e autorização (RBAC) seguindo as melhores práticas de segurança, garantindo que:

- **Diretores** tenham controle total do sistema
- **Gerentes** possam solicitar expurgos e visualizar relatórios
- **Visualizadores** tenham acesso apenas aos rankings públicos

### **Escopo:**

- Autenticação JWT com refresh tokens
- Sistema RBAC com 3 roles + permissões granulares
- Proteção completa de rotas (backend + frontend)
- Auditoria avançada de segurança
- Features de segurança empresarial (rate limiting, CSRF, etc.)

---

## 🗓️ CRONOGRAMA DE FASES

## **FASE 1: FUNDAÇÃO BACKEND (Semana 1)**

_Preparar a base sólida para autenticação_

### **1.1 Atualização das Entidades (Dia 1-2)**

#### **🎯 UserEntity - Adição de Autenticação**

```typescript
// Campos a adicionar:
@Column({ type: 'varchar', length: 255, select: false })
passwordHash!: string;

@Column({ type: 'timestamp with time zone', nullable: true })
lastLoginAt?: Date;

@Column({ type: 'int', default: 0 })
failedLoginAttempts!: number;

@Column({ type: 'timestamp with time zone', nullable: true })
lockedUntil?: Date;

@Column({ type: 'varchar', length: 50, nullable: true })
resetPasswordToken?: string;

@Column({ type: 'timestamp with time zone', nullable: true })
resetPasswordExpires?: Date;

@Column({ type: 'json', nullable: true })
sessionMetadata?: {
  ipAddress?: string;
  userAgent?: string;
  lastActiveAt?: Date;
}[];
```

#### **🎯 RoleEntity - Sistema de Permissões**

```typescript
// Campos a adicionar:
@Column({ type: 'json', nullable: true })
permissions!: Permission[];

@Column({ type: 'text', nullable: true })
description?: string;

@Column({ type: 'boolean', default: true })
isActive!: boolean;
```

#### **🎯 Nova Entidade: SessionEntity**

```typescript
@Entity({ name: 'user_sessions' })
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'text' })
  refreshToken!: string;

  @Column({ type: 'varchar', length: 50 })
  ipAddress!: string;

  @Column({ type: 'text' })
  userAgent!: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt!: Date;

  @Column({ type: 'timestamp with time zone' })
  lastUsedAt!: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;
}
```

### **1.2 Shared Types - DTOs e Enums (Dia 2)**

#### **🎯 Enums de Permissões**

```typescript
export enum Permission {
  // === DIRETOR (Controle Total) ===
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_PARAMETERS = 'manage_parameters',
  CLOSE_PERIODS = 'close_periods',
  START_PERIODS = 'start_periods',
  APPROVE_EXPURGOS = 'approve_expurgos',
  REJECT_EXPURGOS = 'reject_expurgos',
  DELETE_EXPURGOS = 'delete_expurgos',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  VIEW_ALL_AUDIT_LOGS = 'view_all_audit_logs',
  RESOLVE_TIES = 'resolve_ties',

  // === GERENTE (Operacional) ===
  REQUEST_EXPURGOS = 'request_expurgos',
  EDIT_OWN_EXPURGOS = 'edit_own_expurgos',
  VIEW_REPORTS = 'view_reports',
  VIEW_DETAILED_PERFORMANCE = 'view_detailed_performance',
  VIEW_SECTOR_LOGS = 'view_sector_logs',
  VIEW_PARAMETERS = 'view_parameters',

  // === VISUALIZADOR (Somente Leitura) ===
  VIEW_RANKINGS = 'view_rankings',
  VIEW_PUBLIC_REPORTS = 'view_public_reports',
  VIEW_OWN_PROFILE = 'view_own_profile',
}

export enum Role {
  DIRETOR = 'DIRETOR',
  GERENTE = 'GERENTE',
  VISUALIZADOR = 'VISUALIZADOR',
}
```

#### **🎯 DTOs de Autenticação**

```typescript
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterUserDto {
  nome: string;
  email: string;
  password: string;
  roles: Role[];
  sectorId?: number; // Para gerentes específicos de setor
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface AuthResponse {
  user: {
    id: number;
    nome: string;
    email: string;
    roles: Role[];
    permissions: Permission[];
    sectorId?: number;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### **1.3 Configuração JWT e Fastify (Dia 3)**

#### **🎯 Instalação de Dependências**

```bash
pnpm add @fastify/jwt @fastify/auth @fastify/rate-limit @fastify/helmet bcrypt argon2 uuid
pnpm add -D @types/bcrypt @types/uuid
```

#### **🎯 Configuração Fastify Auth**

```typescript
// src/plugins/auth.plugin.ts
export const authPlugin = fastify.register(async function (fastify) {
  await fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET!,
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    },
  });

  await fastify.register(require('@fastify/auth'));

  // Rate limiting para login
  await fastify.register(require('@fastify/rate-limit'), {
    max: 5, // 5 tentativas
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip + request.body?.email,
  });
});
```

---

## **FASE 2: SERVIÇOS DE AUTENTICAÇÃO (Semana 1-2)**

### **2.1 AuthService - Core Authentication (Dia 4-5)**

#### **🎯 Funcionalidades Principais**

```typescript
export class AuthService {
  // Autenticação básica
  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthResponse>;
  async logout(userId: number, sessionId: string): Promise<void>;
  async refreshToken(refreshToken: string): Promise<AuthResponse>;

  // Gestão de senhas
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void>;
  async forgotPassword(dto: ForgotPasswordDto): Promise<void>;
  async resetPassword(dto: ResetPasswordDto): Promise<void>;

  // Validações e segurança
  async validateUser(
    email: string,
    password: string
  ): Promise<UserEntity | null>;
  async lockAccount(userId: number): Promise<void>;
  async unlockAccount(userId: number): Promise<void>;

  // Gestão de sessões
  async createSession(
    user: UserEntity,
    ipAddress: string,
    userAgent: string
  ): Promise<string>;
  async invalidateSession(sessionId: string): Promise<void>;
  async invalidateAllUserSessions(userId: number): Promise<void>;
}
```

### **2.2 AuthorizationService - RBAC (Dia 5-6)**

#### **🎯 Sistema de Permissões**

```typescript
export class AuthorizationService {
  // Verificação de permissões
  async userHasPermission(
    userId: number,
    permission: Permission
  ): Promise<boolean>;
  async userHasRole(userId: number, role: Role): Promise<boolean>;
  async userHasAnyPermission(
    userId: number,
    permissions: Permission[]
  ): Promise<boolean>;

  // Gestão de roles
  async assignRoleToUser(userId: number, role: Role): Promise<void>;
  async removeRoleFromUser(userId: number, role: Role): Promise<void>;
  async getUserPermissions(userId: number): Promise<Permission[]>;

  // Contexto de setor (para gerentes)
  async userCanAccessSector(userId: number, sectorId: number): Promise<boolean>;
  async getUserAccessibleSectors(userId: number): Promise<number[]>;
}
```

### **2.3 UserService - Gestão de Usuários (Dia 6-7)**

#### **🎯 CRUD + Features Administrativas**

```typescript
export class UserService {
  // CRUD básico
  async createUser(
    dto: RegisterUserDto,
    createdBy: number
  ): Promise<UserEntity>;
  async updateUser(
    id: number,
    dto: UpdateUserDto,
    updatedBy: number
  ): Promise<UserEntity>;
  async deleteUser(id: number, deletedBy: number): Promise<void>;
  async getUserById(id: number): Promise<UserEntity | null>;
  async getUserByEmail(email: string): Promise<UserEntity | null>;

  // Listagens e filtros
  async listUsers(filters?: UserFilters): Promise<PaginatedResult<UserEntity>>;
  async getUsersByRole(role: Role): Promise<UserEntity[]>;
  async getUsersBySector(sectorId: number): Promise<UserEntity[]>;

  // Operações administrativas
  async activateUser(id: number): Promise<void>;
  async deactivateUser(id: number): Promise<void>;
  async resetUserPassword(id: number, newPassword: string): Promise<void>;
  async unlockUserAccount(id: number): Promise<void>;
}
```

---

## **FASE 3: MIDDLEWARES E PROTEÇÃO DE ROTAS (Semana 2)**

### **3.1 Middlewares de Autenticação (Dia 8-9)**

#### **🎯 Auth Middleware**

```typescript
// src/middlewares/auth.middleware.ts
export const authenticateUser = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const token = extractTokenFromHeader(request.headers.authorization);
    const decoded = fastify.jwt.verify(token);

    const user = await userService.getUserById(decoded.sub);
    if (!user || !user.ativo) {
      throw new Error('Usuário inválido ou inativo');
    }

    request.user = user;
    request.sessionId = decoded.sessionId;
  } catch (error) {
    reply.status(401).send({ error: 'Token inválido' });
  }
};

export const requirePermission = (...permissions: Permission[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const hasPermission = await authorizationService.userHasAnyPermission(
      user.id,
      permissions
    );

    if (!hasPermission) {
      await auditService.logUnauthorizedAccess(
        user.id,
        request.url,
        permissions
      );
      reply.status(403).send({ error: 'Acesso negado' });
    }
  };
};
```

#### **🎯 Security Middleware**

```typescript
// src/middlewares/security.middleware.ts
export const securityMiddleware = async (fastify: FastifyInstance) => {
  // Helmet para headers de segurança
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // Rate limiting global
  await fastify.register(require('@fastify/rate-limit'), {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });

  // CSRF Protection
  await fastify.register(require('@fastify/csrf-protection'));
};
```

### **3.2 Refatoração de Rotas Existentes (Dia 9-10)**

#### **🎯 Proteção de Rotas Administrativas**

```typescript
// Antes:
fastify.post('/api/periods/:id/close', handler);

// Depois:
fastify.post(
  '/api/periods/:id/close',
  {
    preHandler: [authenticateUser, requirePermission(Permission.CLOSE_PERIODS)],
  },
  handler
);

// Rotas por categoria:
// 🔴 DIRETOR ONLY
fastify.post(
  '/api/users',
  {
    preHandler: [authenticateUser, requirePermission(Permission.MANAGE_USERS)],
  },
  createUserHandler
);

// 🟡 DIRETOR + GERENTE
fastify.get(
  '/api/expurgos',
  {
    preHandler: [
      authenticateUser,
      requirePermission(Permission.VIEW_REPORTS, Permission.APPROVE_EXPURGOS),
    ],
  },
  listExpurgosHandler
);

// 🟢 TODOS AUTENTICADOS
fastify.get(
  '/api/rankings',
  {
    preHandler: [authenticateUser, requirePermission(Permission.VIEW_RANKINGS)],
  },
  getRankingsHandler
);
```

---

## **FASE 4: ENDPOINTS DE AUTENTICAÇÃO (Semana 2)**

### **4.1 Auth Routes (Dia 10-11)**

#### **🎯 Rotas Principais**

```typescript
// src/routes/auth.routes.ts
export const authRoutes = async (fastify: FastifyInstance) => {
  // Login
  fastify.post(
    '/api/auth/login',
    {
      schema: {
        body: zodToJsonSchema(LoginSchema),
        response: {
          200: zodToJsonSchema(AuthResponseSchema),
        },
      },
      preHandler: [fastify.rateLimit({ max: 5, timeWindow: '1 minute' })],
    },
    loginHandler
  );

  // Logout
  fastify.post(
    '/api/auth/logout',
    {
      preHandler: [authenticateUser],
    },
    logoutHandler
  );

  // Refresh Token
  fastify.post('/api/auth/refresh', refreshTokenHandler);

  // Forgot Password
  fastify.post(
    '/api/auth/forgot-password',
    {
      preHandler: [fastify.rateLimit({ max: 3, timeWindow: '5 minutes' })],
    },
    forgotPasswordHandler
  );

  // Reset Password
  fastify.post('/api/auth/reset-password', resetPasswordHandler);

  // Change Password
  fastify.put(
    '/api/auth/change-password',
    {
      preHandler: [authenticateUser],
    },
    changePasswordHandler
  );

  // Profile
  fastify.get(
    '/api/auth/me',
    {
      preHandler: [authenticateUser],
    },
    getProfileHandler
  );
};
```

### **4.2 User Management Routes (Dia 11-12)**

#### **🎯 Gestão de Usuários (Diretor)**

```typescript
// src/routes/users.routes.ts
export const userRoutes = async (fastify: FastifyInstance) => {
  // Listar usuários
  fastify.get(
    '/api/users',
    {
      preHandler: [
        authenticateUser,
        requirePermission(Permission.MANAGE_USERS),
      ],
    },
    listUsersHandler
  );

  // Criar usuário
  fastify.post(
    '/api/users',
    {
      preHandler: [
        authenticateUser,
        requirePermission(Permission.MANAGE_USERS),
      ],
      schema: {
        body: zodToJsonSchema(RegisterUserSchema),
      },
    },
    createUserHandler
  );

  // Atualizar usuário
  fastify.put(
    '/api/users/:id',
    {
      preHandler: [
        authenticateUser,
        requirePermission(Permission.MANAGE_USERS),
      ],
    },
    updateUserHandler
  );

  // Desativar usuário
  fastify.delete(
    '/api/users/:id',
    {
      preHandler: [
        authenticateUser,
        requirePermission(Permission.MANAGE_USERS),
      ],
    },
    deleteUserHandler
  );

  // Reset senha (admin)
  fastify.post(
    '/api/users/:id/reset-password',
    {
      preHandler: [
        authenticateUser,
        requirePermission(Permission.MANAGE_USERS),
      ],
    },
    adminResetPasswordHandler
  );
};
```

---

## **FASE 5: FRONTEND - AUTENTICAÇÃO (Semana 3)**

### **5.1 Auth Context e Estado Global (Dia 13-14)**

#### **🎯 AuthContext com Zustand**

```typescript
// src/stores/auth.store.ts
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permission[];

  // Actions
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasRole: (role: Role) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  permissions: [],

  login: async (credentials) => {
    try {
      const response = await authApi.login(credentials);

      // Salvar tokens em cookies httpOnly via API
      await authApi.setTokens(response.accessToken, response.refreshToken);

      set({
        user: response.user,
        isAuthenticated: true,
        permissions: response.user.permissions,
        isLoading: false,
      });

      router.push('/admin');
    } catch (error) {
      toast.error('Credenciais inválidas');
      throw error;
    }
  },

  hasPermission: (permission) => {
    const { permissions } = get();
    return permissions.includes(permission);
  },
}));
```

#### **🎯 API Client com Interceptors**

```typescript
// src/lib/api-client.ts
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Para cookies httpOnly
});

// Request interceptor - adicionar CSRF token
apiClient.interceptors.request.use((config) => {
  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response interceptor - auto refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await authApi.refreshToken();
        return apiClient.request(error.config);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### **5.2 Páginas de Autenticação (Dia 14-15)**

#### **🎯 Login Page**

```typescript
// src/app/login/page.tsx
export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const form = useForm<LoginDto>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginDto) => {
    try {
      await login(data);
    } catch (error) {
      // Error já tratado no store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Sistema de Premiação</CardTitle>
          <CardDescription>Entre com suas credenciais</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Lembrar de mim</FormLabel>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### **5.3 Route Protection (Dia 15-16)**

#### **🎯 Protected Route HOC**

```typescript
// src/components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: Permission[];
  roles?: Role[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  permissions = [],
  roles = [],
  fallback = <div>Acesso negado</div>
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasAnyPermission, hasRole } = useAuthStore();

  // Loading state
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check permissions
  if (permissions.length > 0 && !hasAnyPermission(permissions)) {
    return fallback;
  }

  // Check roles
  if (roles.length > 0 && !roles.some(role => hasRole(role))) {
    return fallback;
  }

  return <>{children}</>;
}
```

#### **🎯 Admin Layout com Auth**

```typescript
// src/app/admin/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={[Permission.VIEW_REPORTS]}>
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 overflow-hidden">
          <AdminHeader />
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
```

---

## **FASE 6: FEATURES DE SEGURANÇA AVANÇADA (Semana 3-4)**

### **6.1 Rate Limiting e Proteção (Dia 16-17)**

#### **🎯 Rate Limiting Granular**

```typescript
// src/middlewares/rate-limit.middleware.ts
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
}) => {
  return fastify.register(require('@fastify/rate-limit'), {
    timeWindow: options.windowMs,
    max: options.max,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    errorResponseBuilder: (req, context) => ({
      error: 'Muitas tentativas. Tente novamente mais tarde.',
      retryAfter: Math.round(context.ttl / 1000),
    }),
  });
};

// Aplicação específica:
// Login: 5 tentativas por IP por minuto
// API calls: 100 requests por usuário por minuto
// Password reset: 3 tentativas por email por 5 minutos
```

#### **🎯 Account Lockout**

```typescript
// src/services/security.service.ts
export class SecurityService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutos

  async recordFailedLogin(email: string, ipAddress: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) return;

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);

      await this.auditService.createLog({
        userId: user.id,
        actionType: 'ACCOUNT_LOCKED',
        details: { reason: 'Too many failed login attempts', ipAddress },
      });
    }

    await this.userRepo.save(user);
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user || !user.lockedUntil) return false;

    if (new Date() > user.lockedUntil) {
      // Auto-unlock
      user.lockedUntil = null;
      user.failedLoginAttempts = 0;
      await this.userRepo.save(user);
      return false;
    }

    return true;
  }
}
```

### **6.2 Session Management (Dia 17-18)**

#### **🎯 Advanced Session Control**

```typescript
// src/services/session.service.ts
export class SessionService {
  async createSession(
    user: UserEntity,
    ipAddress: string,
    userAgent: string,
    rememberMe: boolean = false
  ): Promise<{ sessionId: string; refreshToken: string }> {
    // Limite de sessões ativas por usuário
    const activeSessions = await this.sessionRepo.count({
      where: { userId: user.id, isActive: true },
    });

    if (activeSessions >= 5) {
      // Remove sessão mais antiga
      const oldestSession = await this.sessionRepo.findOne({
        where: { userId: user.id, isActive: true },
        order: { lastUsedAt: 'ASC' },
      });

      if (oldestSession) {
        await this.invalidateSession(oldestSession.id);
      }
    }

    const sessionId = uuidv4();
    const refreshToken = await this.generateRefreshToken();
    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
    );

    const session = this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      refreshToken: await bcrypt.hash(refreshToken, 10),
      ipAddress,
      userAgent,
      expiresAt,
      lastUsedAt: new Date(),
      isActive: true,
    });

    await this.sessionRepo.save(session);

    await this.auditService.createLog({
      userId: user.id,
      actionType: 'LOGIN_SUCCESS',
      details: { ipAddress, userAgent, sessionId },
    });

    return { sessionId, refreshToken };
  }

  async validateSession(
    sessionId: string,
    refreshToken: string
  ): Promise<UserEntity | null> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, isActive: true },
      relations: ['user'],
    });

    if (!session || new Date() > session.expiresAt) {
      if (session) await this.invalidateSession(sessionId);
      return null;
    }

    const tokenValid = await bcrypt.compare(refreshToken, session.refreshToken);
    if (!tokenValid) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Atualizar última utilização
    session.lastUsedAt = new Date();
    await this.sessionRepo.save(session);

    return session.user;
  }
}
```

### **6.3 Forgot Password Flow (Dia 18-19)**

#### **🎯 Email Service & Templates**

```typescript
// src/services/email.service.ts
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Redefinição de Senha - Sistema de Premiação</h2>
        <p>Você solicitou a redefinição de sua senha.</p>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
          Redefinir Senha
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Este link expira em 1 hora. Se você não solicitou esta redefinição, ignore este email.
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@viacaopioneirapremiacao.com',
      to,
      subject: 'Redefinição de Senha - Sistema de Premiação',
      html,
    });
  }

  async sendAccountLockNotification(
    to: string,
    unlockTime: Date
  ): Promise<void> {
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #dc3545;">Conta Temporariamente Bloqueada</h2>
        <p>Sua conta foi temporariamente bloqueada devido a múltiplas tentativas de login falhadas.</p>
        <p><strong>Desbloqueio automático em:</strong> ${unlockTime.toLocaleString('pt-BR')}</p>
        <p style="color: #666; font-size: 14px;">
          Se você não tentou fazer login, entre em contato com o administrador do sistema.
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: 'Conta Bloqueada - Sistema de Premiação',
      html,
    });
  }
}
```

#### **🎯 Forgot Password Implementation**

```typescript
// src/services/auth.service.ts - Método adicional
async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
  const user = await this.userRepo.findOneBy({ email: dto.email });

  if (!user) {
    // Por segurança, não revelar se o email existe
    // Mas log para auditoria
    await this.auditService.createLog({
      actionType: 'PASSWORD_RESET_ATTEMPTED',
      details: { email: dto.email, found: false }
    });
    return;
  }

  // Gerar token seguro
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await this.userRepo.save(user);

  // Enviar email
  await this.emailService.sendPasswordResetEmail(user.email, resetToken);

  await this.auditService.createLog({
    userId: user.id,
    actionType: 'PASSWORD_RESET_REQUESTED',
    details: { email: user.email }
  });
}

async resetPassword(dto: ResetPasswordDto): Promise<void> {
  const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

  const user = await this.userRepo.findOne({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: MoreThan(new Date())
    }
  });

  if (!user) {
    throw new Error('Token inválido ou expirado');
  }

  // Hash da nova senha
  const hashedPassword = await argon2.hash(dto.newPassword);

  user.passwordHash = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.failedLoginAttempts = 0; // Reset tentativas falhadas
  user.lockedUntil = null; // Desbloquear conta se estava bloqueada

  await this.userRepo.save(user);

  // Invalidar todas as sessões existentes
  await this.sessionService.invalidateAllUserSessions(user.id);

  await this.auditService.createLog({
    userId: user.id,
    actionType: 'PASSWORD_RESET_COMPLETED'
  });
}
```

---

## **FASE 7: AUDITORIA AVANÇADA E LOGS (Semana 4)**

### **7.1 Enhanced Audit System (Dia 19-20)**

#### **🎯 Security Audit Events**

```typescript
// src/enums/audit-events.enum.ts
export enum SecurityAuditEvent {
  // Autenticação
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Segurança
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',

  // Acesso negado
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Administração
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',

  // Suspeitas
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  SUSPICIOUS_LOGIN_LOCATION = 'SUSPICIOUS_LOGIN_LOCATION',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
}
```

#### **🎯 Security Monitoring Service**

```typescript
// src/services/security-monitor.service.ts
export class SecurityMonitorService {
  async detectSuspiciousActivity(
    userId: number,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // Verificar login de localização suspeita
    const recentLogins = await this.auditRepo.find({
      where: {
        userId,
        actionType: SecurityAuditEvent.LOGIN_SUCCESS,
        timestamp: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // 7 dias
      },
      order: { timestamp: 'DESC' },
      take: 10,
    });

    const knownIPs = recentLogins
      .map((log) => log.details?.ipAddress)
      .filter(Boolean);

    if (!knownIPs.includes(ipAddress) && knownIPs.length > 0) {
      await this.auditService.createLog({
        userId,
        actionType: SecurityAuditEvent.SUSPICIOUS_LOGIN_LOCATION,
        details: {
          newIP: ipAddress,
          knownIPs: knownIPs.slice(0, 3), // Últimos 3 IPs conhecidos
          userAgent,
        },
        ipAddress,
      });

      // Opcional: Enviar email de notificação
      const user = await this.userRepo.findOneBy({ id: userId });
      if (user) {
        await this.emailService.sendSuspiciousActivityAlert(
          user.email,
          ipAddress
        );
      }
    }
  }

  async checkSessionIntegrity(
    sessionId: string,
    expectedIP: string,
    expectedUserAgent: string
  ): Promise<boolean> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });

    if (!session) return false;

    // Verificar se IP ou User-Agent mudaram drasticamente
    if (
      session.ipAddress !== expectedIP ||
      this.isUserAgentSuspicious(session.userAgent, expectedUserAgent)
    ) {
      await this.auditService.createLog({
        userId: session.userId,
        actionType: SecurityAuditEvent.SESSION_HIJACK_ATTEMPT,
        details: {
          sessionId,
          originalIP: session.ipAddress,
          currentIP: expectedIP,
          originalUA: session.userAgent,
          currentUA: expectedUserAgent,
        },
      });

      // Invalidar sessão suspeita
      await this.sessionService.invalidateSession(sessionId);
      return false;
    }

    return true;
  }

  private isUserAgentSuspicious(original: string, current: string): boolean {
    // Lógica simples: se mudou completamente o browser/OS
    const originalParts = this.parseUserAgent(original);
    const currentParts = this.parseUserAgent(current);

    return (
      originalParts.browser !== currentParts.browser ||
      originalParts.os !== currentParts.os
    );
  }
}
```

### **7.2 Admin Security Dashboard (Dia 20-21)**

#### **🎯 Security Metrics API**

```typescript
// src/controllers/security.controller.ts
export class SecurityController {
  async getSecurityMetrics(request: FastifyRequest, reply: FastifyReply) {
    const timeframe = (request.query as any).timeframe || '7d';
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    const [
      loginAttempts,
      failedLogins,
      lockedAccounts,
      suspiciousActivities,
      activeUsers,
    ] = await Promise.all([
      this.getLoginAttempts(startDate, endDate),
      this.getFailedLogins(startDate, endDate),
      this.getLockedAccounts(),
      this.getSuspiciousActivities(startDate, endDate),
      this.getActiveUsers(startDate, endDate),
    ]);

    reply.send({
      timeframe,
      metrics: {
        loginAttempts,
        failedLogins,
        lockedAccounts,
        suspiciousActivities,
        activeUsers,
        securityScore: this.calculateSecurityScore({
          loginAttempts,
          failedLogins,
          suspiciousActivities,
        }),
      },
    });
  }

  async getSecurityAlerts(request: FastifyRequest, reply: FastifyReply) {
    const alerts = await this.auditRepo.find({
      where: {
        actionType: In([
          SecurityAuditEvent.ACCOUNT_LOCKED,
          SecurityAuditEvent.SUSPICIOUS_LOGIN_LOCATION,
          SecurityAuditEvent.SESSION_HIJACK_ATTEMPT,
          SecurityAuditEvent.MULTIPLE_FAILED_LOGINS,
        ]),
        timestamp: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24h
      },
      order: { timestamp: 'DESC' },
      take: 50,
      relations: ['user'],
    });

    reply.send(
      alerts.map((alert) => ({
        id: alert.id,
        type: alert.actionType,
        severity: this.getAlertSeverity(alert.actionType),
        user: alert.user
          ? {
              id: alert.user.id,
              nome: alert.user.nome,
              email: alert.user.email,
            }
          : null,
        timestamp: alert.timestamp,
        details: alert.details,
        ipAddress: alert.ipAddress,
      }))
    );
  }
}
```

#### **🎯 Frontend Security Dashboard**

```typescript
// src/app/admin/security/page.tsx
export default function SecurityDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['security-metrics', '7d'],
    queryFn: () => securityApi.getMetrics('7d'),
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  const { data: alerts } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: () => securityApi.getAlerts(),
    refetchInterval: 10000 // Atualizar a cada 10s
  });

  return (
    <ProtectedRoute permissions={[Permission.VIEW_ALL_AUDIT_LOGS]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard de Segurança</h1>
          <Badge variant={metrics?.securityScore > 80 ? 'success' : 'warning'}>
            Score: {metrics?.securityScore}/100
          </Badge>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logins (7d)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.loginAttempts || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.failedLogins || 0} falharam
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contas Bloqueadas</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics?.lockedAccounts || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atividades Suspeitas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {metrics?.suspiciousActivities || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics?.activeUsers || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Segurança (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts?.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertIcon severity={alert.severity} />
                    <div>
                      <p className="font-medium">{getAlertMessage(alert.type)}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.user?.nome || 'Sistema'} • {formatDate(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Investigar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
```

---

## **FASE 8: TESTES E VALIDAÇÃO (Semana 4-5)**

### **8.1 Testes de Segurança (Dia 21-22)**

#### **🎯 Integration Tests - Auth Flow**

```typescript
// tests/auth/auth.integration.test.ts
describe('Authentication Flow', () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedTestUsers();
  });

  describe('Login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'diretor@test.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.roles).toContain('DIRETOR');
    });

    it('should fail with invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'diretor@test.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should lock account after max failed attempts', async () => {
      // 5 tentativas falhadas
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send({
          email: 'diretor@test.com',
          password: 'wrongpassword',
        });
      }

      // 6ª tentativa deve retornar conta bloqueada
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'diretor@test.com',
          password: 'wrongpassword',
        })
        .expect(423); // Locked

      expect(response.body.error).toContain('bloqueada');
    });
  });

  describe('Protected Routes', () => {
    it('should deny access without token', async () => {
      await request(app).get('/api/users').expect(401);
    });

    it('should deny access with insufficient permissions', async () => {
      const gerente = await loginAs('gerente@test.com');

      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${gerente.accessToken}`)
        .expect(403);
    });

    it('should allow access with correct permissions', async () => {
      const diretor = await loginAs('diretor@test.com');

      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${diretor.accessToken}`)
        .expect(200);
    });
  });
});
```

#### **🎯 Security Tests**

```typescript
// tests/security/security.test.ts
describe('Security Measures', () => {
  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'password' })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('JWT Security', () => {
    it('should reject tampered tokens', async () => {
      const validToken = 'eyJ...'; // Token válido
      const tamperedToken = validToken.slice(0, -1) + 'X'; // Alterar último char

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      // Mock tempo para o futuro
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-12-31'));

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      jest.useRealTimers();
    });
  });

  describe('Session Security', () => {
    it('should invalidate session on suspicious activity', async () => {
      const user = await loginAs('test@test.com', '192.168.1.1');

      // Simular acesso de IP diferente
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .set('X-Forwarded-For', '10.0.0.1')
        .expect(401);
    });
  });
});
```

### **8.2 E2E Tests (Dia 22-23)**

#### **🎯 Frontend E2E Tests**

```typescript
// e2e/auth.e2e.ts (Playwright/Cypress)
import { test, expect } from '@playwright/test';

test.describe('Authentication E2E', () => {
  test('complete login flow', async ({ page }) => {
    // Navegar para login
    await page.goto('/login');

    // Preencher form
    await page.fill('[data-testid=email-input]', 'diretor@test.com');
    await page.fill('[data-testid=password-input]', 'SecurePass123!');
    await page.click('[data-testid=login-button]');

    // Verificar redirecionamento
    await expect(page).toHaveURL('/admin');

    // Verificar elementos do admin
    await expect(page.locator('[data-testid=admin-header]')).toBeVisible();
    await expect(page.locator('text=Bem-vindo, Diretor')).toBeVisible();
  });

  test('protected route access', async ({ page }) => {
    // Tentar acessar rota protegida sem login
    await page.goto('/admin/users');

    // Deve redirecionar para login
    await expect(page).toHaveURL('/login');
  });

  test('role-based UI elements', async ({ page }) => {
    // Login como gerente
    await loginAs(page, 'gerente@test.com', 'SecurePass123!');

    // Navegar para admin
    await page.goto('/admin');

    // Gerente não deve ver botão de criar usuário
    await expect(
      page.locator('[data-testid=create-user-button]')
    ).not.toBeVisible();

    // Mas deve ver botão de solicitar expurgo
    await expect(
      page.locator('[data-testid=request-expurgo-button]')
    ).toBeVisible();
  });

  test('session timeout', async ({ page }) => {
    await loginAs(page, 'test@test.com', 'password');

    // Mock token expirado no localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-token-expires',
        (Date.now() - 1000).toString()
      );
    });

    // Navegar para página protegida
    await page.goto('/admin/users');

    // Deve mostrar modal de sessão expirada
    await expect(
      page.locator('[data-testid=session-expired-modal]')
    ).toBeVisible();
  });
});
```

### **8.3 Performance & Load Tests (Dia 23-24)**

#### **🎯 Load Testing com Artillery**

```yaml
# load-tests/auth-load.yml
config:
  target: http://localhost:3001
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: 'Login Flow'
    weight: 70
    flow:
      - post:
          url: '/api/auth/login'
          json:
            email: 'loadtest{{ $randomInt(1, 100) }}@test.com'
            password: 'LoadTest123!'
          capture:
            - json: '$.accessToken'
              as: 'token'
      - think: 2
      - get:
          url: '/api/auth/me'
          headers:
            Authorization: 'Bearer {{ token }}'

  - name: 'Protected Endpoints'
    weight: 30
    flow:
      - post:
          url: '/api/auth/login'
          json:
            email: 'director@test.com'
            password: 'SecurePass123!'
          capture:
            - json: '$.accessToken'
              as: 'token'
      - get:
          url: '/api/users'
          headers:
            Authorization: 'Bearer {{ token }}'
      - get:
          url: '/api/parameters'
          headers:
            Authorization: 'Bearer {{ token }}'
```

---

## **FASE 9: DOCUMENTAÇÃO E DEPLOYMENT (Semana 5)**

### **9.1 Documentação de Segurança (Dia 24-25)**

#### **🎯 Security Playbook**

```markdown
# 🔒 Security Playbook - Sistema de Premiação

## Incident Response

### Account Compromise

1. **Immediate Actions:**

   - Invalidate all user sessions
   - Lock account temporarily
   - Review audit logs for suspicious activity
   - Contact user via alternate channel

2. **Investigation:**

   - Check login locations and times
   - Review recent actions in audit logs
   - Verify with user legitimate activities

3. **Resolution:**
   - Force password reset
   - Re-enable account after verification
   - Monitor for 48h post-incident

### Suspicious Login Activity

1. **Automated Response:**

   - System automatically logs event
   - Email notification to user
   - Temporary rate limiting for IP

2. **Manual Review:**
   - Admin reviews security dashboard
   - Cross-reference with user communication
   - Escalate if confirmed malicious

### Data Breach Response

1. **Containment:**

   - Identify affected systems
   - Isolate compromised components
   - Preserve evidence

2. **Assessment:**

   - Determine scope of breach
   - Identify affected data
   - Assess regulatory requirements

3. **Notification:**
   - Internal stakeholders
   - Affected users
   - Regulatory bodies (if required)

## Security Monitoring

### Daily Checks

- [ ] Review security alerts
- [ ] Check failed login attempts
- [ ] Verify system availability
- [ ] Monitor suspicious IPs

### Weekly Reviews

- [ ] Audit user permissions
- [ ] Review locked accounts
- [ ] Analyze login patterns
- [ ] Update security metrics

### Monthly Tasks

- [ ] Full security audit
- [ ] Password policy review
- [ ] Access review for all users
- [ ] Update incident response procedures
```

#### **🎯 Admin Security Guide**

```markdown
# 👨‍💼 Guia de Segurança para Administradores

## Gerenciamento de Usuários

### Criação de Usuário

1. **Princípio do Menor Privilégio:** Conceder apenas permissões necessárias
2. **Verificação de Identidade:** Confirmar identidade antes de criar conta
3. **Senha Temporária:** Forçar alteração no primeiro login
4. **Documentação:** Registrar justificativa para criação

### Roles e Permissões

#### DIRETOR

- **Pode fazer:** Tudo no sistema
- **Responsabilidades:**
  - Gestão de usuários
  - Aprovação de expurgos críticos
  - Fechamento de períodos
- **Cuidados especiais:** Nunca compartilhar credenciais

#### GERENTE

- **Pode fazer:** Solicitar expurgos, visualizar relatórios
- **Limitações:** Não pode criar usuários ou fechar períodos
- **Setor:** Limitado ao seu setor específico

#### VISUALIZADOR

- **Pode fazer:** Apenas visualizar rankings públicos
- **Ideal para:** Colaboradores, consultores externos

### Investigação de Incidentes

#### Logs de Auditoria

1. **Acesso:** /admin/security/audit-logs
2. **Filtros úteis:**
   - Tipo de evento
   - Usuário específico
   - Período temporal
   - IP de origem

#### Métricas de Segurança

1. **Dashboard:** /admin/security
2. **Alertas importantes:**
   - Logins de IPs desconhecidos
   - Múltiplas tentativas falhadas
   - Acessos fora do horário comercial

## Melhores Práticas

### Para Administradores

- ✅ Use senhas fortes e únicas
- ✅ Ative 2FA quando disponível
- ✅ Monitore regularmente os logs
- ✅ Mantenha software atualizado
- ❌ Nunca compartilhe credenciais
- ❌ Não use senhas óbvias
- ❌ Não ignore alertas de segurança

### Para Usuários Finais

- ✅ Altere senhas regularmente
- ✅ Use senhas complexas
- ✅ Faça logout ao terminar
- ✅ Reporte atividades suspeitas
- ❌ Não salve senhas no navegador
- ❌ Não acesse de computadores públicos
- ❌ Não compartilhe contas
```

### **9.2 Environment Setup & Deployment (Dia 25-26)**

#### **🎯 Environment Variables Template**

```bash
# .env.production
# === BANCO DE DADOS ===
POSTGRES_HOST=prod-db.internal
POSTGRES_PORT=5432
POSTGRES_DB=premiacao_prod
POSTGRES_USER=app_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD_SECRET}

# === JWT & SECURITY ===
JWT_SECRET=${JWT_SECRET_64_CHARS}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PASSWORD_SALT_ROUNDS=12

# === EMAIL ===
SMTP_HOST=smtp.empresa.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=sistema@viacaopioneira.com
SMTP_PASS=${SMTP_PASSWORD_SECRET}
SMTP_FROM=noreply@sistemapremicao.viacaopioneira.com

# === RATE LIMITING ===
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=300000
RATE_LIMIT_API_MAX=100
RATE_LIMIT_API_WINDOW=60000

# === SESSION ===
SESSION_SECRET=${SESSION_SECRET_64_CHARS}
MAX_SESSIONS_PER_USER=5
SESSION_TIMEOUT_MINUTES=30

# === SECURITY ===
ACCOUNT_LOCKOUT_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=1800000
PASSWORD_RESET_EXPIRES=3600000
BCRYPT_ROUNDS=12

# === FRONTEND ===
NEXT_PUBLIC_API_URL=https://api.premiacao.viacaopioneira.com
FRONTEND_URL=https://premiacao.viacaopioneira.com

# === MONITORING ===
LOG_LEVEL=info
AUDIT_RETENTION_DAYS=2555 # 7 anos
ENABLE_SECURITY_ALERTS=true
```

#### **🎯 Docker Production Setup**

```dockerfile
# Dockerfile.production
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production API
FROM base AS api-runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/

USER apiuser
EXPOSE 3001

ENV NODE_ENV=production
ENV API_PORT=3001

CMD ["node", "apps/api/dist/main.js"]
```

#### **🎯 Docker Compose Production**

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - internal
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    networks:
      - internal
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 3

  api:
    build:
      context: .
      dockerfile: Dockerfile.production
      target: api-runner
    environment:
      - NODE_ENV=production
      - POSTGRES_HOST=postgres
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - internal
      - web
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: .
      dockerfile: Dockerfile.production
      target: web-runner
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    depends_on:
      - api
    networks:
      - web
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
      - api
    networks:
      - web
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  internal:
    driver: bridge
  web:
    driver: bridge
```

### **9.3 Security Hardening & Final Checks (Dia 26-27)**

#### **🎯 Nginx Security Configuration**

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Hide nginx version
    server_tokens off;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    # Upstream
    upstream api {
        server api:3001;
    }

    upstream web {
        server web:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name premiacao.viacaopioneira.com;
        return 301 https://$server_name$request_uri;
    }

    # Main server
    server {
        listen 443 ssl http2;
        server_name premiacao.viacaopioneira.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;

            # Special rate limiting for auth endpoints
            location /api/auth/login {
                limit_req zone=login burst=3 nodelay;
                proxy_pass http://api;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Block common attack vectors
        location ~* \.(env|git|svn|htaccess|htpasswd)$ {
            deny all;
            return 404;
        }
    }
}
```

#### **🎯 Database Security Setup**

```sql
-- database-security.sql

-- Criar usuário específico para aplicação
CREATE USER app_user WITH PASSWORD 'strong_random_password';

-- Conceder apenas permissões necessárias
GRANT CONNECT ON DATABASE premiacao_prod TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Configurações de segurança
ALTER DATABASE premiacao_prod SET log_statement = 'mod';
ALTER DATABASE premiacao_prod SET log_min_duration_statement = 1000;

-- Row Level Security para tabelas sensíveis
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política para usuários (apenas seus próprios dados, exceto admins)
CREATE POLICY user_isolation ON users
    FOR ALL TO app_user
    USING (id = current_setting('app.current_user_id')::int OR
           EXISTS (SELECT 1 FROM user_roles ur
                   JOIN roles r ON ur.role_id = r.id
                   WHERE ur.user_id = current_setting('app.current_user_id')::int
                   AND r.nome = 'DIRETOR'));

-- Backup automático
CREATE OR REPLACE FUNCTION backup_audit_logs()
RETURNS void AS $
BEGIN
    -- Archive logs older than 90 days to backup table
    INSERT INTO audit_logs_archive
    SELECT * FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';

    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$ LANGUAGE plpgsql;

-- Schedule backup (via cron or pg_cron extension)
SELECT cron.schedule('backup-audit-logs', '0 2 * * 0', 'SELECT backup_audit_logs();');
```

#### **🎯 Security Checklist Final**

```markdown
# ✅ Security Checklist Final

## Backend Security

- [ ] JWT secrets são criptograficamente seguros (64+ chars)
- [ ] Senhas são hasheadas com Argon2/bcrypt (12+ rounds)
- [ ] Rate limiting implementado em endpoints críticos
- [ ] Account lockout após tentativas falhadas
- [ ] CORS configurado corretamente
- [ ] Helmet headers de segurança ativados
- [ ] Input validation com Zod em todas as rotas
- [ ] SQL injection prevention (TypeORM + validação)
- [ ] Session management seguro
- [ ] Refresh token rotation implementado
- [ ] Auditoria completa de ações sensíveis

## Frontend Security

- [ ] Tokens armazenados em httpOnly cookies
- [ ] CSP headers configurados
- [ ] XSS prevention implementado
- [ ] Rotas protegidas corretamente
- [ ] Logout automático por inatividade
- [ ] Estado de auth limpo no logout
- [ ] Validação de permissões na UI
- [ ] Sanitização de inputs do usuário

## Infrastructure Security

- [ ] HTTPS obrigatório (redirect HTTP)
- [ ] TLS 1.2+ apenas
- [ ] Database com usuário específico (não root)
- [ ] Environment variables seguras
- [ ] Secrets management implementado
- [ ] Firewall configurado
- [ ] Logs de segurança habilitados
- [ ] Backup automatizado
- [ ] Monitoring de segurança ativo

## Compliance & Governance

- [ ] LGPD compliance verificado
- [ ] Política de retenção de dados definida
- [ ] Incident response plan documentado
- [ ] Treinamento de segurança para admins
- [ ] Procedimentos de backup/recovery testados
```

---

## **FASE 10: MONITORAMENTO E MANUTENÇÃO (Semana 5-6)**

### **10.1 Monitoring & Observability (Dia 27-28)**

#### **🎯 Application Monitoring**

```typescript
// src/middleware/monitoring.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { performance } from 'perf_hooks';

interface SecurityMetrics {
  loginAttempts: number;
  failedLogins: number;
  suspiciousActivities: number;
  blockedIPs: Set<string>;
  activeUsers: number;
}

export class SecurityMonitoring {
  private metrics: SecurityMetrics = {
    loginAttempts: 0,
    failedLogins: 0,
    suspiciousActivities: 0,
    blockedIPs: new Set(),
    activeUsers: 0,
  };

  async trackRequest(request: FastifyRequest, reply: FastifyReply) {
    const startTime = performance.now();
    const { method, url, ip } = request;

    // Track security-relevant endpoints
    if (url.includes('/auth/')) {
      this.trackAuthEndpoint(request, reply);
    }

    reply.addHook('onSend', async () => {
      const duration = performance.now() - startTime;

      // Log slow requests (potential DoS)
      if (duration > 5000) {
        await this.logSlowRequest(request, duration);
      }

      // Track response codes
      if (reply.statusCode >= 400) {
        await this.trackErrorResponse(request, reply);
      }
    });
  }

  private async trackAuthEndpoint(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const { url, ip } = request;

    if (url.includes('/login')) {
      this.metrics.loginAttempts++;

      reply.addHook('onSend', async () => {
        if (reply.statusCode === 401) {
          this.metrics.failedLogins++;
          await this.checkBruteForce(ip);
        }
      });
    }
  }

  private async checkBruteForce(ip: string) {
    // Check failed attempts from this IP in last 5 minutes
    const recentFailures = await this.getRecentFailedLogins(ip);

    if (recentFailures >= 10) {
      this.metrics.blockedIPs.add(ip);
      this.metrics.suspiciousActivities++;

      await this.alertSecurityTeam({
        type: 'BRUTE_FORCE_DETECTED',
        ip,
        attempts: recentFailures,
        timestamp: new Date(),
      });
    }
  }

  async getSecurityMetrics() {
    return {
      ...this.metrics,
      blockedIPsCount: this.metrics.blockedIPs.size,
      timestamp: new Date(),
      healthy: this.isSystemHealthy(),
    };
  }

  private isSystemHealthy(): boolean {
    return (
      this.metrics.failedLogins < 100 &&
      this.metrics.suspiciousActivities < 10 &&
      this.metrics.blockedIPs.size < 50
    );
  }
}
```

#### **🎯 Health Check Endpoints**

```typescript
// src/routes/health.routes.ts
export const healthRoutes = async (fastify: FastifyInstance) => {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };

    reply.send(health);
  });

  // Detailed system check
  fastify.get(
    '/health/detailed',
    {
      preHandler: [
        authenticateUser,
        requirePermission(Permission.MANAGE_SYSTEM_SETTINGS),
      ],
    },
    async (request, reply) => {
      const [dbHealth, redisHealth, securityHealth] = await Promise.all([
        checkDatabaseHealth(),
        checkRedisHealth(),
        checkSecurityHealth(),
      ]);

      const overall =
        dbHealth.healthy && redisHealth.healthy && securityHealth.healthy;

      reply.code(overall ? 200 : 503).send({
        status: overall ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealth,
          redis: redisHealth,
          security: securityHealth,
        },
      });
    }
  );

  // Security-specific health
  fastify.get(
    '/health/security',
    {
      preHandler: [
        authenticateUser,
        requirePermission(Permission.VIEW_ALL_AUDIT_LOGS),
      ],
    },
    async (request, reply) => {
      const securityMetrics = await securityMonitoring.getSecurityMetrics();

      reply.send({
        status: securityMetrics.healthy ? 'secure' : 'at_risk',
        metrics: securityMetrics,
        recommendations: generateSecurityRecommendations(securityMetrics),
      });
    }
  );
};

async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await AppDataSource.query('SELECT 1');
    const responseTime = Date.now() - start;

    return {
      healthy: responseTime < 1000,
      responseTime,
      status: responseTime < 1000 ? 'fast' : 'slow',
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      status: 'down',
    };
  }
}
```

### **10.2 Automated Alerting (Dia 28-29)**

#### **🎯 Alert System**

```typescript
// src/services/alert.service.ts
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: number;
}

export class AlertService {
  private alerts: Map<string, SecurityAlert> = new Map();

  async createAlert(
    alert: Omit<SecurityAlert, 'id' | 'timestamp'>
  ): Promise<string> {
    const alertId = uuidv4();
    const newAlert: SecurityAlert = {
      ...alert,
      id: alertId,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.set(alertId, newAlert);

    // Send notifications based on severity
    await this.processAlert(newAlert);

    return alertId;
  }

  private async processAlert(alert: SecurityAlert) {
    // Log to audit system
    await this.auditService.createLog({
      actionType: 'SECURITY_ALERT_CREATED',
      details: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
      },
    });

    // Send notifications
    switch (alert.severity) {
      case AlertSeverity.CRITICAL:
        await this.sendImmediateNotification(alert);
        await this.sendSlackAlert(alert);
        await this.sendEmailAlert(alert);
        break;

      case AlertSeverity.HIGH:
        await this.sendSlackAlert(alert);
        await this.sendEmailAlert(alert);
        break;

      case AlertSeverity.MEDIUM:
        await this.sendSlackAlert(alert);
        break;

      case AlertSeverity.LOW:
        // Just log, no immediate notification
        break;
    }
  }

  private async sendImmediateNotification(alert: SecurityAlert) {
    // SMS, phone call, or other immediate notification
    // Implementation depends on available services
    console.log(`🚨 CRITICAL ALERT: ${alert.title}`);
  }

  private async sendSlackAlert(alert: SecurityAlert) {
    if (!process.env.SLACK_WEBHOOK_URL) return;

    const color = {
      [AlertSeverity.LOW]: '#36a64f',
      [AlertSeverity.MEDIUM]: '#ff9500',
      [AlertSeverity.HIGH]: '#ff5733',
      [AlertSeverity.CRITICAL]: '#dc143c',
    }[alert.severity];

    const payload = {
      text: `Security Alert: ${alert.title}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            { title: 'Type', value: alert.type, short: true },
            { title: 'Description', value: alert.description, short: false },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true,
            },
          ],
        },
      ],
    };

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async resolveAlert(alertId: string, resolvedBy: number): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error('Alert not found');

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    await this.auditService.createLog({
      userId: resolvedBy,
      actionType: 'SECURITY_ALERT_RESOLVED',
      details: { alertId, type: alert.type },
    });
  }
}
```

#### **🎯 Automated Security Checks**

```typescript
// src/jobs/security-check.job.ts
import cron from 'node-cron';

export class SecurityCheckJob {
  constructor(
    private alertService: AlertService,
    private auditService: AuditService,
    private userService: UserService
  ) {}

  start() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.runSecurityChecks();
    });

    // Daily security report
    cron.schedule('0 8 * * *', () => {
      this.generateDailyReport();
    });

    // Weekly comprehensive audit
    cron.schedule('0 10 * * 1', () => {
      this.weeklySecurityAudit();
    });
  }

  private async runSecurityChecks() {
    await Promise.all([
      this.checkSuspiciousLogins(),
      this.checkAccountLockouts(),
      this.checkFailedLoginSpikes(),
      this.checkUnusualActivity(),
      this.checkSystemHealth(),
    ]);
  }

  private async checkSuspiciousLogins() {
    const suspiciousLogins = await this.auditService.findSuspiciousLogins({
      timeframe: '5m',
      criteria: {
        multipleLocations: true,
        unusualHours: true,
        newDevices: true,
      },
    });

    for (const login of suspiciousLogins) {
      await this.alertService.createAlert({
        type: 'SUSPICIOUS_LOGIN',
        severity: AlertSeverity.MEDIUM,
        title: 'Login suspeito detectado',
        description: `Usuário ${login.userName} fez login de localização/dispositivo incomum`,
        metadata: login,
      });
    }
  }

  private async checkFailedLoginSpikes() {
    const failedLogins = await this.auditService.getFailedLoginStats('1h');

    if (failedLogins.count > 50) {
      await this.alertService.createAlert({
        type: 'BRUTE_FORCE_ATTACK',
        severity: AlertSeverity.HIGH,
        title: 'Possível ataque de força bruta',
        description: `${failedLogins.count} tentativas de login falhadas na última hora`,
        metadata: {
          count: failedLogins.count,
          topIPs: failedLogins.topIPs,
          topTargets: failedLogins.topTargets,
        },
      });
    }
  }

  private async generateDailyReport() {
    const report = await this.generateSecurityReport('24h');

    // Send to security team
    await this.emailService.sendSecurityReport(
      process.env.SECURITY_TEAM_EMAIL!,
      'Relatório Diário de Segurança',
      report
    );
  }

  private async weeklySecurityAudit() {
    const auditResults = await Promise.all([
      this.auditUserPermissions(),
      this.auditInactiveAccounts(),
      this.auditPasswordPolicies(),
      this.auditSystemConfiguration(),
    ]);

    const criticalIssues = auditResults.filter(
      (result) => result.severity === 'critical'
    );

    if (criticalIssues.length > 0) {
      await this.alertService.createAlert({
        type: 'SECURITY_AUDIT_FAILED',
        severity: AlertSeverity.CRITICAL,
        title: 'Auditoria semanal encontrou problemas críticos',
        description: `${criticalIssues.length} problemas críticos encontrados`,
        metadata: { issues: criticalIssues },
      });
    }
  }
}
```

### **10.3 Performance Optimization (Dia 29-30)**

#### **🎯 Database Query Optimization**

```typescript
// src/repositories/optimized.repository.ts
export class OptimizedUserRepository {
  // Cache frequently accessed data
  private permissionCache = new Map<number, Permission[]>();
  private userRoleCache = new Map<number, Role[]>();

  async getUserWithPermissions(
    userId: number
  ): Promise<UserWithPermissions | null> {
    // Check cache first
    const cachedPermissions = this.permissionCache.get(userId);
    if (cachedPermissions) {
      const user = await this.userRepo.findOneBy({ id: userId });
      return user ? { ...user, permissions: cachedPermissions } : null;
    }

    // Single query with joins instead of multiple queries
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoin('role.permissions', 'permission')
      .addSelect('permission.name')
      .where('user.id = :userId', { userId })
      .andWhere('user.ativo = true')
      .getOne();

    if (user) {
      const permissions = user.roles.flatMap((role) => role.permissions || []);

      // Cache for 5 minutes
      this.permissionCache.set(userId, permissions);
      setTimeout(() => this.permissionCache.delete(userId), 5 * 60 * 1000);

      return { ...user, permissions };
    }

    return null;
  }

  async getUsersWithPagination(
    page: number = 1,
    limit: number = 20,
    filters?: UserFilters
  ): Promise<PaginatedResult<UserEntity>> {
    const queryBuilder = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .select([
        'user.id',
        'user.nome',
        'user.email',
        'user.ativo',
        'user.lastLoginAt',
        'role.nome',
      ]);

    // Apply filters
    if (filters?.active !== undefined) {
      queryBuilder.andWhere('user.ativo = :active', { active: filters.active });
    }

    if (filters?.role) {
      queryBuilder.andWhere('role.nome = :role', { role: filters.role });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(user.nome ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Get total count and data in parallel
    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Bulk operations for better performance
  async bulkUpdateLastLogin(userIds: number[]): Promise<void> {
    await this.userRepo
      .createQueryBuilder()
      .update(UserEntity)
      .set({ lastLoginAt: new Date() })
      .where('id IN (:...userIds)', { userIds })
      .execute();
  }
}
```

#### **🎯 Frontend Performance Optimizations**

```typescript
// src/hooks/useOptimizedAuth.ts
import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export function useOptimizedAuth() {
  const { user, permissions, hasPermission, hasRole } = useAuthStore();

  // Memoize expensive permission checks
  const permissionChecker = useMemo(() => ({
    canManageUsers: hasPermission(Permission.MANAGE_USERS),
    canApproveExpurgos: hasPermission(Permission.APPROVE_EXPURGOS),
    canViewReports: hasPermission(Permission.VIEW_REPORTS),
    canManageParameters: hasPermission(Permission.MANAGE_PARAMETERS),
    isDirector: hasRole(Role.DIRETOR),
    isGerente: hasRole(Role.GERENTE),
    isVisualizador: hasRole(Role.VISUALIZADOR)
  }), [hasPermission, hasRole]);

  // Memoize user info
  const userInfo = useMemo(() => ({
    id: user?.id,
    nome: user?.nome,
    email: user?.email,
    roles: user?.roles || [],
    sectorId: user?.sectorId
  }), [user]);

  // Optimized permission check with caching
  const checkPermission = useCallback((permission: Permission) => {
    return permissions.includes(permission);
  }, [permissions]);

  return {
    user: userInfo,
    permissions: permissionChecker,
    checkPermission,
    isAuthenticated: !!user
  };
}

// src/components/optimized/PermissionBoundary.tsx
interface PermissionBoundaryProps {
  permissions?: Permission[];
  roles?: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export const PermissionBoundary = memo(({
  permissions = [],
  roles = [],
  children,
  fallback = null,
  loading = null
}: PermissionBoundaryProps) => {
  const { permissions: userPermissions, checkPermission, isAuthenticated } = useOptimizedAuth();

  // Loading state
  if (loading && !isAuthenticated) {
    return <>{loading}</>;
  }

  // Permission check
  const hasRequiredPermission = permissions.length === 0 ||
    permissions.some(permission => checkPermission(permission));

  const hasRequiredRole = roles.length === 0 ||
    roles.some(role => userPermissions[`is${role}`]);

  if (!hasRequiredPermission || !hasRequiredRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
});
```

---

## **CRONOGRAMA E MARCOS**

### **📅 Timeline Resumido**

| Semana | Fase               | Entregas Principais                      |
| ------ | ------------------ | ---------------------------------------- |
| **1**  | Fundação Backend   | Entidades, DTOs, JWT Config, AuthService |
| **2**  | Proteção & APIs    | Middlewares, Rotas Auth, User Management |
| **3**  | Frontend Auth      | Context, Login/Logout, Route Protection  |
| **4**  | Segurança Avançada | Rate Limiting, Session Mgmt, Monitoring  |
| **5**  | Deploy & Docs      | Production Setup, Security Hardening     |
| **6**  | Testes & Ajustes   | Load Tests, Security Audit, Bug Fixes    |

### **🎯 Marcos Críticos**

- **Dia 7:** ✅ Backend Auth funcionando (login/logout)
- **Dia 14:** ✅ Frontend integrado com backend auth
- **Dia 21:** ✅ Sistema completo em staging
- **Dia 28:** ✅ Production ready com security hardening
- **Dia 35:** ✅ Go-live com monitoring ativo

---

## **🚨 RISCOS E MITIGAÇÕES**

### **Riscos Técnicos**

1. **Integração com Sistema Legado**

   - _Mitigação:_ Testes extensivos com dados reais
   - _Contingência:_ Rollback plan preparado

2. **Performance com Múltiplas Sessões**

   - _Mitigação:_ Load testing desde início
   - _Contingência:_ Redis clustering se necessário

3. **Complexidade do RBAC**
   - _Mitigação:_ Implementação incremental
   - _Contingência:_ Versão simplificada inicial

### **Riscos de Segurança**

1. **Vulnerabilidades Zero-Day**

   - _Mitigação:_ Atualizações regulares, monitoring
   - _Contingência:_ Incident response plan

2. **Ataques DDoS**
   - _Mitigação:_ Rate limiting, CDN
   - _Contingência:_ Cloudflare protection

### **Riscos de Prazo**

1. **Complexidade Subestimada**
   - _Mitigação:_ Buffer de 20% no cronograma
   - _Contingência:_ Features opcionals para V2

---

## **📚 RECURSOS E REFERÊNCIAS**

### **Documentação Técnica**

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Fastify Security](https://www.fastify.io/docs/latest/Guides/Getting-Started/#security)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

### **Ferramentas de Segurança**

- **SAST:** SonarQube, CodeQL
- **DAST:** OWASP ZAP, Burp Suite
- **Dependency Check:** Snyk, npm audit
- **Secrets:** HashiCorp Vault, AWS Secrets Manager

### **Monitoring**

- **APM:** New Relic, DataDog
- **Logs:** ELK Stack, Splunk
- **Metrics:** Prometheus + Grafana
- **Alerting:** PagerDuty, Slack

---

**🎉 Este roadmap garante uma implementação completa, segura e escalável do sistema de autenticação, seguindo as melhores práticas da indústria e preparando o sistema para crescimento futuro!**
