// apps/api/src/modules/etl/mysql-etl.service.ts (VERSÃO INTEGRAL E CORRIGIDA V2)
import { AppDataSource, MySqlDataSource } from '@/database/data-source';
import { RawMySqlOcorrenciaHorariaEntity } from '@/entity/raw-data/raw-mysql-ocorrencia-horaria.entity'; // Importar entidade raw
import { RawMySqlQuebraDefeitoEntity } from '@/entity/raw-data/raw-mysql-quebra-defeito.entity';
import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';

// Interface para o resultado da query de Quebra/Defeito
interface QuebraDefeitoRawFromQuery {
  SETOR: string;
  OCORRENCIA: string;
  TOTAL: number | string; // Pode vir como string
  DIA: Date;
}

// Interface para o resultado da query de Ocorrências Horárias
interface OcorrenciaHorariaRawFromQuery {
  SETOR: string;
  OCORRENCIA_ORIGINAL: string;
  DATA: Date;
  TOTAL: number | string; // Pode vir como string
}

// Interface unificada para retorno dos métodos públicos (opcional)
interface MySqlEtlResult {
  SETOR: string;
  CRITERIO:
    | 'QUEBRA'
    | 'DEFEITO'
    | 'ATRASO'
    | 'FURO POR ATRASO'
    | 'FURO DE VIAGEM';
  DATA: Date;
  TOTAL: number;
}

export class MySqlEtlService {
  // Repositórios das tabelas RAW no POSTGRES
  private rawQuebraDefeitoRepo: Repository<RawMySqlQuebraDefeitoEntity>;
  private rawOcorrenciaHorariaRepo: Repository<RawMySqlOcorrenciaHorariaEntity>;

  constructor() {
    this.rawQuebraDefeitoRepo = AppDataSource.getRepository(
      RawMySqlQuebraDefeitoEntity
    );
    this.rawOcorrenciaHorariaRepo = AppDataSource.getRepository(
      RawMySqlOcorrenciaHorariaEntity
    );
    console.log(
      '[MySqlEtlService] Instanciado e repositórios Raw configurados.'
    );
  }

  private async ensureMySqlConnection(): Promise<DataSource> {
    const dataSource = MySqlDataSource;
    if (!dataSource.isInitialized) {
      console.log('[MySQL ETL] Inicializando MySqlDataSource...');
      await dataSource.initialize();
      console.log('[MySQL ETL] MySqlDataSource inicializado.');
    }
    return dataSource;
  }
  private async ensurePostgresConnection(): Promise<DataSource> {
    const dataSource = AppDataSource;
    if (!dataSource.isInitialized) {
      console.log('[MySQL ETL] Inicializando AppDataSource (Postgres)...');
      await dataSource.initialize();
      console.log('[MySQL ETL] AppDataSource (Postgres) inicializado.');
    }
    return dataSource;
  }

  /**
   * Extrai dados de Quebra e Defeito do MySQL e SALVA na tabela raw no Postgres.
   * @param startDate YYYY-MM-DD
   * @param endDate YYYY-MM-DD
   * @returns Promise<number> Número de registros processados/salvos.
   */
  async extractAndLoadQuebraDefeito(
    startDate: string,
    endDate: string
  ): Promise<number> {
    console.log(
      `[MySQL ETL] Iniciando extração/carga de Quebra/Defeito para ${startDate} a ${endDate}`
    );
    const mysqlDataSource = await this.ensureMySqlConnection();
    await this.ensurePostgresConnection();

    try {
      const query = `
                SELECT S.SETOR, A.OCORRENCIA, COUNT(A.OCORRENCIA) AS TOTAL, DATE(A.DATA) as DIA
                FROM negocioperfeito.quebrasedefeitos A
                INNER JOIN negocioperfeito.setores AS S ON S.CODSETOR = A.SETORLINHA
                WHERE A.EXCLUIR = 'NÃO'
                  AND A.CODOCORRENCIA IN (1, 2) /* 1=Quebra, 2=Defeito */
                  AND A.DATA BETWEEN ? AND ?
                GROUP BY S.SETOR, A.OCORRENCIA, DATE(A.DATA)
                ORDER BY S.SETOR, DIA, A.OCORRENCIA;
            `;
      const parameters = [startDate, endDate];
      const results: QuebraDefeitoRawFromQuery[] = await mysqlDataSource.query(
        query,
        parameters
      );
      console.log(
        `[MySQL ETL] Query Quebra/Defeito retornou ${results.length} registros.`
      );
      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawQuebraDefeitoRepo.create({
          metricDate:
            r.DIA instanceof Date
              ? r.DIA.toISOString().split('T')[0]
              : String(r.DIA),
          sectorName: r.SETOR,
          occurrenceType: r.OCORRENCIA,
          totalCount: Number(r.TOTAL) || 0,
        })
      );

      // TODO: Adicionar lógica de Delete/Insert ou Upsert
      console.log(
        `[MySQL ETL] Salvando ${entitiesToSave.length} registros em raw_mysql_quebras_defeitos...`
      );
      await this.rawQuebraDefeitoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[MySQL ETL] Registros de Quebra/Defeito salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        '[MySQL ETL] ERRO durante extração/carga de Quebra/Defeito:',
        error
      );
      return 0;
    }
  }

  /**
   * Método auxiliar para buscar dados da tabela ocorrenciashorarias e salvar na tabela raw Postgres.
   */
  private async extractAndLoadFromOcorrenciasHorarias(
    startDate: string,
    endDate: string,
    codOcorrencia: number,
    criterionName: 'ATRASO' | 'FURO POR ATRASO' | 'FURO DE VIAGEM'
  ): Promise<number> {
    console.log(
      `[MySQL ETL] Iniciando extração/carga de ${criterionName} (cod ${codOcorrencia}) para ${startDate} a ${endDate}`
    );
    const mysqlDataSource = await this.ensureMySqlConnection();
    await this.ensurePostgresConnection();

    try {
      const query = `
                SELECT
                    S.SETOR,
                    A.OCORRENCIA AS OCORRENCIA_ORIGINAL,
                    DATE(A.DATA) as DATA,
                    COUNT(A.CODOCORRENCIA) AS TOTAL
                FROM negocioperfeito.ocorrenciashorarias AS A
                INNER JOIN negocioperfeito.setores S ON S.CODSETOR = A.SETORLINHA
                WHERE
                    A.CODOCORRENCIA = ?
                    AND A.CODMOTIVO NOT IN (1, 5, 6, 33, 37, 42, 43, 73, 79, 35, 81)
                    AND A.DATA BETWEEN ? AND ?
                    AND (
                            (A.TEMPO > '00:03:00') OR
                            (A.CODOCORRENCIA = 4 AND A.CODMOTIVO NOT IN (40))
                        )
                GROUP BY S.SETOR, A.OCORRENCIA, DATE(A.DATA)
                ORDER BY S.SETOR, DATA, A.OCORRENCIA;
            `;

      // --- CORREÇÃO NO FORMATO DA DATA PARA OS PARÂMETROS ---
      const startDateMySql = startDate.replace(/-/g, '/'); // YYYY-MM-DD -> YYYY/MM/DD
      const endDateMySql = endDate.replace(/-/g, '/'); // YYYY-MM-DD -> YYYY/MM/DD

      const parameters = [codOcorrencia, startDateMySql, endDateMySql];

      console.log(
        `[MySQL ETL] Executando query para ${criterionName} (cod ${codOcorrencia}) no MySQL...`
      );
      const results: OcorrenciaHorariaRawFromQuery[] =
        await mysqlDataSource.query(query, parameters);
      console.log(
        `[MySQL ETL] Query ${criterionName} (cod ${codOcorrencia}) retornou ${results.length} registros.`
      );

      if (results.length === 0) {
        console.log(
          `[MySQL ETL] Nenhum registro de ${criterionName} encontrado no MySQL para o período.`
        );
        return 0;
      }
      console.log(
        `[MySQL ETL] DETALHADO: Primeiros resultados brutos para ${criterionName}:`,
        JSON.stringify(results.slice(0, 2), null, 2)
      );

      const entitiesToSave = results.map((r) =>
        this.rawOcorrenciaHorariaRepo.create({
          metricDate:
            r.DATA instanceof Date
              ? r.DATA.toISOString().split('T')[0]
              : String(r.DATA),
          sectorName: r.SETOR,
          criterionName: criterionName,
          originalOccurrenceName: r.OCORRENCIA_ORIGINAL,
          totalCount: Number(r.TOTAL) || 0,
        })
      );
      if (entitiesToSave.length === 0) {
        console.log(
          `[MySQL ETL] DETALHADO: Nenhum registro válido de ${criterionName} para salvar após mapeamento.`
        );
        return 0;
      }

      // TODO: Adicionar lógica de Delete/Insert ou Upsert
      console.log(
        `[MySQL ETL] Salvando ${entitiesToSave.length} registros em raw_mysql_ocorrencias_horarias...`
      );
      await this.rawOcorrenciaHorariaRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[MySQL ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[MySQL ETL] ERRO durante extração/carga de ${criterionName} (cod ${codOcorrencia}):`,
        error
      );
      return 0;
    }
  }

  // Métodos Públicos usando o auxiliar
  async extractAndLoadAtraso(
    startDate: string,
    endDate: string
  ): Promise<number> {
    return this.extractAndLoadFromOcorrenciasHorarias(
      startDate,
      endDate,
      2,
      'ATRASO'
    );
  }

  async extractAndLoadFuroPorAtraso(
    startDate: string,
    endDate: string
  ): Promise<number> {
    return this.extractAndLoadFromOcorrenciasHorarias(
      startDate,
      endDate,
      3,
      'FURO POR ATRASO'
    );
  }

  async extractAndLoadFuroDeViagem(
    startDate: string,
    endDate: string
  ): Promise<number> {
    return this.extractAndLoadFromOcorrenciasHorarias(
      startDate,
      endDate,
      4,
      'FURO DE VIAGEM'
    );
  }

  // Futuro: async extractAndLoadFaltaFrota(...) {}
} // Fim da Classe
