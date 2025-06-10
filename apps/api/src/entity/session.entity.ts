// apps/api/src/entity/session.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'user_sessions' })
@Index(['userId', 'isActive'])
@Index(['expiresAt'])
@Index(['refreshTokenHash'])
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === RELAÇÃO COM USUÁRIO ===
  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  // === TOKENS ===
  @Column({ type: 'text', select: false })
  refreshTokenHash!: string; // Hash do refresh token

  // === INFORMAÇÕES DA SESSÃO ===
  @Column({ type: 'varchar', length: 45 }) // IPv6 max length
  ipAddress!: string;

  @Column({ type: 'text' })
  userAgent!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceInfo?: string; // Ex: "Chrome on Windows", "Safari on iPhone"

  @Column({ type: 'varchar', length: 100, nullable: true })
  location?: string; // Ex: "São Paulo, BR"

  // === CONTROLE DE TEMPO ===
  @Column({ type: 'timestamp with time zone' })
  expiresAt!: Date;

  @Column({ type: 'timestamp with time zone' })
  lastUsedAt!: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // === METADATA ADICIONAL ===
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    loginMethod?: 'password' | 'google' | 'microsoft'; // Para futuras integrações
    rememberMe?: boolean;
    suspicious?: boolean;
    logoutReason?: 'manual' | 'expired' | 'security' | 'admin';
  };

  // === AUDITORIA ===
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // === MÉTODOS HELPER ===

  /**
   * Verifica se a sessão está expirada
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Verifica se a sessão está válida (ativa e não expirada)
   */
  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  /**
   * Atualiza o último uso da sessão
   */
  updateLastUsed(): void {
    this.lastUsedAt = new Date();
  }

  /**
   * Invalida a sessão
   */
  invalidate(reason?: string): void {
    this.isActive = false;
    if (reason && this.metadata) {
      this.metadata.logoutReason = reason as any;
    }
  }

  /**
   * Estende a expiração da sessão
   */
  extendExpiration(hours: number = 24): void {
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /**
   * Verifica se a sessão é suspeita (IP ou User-Agent diferente)
   */
  isSuspicious(currentIP: string, currentUserAgent: string): boolean {
    if (this.ipAddress !== currentIP) return true;

    // Verificação simples de User-Agent (pode ser melhorada)
    const originalUA = this.userAgent.toLowerCase();
    const currentUA = currentUserAgent.toLowerCase();

    // Se mudou de browser/OS completamente
    const browsers = ['chrome', 'firefox', 'safari', 'edge'];
    const originalBrowser = browsers.find((b) => originalUA.includes(b));
    const currentBrowser = browsers.find((b) => currentUA.includes(b));

    if (
      originalBrowser &&
      currentBrowser &&
      originalBrowser !== currentBrowser
    ) {
      return true;
    }

    return false;
  }

  /**
   * Retorna informações básicas da sessão (sem dados sensíveis)
   */
  getPublicInfo() {
    return {
      id: this.id,
      deviceInfo: this.deviceInfo,
      location: this.location,
      lastUsedAt: this.lastUsedAt,
      createdAt: this.createdAt,
      isActive: this.isActive,
      isCurrent: false, // Será definido pelo contexto
    };
  }

  /**
   * Cria informações de dispositivo baseadas no User-Agent
   */
  static parseDeviceInfo(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    // Detectar browser
    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';

    // Detectar OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    return `${browser} on ${os}`;
  }
}
