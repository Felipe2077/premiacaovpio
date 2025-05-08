// apps/api/src/modules/etl/oracle-etl.service.ts (VERSÃO COM MAIS MÉTODOS ETL)
import { AppDataSource, OracleDataSource } from '@/database/data-source'; // Ambos podem ser necessários
import { RawOracleAusenciaEntity } from '@/entity/raw-data/raw-oracle-ausencia.entity'; // Importa entidades Raw
import { RawOracleColisaoEntity } from '@/entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '@/entity/raw-data/raw-oracle-estoque-custo.entity';
import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';

// Interfaces para resultados crus das queries Oracle
interface AusenciaRawFromQuery {
  SETOR: string;
  OCORRENCIA: 'FALTA FUNC' | 'ATESTADO FUNC';
  DATA: Date;
  TOTAL: number | string;
}
interface ColisaoRawFromQuery {
  SETOR: string;
  OCORRENCIA: 'COLISÃO';
  DATA: Date;
  TOTAL: number | string;
}
interface EstoqueCustoRawFromQuery {
  SETOR: string;
  OCORRENCIA: 'PEÇAS' | 'PNEUS';
  DATA: Date;
  TOTAL: number | string;
} // DATA aqui é DATARQ

export class OracleEtlService {
  // Repositórios das tabelas RAW no POSTGRES (AppDataSource)
  private rawAusenciaRepo: Repository<RawOracleAusenciaEntity>;
  private rawColisaoRepo: Repository<RawOracleColisaoEntity>;
  private rawEstoqueCustoRepo: Repository<RawOracleEstoqueCustoEntity>;

  constructor() {
    this.rawAusenciaRepo = AppDataSource.getRepository(RawOracleAusenciaEntity);
    this.rawColisaoRepo = AppDataSource.getRepository(RawOracleColisaoEntity);
    this.rawEstoqueCustoRepo = AppDataSource.getRepository(
      RawOracleEstoqueCustoEntity
    );
    console.log(
      '[OracleEtlService] Instanciado e repositórios Raw configurados.'
    );
  }

  private async ensureOracleConnection(): Promise<DataSource> {
    const dataSource = OracleDataSource; // USA O DATASOURCE ORACLE
    if (!dataSource.isInitialized) {
      console.log('[Oracle ETL] Inicializando OracleDataSource...');
      await dataSource.initialize();
      console.log('[Oracle ETL] OracleDataSource inicializado.');
    }
    return dataSource;
  }
  private async ensurePostgresConnection(): Promise<DataSource> {
    // Helper para Postgres
    const dataSource = AppDataSource; // USA O DATASOURCE POSTGRES
    if (!dataSource.isInitialized) {
      console.log('[Oracle ETL] Inicializando AppDataSource (Postgres)...');
      await dataSource.initialize();
      console.log('[Oracle ETL] AppDataSource (Postgres) inicializado.');
    }
    return dataSource;
  }

  /**
   * Extrai dados de Ausências do Oracle e salva na tabela raw Postgres.
   */
  async extractAndLoadAusencia(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionNameForLog = 'Ausências (Falta/Atestado)';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionNameForLog} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection(); // Garante conexão para salvar

    try {
      // Query baseada na Consulta 4 do PBI - Agrupando por DIA
      const query = `
            SELECT A.SETOR, A.OCORRENCIA, A.DATA, COUNT(DISTINCT A.CODFUNC) AS TOTAL
            FROM ( /* Subquery Falta Func */ SELECT CASE ... END AS SETOR, 'FALTA FUNC' AS OCORRENCIA, F.CODFUNC, TRUNC(H.DTHIST) AS DATA FROM FLP_HISTORICO H, VW_FUNCIONARIOS F WHERE ... AND H.CODOCORR IN ('81') AND H.DTHIST >= TO_DATE(:1, 'YYYY-MM-DD') AND H.DTHIST < TO_DATE(:2, 'YYYY-MM-DD') + 1 ... ) A
            WHERE A.SETOR IS NOT NULL GROUP BY A.SETOR, A.OCORRENCIA, A.DATA
            UNION ALL
            SELECT A.SETOR, A.OCORRENCIA, A.DATA, COUNT(DISTINCT A.CODFUNC) AS TOTAL
            FROM ( /* Subquery Atestado Func */ SELECT CASE ... END AS SETOR, 'ATESTADO FUNC' AS OCORRENCIA, F.CODFUNC, TRUNC(H.DTHIST) AS DATA FROM FLP_HISTORICO H, VW_FUNCIONARIOS F WHERE ... AND H.CODOCORR IN ('82', '125') AND H.DTHIST >= TO_DATE(:1, 'YYYY-MM-DD') AND H.DTHIST < TO_DATE(:2, 'YYYY-MM-DD') + 1 ... ) A
            WHERE A.SETOR IS NOT NULL GROUP BY A.SETOR, A.OCORRENCIA, A.DATA
            ORDER BY SETOR, DATA, OCORRENCIA
            `; // Query completa como antes
      const parameters = [startDate, endDate];

      console.log(
        `[Oracle ETL] Executando query de ${criterionNameForLog} no Oracle...`
      );
      const results: AusenciaRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionNameForLog} retornou ${results.length} registros.`
      );

      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawAusenciaRepo.create({
          metricDate:
            r.DATA instanceof Date
              ? r.DATA.toISOString().split('T')[0]
              : String(r.DATA),
          sectorName: r.SETOR,
          occurrenceType: r.OCORRENCIA, // 'FALTA FUNC' ou 'ATESTADO FUNC'
          employeeCount: Number(r.TOTAL) || 0, // Contagem de funcionários
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_ausencias...`
      );
      await this.rawAusenciaRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionNameForLog} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      /* ... error handling ... */ return 0;
    }
  }

  // --- MÉTODO: Extração de Colisões ---
  /**
   * Extrai dados de Colisão do Oracle e salva na tabela raw Postgres.
   */
  async extractAndLoadColisao(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionName = 'COLISÃO';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();
    try {
      // Query adaptada da Consulta 5 do PBI (PI_COLISAO) - Agrupando por Dia
      const query = `
            SELECT A.SETOR, '${criterionName}' AS OCORRENCIA, TRUNC(A.DATA) AS DATA, COUNT(A.CODOCORR) AS TOTAL
            FROM (
                SELECT CASE WHEN V.CODIGOGA = 31 THEN 'PARANOÁ'
                            WHEN V.CODIGOGA = 124 THEN 'SANTA MARIA'
                            WHEN V.CODIGOGA = 239 THEN 'SÃO SEBASTIÃO'
                            WHEN V.CODIGOGA = 240 THEN 'GAMA'
                       ELSE 'OUTRAS' END AS SETOR,
                       I.DATARAINFGER AS DATA,
                       I.CODOCORR
                FROM ACD_INFORMACOESGERAIS I, FRT_CADVEICULOS V
                WHERE I.CODOCORR = 70 -- Código de Colisão
                  AND I.DATARAINFGER >= TO_DATE(:1, 'YYYY-MM-DD')
                  AND I.DATARAINFGER < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND I.CODIGOVEIC = V.CODIGOVEIC
                  AND V.CODIGOEMPRESA = 4
                  AND V.CODIGOGA IN (31, 124, 239, 240)
                  AND I.NUMERORAINFGERPRINCIPAL IS NULL
            ) A
            WHERE A.SETOR <> 'OUTRAS'
            GROUP BY A.SETOR, TRUNC(A.DATA)
            ORDER BY A.SETOR, DATA
            `;
      const parameters = [startDate, endDate];
      const results: ColisaoRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionName} retornou ${results.length} registros.`
      );

      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawColisaoRepo.create({
          metricDate: r.DATA.toISOString().split('T')[0],
          sectorName: r.SETOR,
          totalCount: Number(r.TOTAL) || 0,
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_colisoes...`
      );
      await this.rawColisaoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      /* ... error handling ... */ return 0;
    }
  }

  // --- MÉTODO: Extração de Peças ---
  /**
   * Extrai dados de Custo de Peças do Oracle e salva na tabela raw Postgres.
   */
  async extractAndLoadPecas(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionName = 'PEÇAS';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();
    try {
      // Query adaptada da Consulta 8 do PBI (PI_PEÇAS) - Agrupando por Dia (DATARQ)
      const query = `
            SELECT A.SETOR, '${criterionName}' AS OCORRENCIA, TRUNC(A.DATA) AS DATA, SUM(A.TOTAL) AS TOTAL
            FROM (
                SELECT CASE WHEN R.CODIGOGA = 31 THEN 'PARANOÁ' /* ... Mapeamento Setor ... */ ELSE 'OUTRAS' END AS SETOR,
                       R.DATARQ AS DATA,
                       ROUND(I.VALORTOTALITENSMOVTO, 2) TOTAL
                FROM EST_REQUISICAO R, EST_ITENSMOVTO I, EST_CADMATERIAL J, EST_MOVTO M
                WHERE R.NUMERORQ = M.NUMERORQ
                  AND M.DATAMOVTO = I.DATAMOVTO
                  AND I.SEQMOVTO = M.SEQMOVTO
                  AND I.CODIGOMATINT = J.CODIGOMATINT
                  AND M.DATAMOVTO >= TO_DATE(:1, 'YYYY-MM-DD')
                  AND M.DATAMOVTO < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND R.CODIGOEMPRESA = 4 AND R.CODIGOGA IN (31, 124, 239, 240)
                  -- Filtro CODDIVISAO para Peças
                  AND ((J.CODDIVISAO BETWEEN 5100 AND 5311) OR (J.CODDIVISAO BETWEEN 5500 AND 5730) OR (J.CODDIVISAO BETWEEN 7300 AND 7430) OR (J.CODDIVISAO IN(5470,6000,6010,6710,6730,6770,8200)))
                  AND M.CODIGOHISMOV IN (20, 48)
            ) A
            WHERE A.SETOR <> 'OUTRAS'
            GROUP BY A.SETOR, TRUNC(A.DATA)
            ORDER BY A.SETOR, DATA
            `;
      const parameters = [startDate, endDate];
      const results: EstoqueCustoRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionName} retornou ${results.length} registros.`
      );

      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawEstoqueCustoRepo.create({
          metricDate: r.DATA.toISOString().split('T')[0],
          sectorName: r.SETOR,
          criterionName: criterionName, // PEÇAS
          totalValue: Number(r.TOTAL) || 0,
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_estoque_custos...`
      );
      await this.rawEstoqueCustoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      /* ... error handling ... */ return 0;
    }
  }

  // --- MÉTODO: Extração de Pneus ---
  /**
   * Extrai dados de Custo de Pneus do Oracle e salva na tabela raw Postgres.
   */
  async extractAndLoadPneus(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionName = 'PNEUS';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();
    try {
      // Query adaptada da Consulta 9 do PBI (PI_PNEUS) - Agrupando por Dia (DATARQ)
      // Muda apenas o filtro J.CODDIVISAO em relação a Peças
      const query = `
            SELECT A.SETOR, '${criterionName}' AS OCORRENCIA, TRUNC(A.DATA) AS DATA, SUM(A.TOTAL) AS TOTAL
            FROM (
                SELECT CASE WHEN R.CODIGOGA = 31 THEN 'PARANOÁ' /* ... Mapeamento Setor ... */ ELSE 'OUTRAS' END AS SETOR,
                       R.DATARQ AS DATA,
                       ROUND(I.VALORTOTALITENSMOVTO, 2) TOTAL
                FROM EST_REQUISICAO R, EST_ITENSMOVTO I, EST_CADMATERIAL J, EST_MOVTO M
                WHERE R.NUMERORQ = M.NUMERORQ
                  AND M.DATAMOVTO = I.DATAMOVTO
                  AND I.SEQMOVTO = M.SEQMOVTO
                  AND I.CODIGOMATINT = J.CODIGOMATINT
                  AND M.DATAMOVTO >= TO_DATE(:1, 'YYYY-MM-DD')
                  AND M.DATAMOVTO < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND R.CODIGOEMPRESA = 4 AND R.CODIGOGA IN (31, 124, 239, 240)
                  -- Filtro CODDIVISAO para Pneus
                  AND J.CODDIVISAO IN (5400,5410,5420,5430,5440,5450,5460,5480,5490)
                  AND M.CODIGOHISMOV IN (20, 48)
            ) A
            WHERE A.SETOR <> 'OUTRAS'
            GROUP BY A.SETOR, TRUNC(A.DATA)
            ORDER BY A.SETOR, DATA
            `;
      const parameters = [startDate, endDate];
      const results: EstoqueCustoRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionName} retornou ${results.length} registros.`
      );

      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawEstoqueCustoRepo.create({
          metricDate: r.DATA.toISOString().split('T')[0],
          sectorName: r.SETOR,
          criterionName: criterionName, // PNEUS
          totalValue: Number(r.TOTAL) || 0,
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_estoque_custos...`
      );
      await this.rawEstoqueCustoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      /* ... error handling ... */ return 0;
    }
  }

  // ... (Método extractIpkFromOracle como antes - renomear para extractAndLoadIpk talvez?) ...
  // ... (Futuros Métodos: KM Ociosa, Media KM/L/Combustível) ...
} // Fim da Classe
