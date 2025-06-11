// apps/api/src/config/database.ts
import { AppDataSource } from '@/database/data-source';
import { FastifyInstance } from 'fastify';

/**
 * Configuração e inicialização do banco de dados
 */
export class DatabaseConfig {
  /**
   * Inicializar conexão com banco e executar verificações
   */
  static async initialize(fastify: FastifyInstance): Promise<void> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      fastify.log.info('Data Source Postgres inicializado pelo servidor.');
      console.log(
        '<== AppDataSource.initialize() CONCLUÍDO (sem erro lançado).'
      );

      // Verificar tabelas existentes
      await this.verifyTables(fastify);

      // Sincronização explícita (apenas desenvolvimento)
      await this.synchronizeSchema(fastify);
    } else {
      console.log('AppDataSource já estava inicializado.');
      await this.synchronizeSchema(fastify);
    }
  }

  /**
   * Verificar se as tabelas esperadas existem
   */
  private static async verifyTables(fastify: FastifyInstance): Promise<void> {
    try {
      console.log('==> Verificando tabelas existentes via TypeORM...');
      const queryRunner = AppDataSource.createQueryRunner();
      const tableNames = [
        'sectors',
        'criteria',
        'roles',
        'users',
        'user_roles',
        'parameter_values',
        'performance_data',
        'audit_logs',
        'expurgo_events',
        'competition_periods',
        'user_sessions',
      ];

      const tables = await queryRunner.getTables(tableNames);
      await queryRunner.release();

      if (tables.length > 0) {
        console.log(
          `<== TypeORM encontrou ${tables.length} tabelas:`,
          tables.map((t) => t.name)
        );
      } else {
        console.warn(
          "<== TypeORM NÃO encontrou NENHUMA das tabelas esperadas no schema 'public'. Sincronização não ocorreu?"
        );
      }
    } catch (getTableError) {
      console.error(
        '<== ERRO ao tentar verificar tabelas via TypeORM:',
        getTableError
      );
    }
  }

  /**
   * Sincronizar schema (apenas desenvolvimento)
   */
  private static async synchronizeSchema(
    fastify: FastifyInstance
  ): Promise<void> {
    try {
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (isDevelopment) {
        console.log('==> Tentando sincronização explícita do schema...');
        await AppDataSource.synchronize();
        console.log('<== Sincronização explícita CONCLUÍDA.');
      } else {
        fastify.log.info('Sincronização automática desabilitada em produção');
      }
    } catch (syncErr) {
      console.error('<== ERRO durante sincronização EXPLÍCITA:', syncErr);
    }
  }

  /**
   * Verificar se banco está inicializado
   */
  static async ensureInitialized(): Promise<void> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  }
}
