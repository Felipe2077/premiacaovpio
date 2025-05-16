// apps/api/src/modules/etl/oracle-etl.service.ts (VERSÃO REALMENTE INTEGRAL FINALÍSSIMA - SEM NADA COMENTADO)
import { AppDataSource, OracleDataSource } from '@/database/data-source';
import { RawOracleAusenciaEntity } from '@/entity/raw-data/raw-oracle-ausencia.entity';
import { RawOracleColisaoEntity } from '@/entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '@/entity/raw-data/raw-oracle-estoque-custo.entity';
import { RawOracleFleetPerformanceEntity } from '@/entity/raw-data/raw-oracle-fleet-performance.entity';
import { RawOracleIpkCalculadoEntity } from '@/entity/raw-data/raw-oracle-ipk-calculado.entity';
import { RawOracleKmOciosaComponentsEntity } from '@/entity/raw-data/raw-oracle-km-ociosa.entity';

import 'reflect-metadata';
import { DataSource, DeepPartial, Repository } from 'typeorm';

// Interfaces Raw From Query (Tipagem interna para clareza)
interface AusenciaRawFromQuery {
  SETOR: string;
  OCORRENCIA: 'FALTA FUNC' | 'ATESTADO FUNC';
  DATA: Date;
  TOTAL: number | string;
}
interface ColisaoRawFromQuery {
  SETOR: string;
  DATA: Date;
  TOTAL: number | string;
}
interface EstoqueCustoRawFromQuery {
  SETOR: string;
  DATA: Date;
  TOTAL: number | string;
}
interface KmCombustivelRawFromQuery {
  CODIGOGA: string;
  DATA_MES_ANO: Date;
  KM: number | string;
  QNTCOMB: number | string;
}

interface KmOciosaComponentsRawFromQuery {
  SETOR: string; // Nome do Setor já mapeado pelo CASE
  DATA_MES_ANO: Date; // Data mensal TRUNCada
  KM_OPER: number | string;
  KM_HOD2: number | string;
}
// Interface para os resultados das queries de componentes
interface KmHodometroAjustadoRaw {
  CODIGOGA: string;
  DATA_MES_ANO: Date;
  KM_HOD2: number | string;
}
interface KmOperacionalRaw {
  CODIGOGA: string;
  DATA_MES_ANO: Date;
  KM_OPER: number | string;
}
interface CombinedKmOciosaComponent {
  CODIGOGA: string;
  DATA_MES_ANO: Date;
  KM_HOD2?: number;
  KM_OPER?: number;
}
interface IpkCalculadoRawFromQuery {
  SETOR: string; // Nome do Setor já mapeado
  DATA: Date; // Data Mensal (TRUNC('mm'))
  TOTAL: number | string; // Valor do IPK calculado
}
interface KmComponentRaw {
  // Interface genérica para o resultado das queries
  CODIGOGA: string;
  DATA_MES_ANO: Date;
  VALOR: number; // KM_HOD, KM_ESP, KMTOTALINT, KM_OPER
}

// Interface para o item combinado no Map antes de criar a entidade
interface CombinedKmOciosaData {
  CODIGOGA: string;
  DATA_MES_ANO: Date;
  kmHod: number;
  kmEsp?: number;
  kmTotalInt?: number;
  kmOper?: number;
}

export class OracleEtlService {
  private rawAusenciaRepo: Repository<RawOracleAusenciaEntity>;
  private rawColisaoRepo: Repository<RawOracleColisaoEntity>;
  private rawEstoqueCustoRepo: Repository<RawOracleEstoqueCustoEntity>;
  private rawFleetPerfRepo: Repository<RawOracleFleetPerformanceEntity>;
  private rawKmOciosaComponentsRepo: Repository<RawOracleKmOciosaComponentsEntity>;
  private rawIpkCalculadoRepo: Repository<RawOracleIpkCalculadoEntity>;

  constructor() {
    this.rawAusenciaRepo = AppDataSource.getRepository(RawOracleAusenciaEntity);
    this.rawColisaoRepo = AppDataSource.getRepository(RawOracleColisaoEntity);
    this.rawEstoqueCustoRepo = AppDataSource.getRepository(
      RawOracleEstoqueCustoEntity
    );
    this.rawFleetPerfRepo = AppDataSource.getRepository(
      RawOracleFleetPerformanceEntity
    );
    this.rawKmOciosaComponentsRepo = AppDataSource.getRepository(
      RawOracleKmOciosaComponentsEntity
    );
    this.rawIpkCalculadoRepo = AppDataSource.getRepository(
      RawOracleIpkCalculadoEntity
    );

    console.log(
      '[OracleEtlService] Instanciado e repositórios Raw configurados.'
    );
  }

  private async ensureOracleConnection(): Promise<DataSource> {
    const dataSource = OracleDataSource;
    if (!dataSource.isInitialized) {
      console.log('[Oracle ETL] Inicializando OracleDataSource...');
      await dataSource.initialize();
      console.log('[Oracle ETL] OracleDataSource inicializado.');
    }
    return dataSource;
  }
  private async ensurePostgresConnection(): Promise<DataSource> {
    const dataSource = AppDataSource;
    if (!dataSource.isInitialized) {
      console.log('[Oracle ETL] Inicializando AppDataSource (Postgres)...');
      await dataSource.initialize();
      console.log('[Oracle ETL] AppDataSource (Postgres) inicializado.');
    }
    return dataSource;
  }

  async extractAndLoadAusencia(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const functionName = 'Ausências (Falta/Atestado)';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${functionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    const todayFinalDate = new Date().toISOString().split('T')[0];
    await this.ensurePostgresConnection();
    try {
      const query = `
          SELECT A.SETOR,
       A.OCORRENCIA,
       A.DATA,
       COUNT(DISTINCT A.CODFUNC) AS TOTAL
FROM
(SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
             WHEN F.CODAREA = 1132 THEN 'GAMA'
             WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
             WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' END AS SETOR,
       'FALTA FUNC' AS OCORRENCIA,
       F.CODFUNC,
       TRUNC(H.DTHIST, 'mm') AS DATA
FROM FLP_HISTORICO H,
     VW_FUNCIONARIOS F
WHERE H.CODINTFUNC = F.CODINTFUNC AND
      H.CODOCORR IN ('81') AND
      H.DTHIST BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') AND
      F.DESCFUNCAO NOT LIKE '%JOVEM%' AND
      (F.CODAREA IN (1131, 1132, 1148) OR F.CODAREA BETWEEN 1141 AND 1144)) A
GROUP BY A.SETOR,
         A.OCORRENCIA,
         A.DATA
         
UNION ALL

SELECT A.SETOR,
       A.OCORRENCIA,
       A.DATA,
       COUNT(DISTINCT A.CODFUNC) AS TOTAL
FROM
(SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
             WHEN F.CODAREA = 1132 THEN 'GAMA'
             WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
             WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' END AS SETOR,
       'ATESTADO FUNC' AS OCORRENCIA,
       F.CODFUNC,
       TRUNC(H.DTHIST, 'mm') AS DATA
FROM FLP_HISTORICO H,
     VW_FUNCIONARIOS F
WHERE H.CODINTFUNC = F.CODINTFUNC AND
      H.CODOCORR IN ('82', '125') AND
      H.DTHIST BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') AND
      F.DESCFUNCAO NOT LIKE '%JOVEM%' AND
      (F.CODAREA IN (1131, 1132, 1148) OR F.CODAREA BETWEEN 1141 AND 1144)) A
GROUP BY A.SETOR,
         A.OCORRENCIA,
         A.DATA

            `;
      const parameters = [startDate, todayFinalDate];
      const results: AusenciaRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${functionName} retornou ${results.length} registros.`
      );
      if (results.length === 0) return 0;

      const entitiesToSave = results
        .map((r) => {
          const metricDate =
            r.DATA instanceof Date ? r.DATA.toISOString().split('T')[0] : null;
          if (!metricDate) {
            console.warn(
              `[Oracle ETL] Data inválida recebida para Ausência: ${r.DATA}`
            );
            return null;
          }
          return this.rawAusenciaRepo.create({
            metricDate: metricDate,
            sectorName: r.SETOR,
            occurrenceType: r.OCORRENCIA,
            employeeCount: Number(r.TOTAL) || 0,
          });
        })
        .filter((entity) => entity !== null) as RawOracleAusenciaEntity[]; // Filtra nulos e garante tipo

      if (entitiesToSave.length === 0) {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${functionName} para salvar após mapeamento.`
        );
        return 0;
      }

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_ausencias...`
      );
      await this.rawAusenciaRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${functionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${functionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }

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
      const query = `
            SELECT A.SETOR, TRUNC(A.DATA) AS DATA, COUNT(A.CODOCORR) AS TOTAL
            FROM (
                SELECT CASE WHEN V.CODIGOGA = 31 THEN 'PARANOÁ' WHEN V.CODIGOGA = 124 THEN 'SANTA MARIA' WHEN V.CODIGOGA = 239 THEN 'SÃO SEBASTIÃO' WHEN V.CODIGOGA = 240 THEN 'GAMA' ELSE 'OUTRAS' END AS SETOR,
                       I.DATARAINFGER AS DATA, I.CODOCORR
                FROM ACD_INFORMACOESGERAIS I, FRT_CADVEICULOS V
                WHERE I.CODOCORR IN (70, 305) AND I.DATARAINFGER >= TO_DATE(:1, 'YYYY-MM-DD') AND I.DATARAINFGER < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND I.CODIGOVEIC = V.CODIGOVEIC AND V.CODIGOEMPRESA = 4 AND V.CODIGOGA IN (31, 124, 239, 240)
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

      const entitiesToSave = results
        .map((r) => {
          const metricDate =
            r.DATA instanceof Date ? r.DATA.toISOString().split('T')[0] : null;
          if (!metricDate) {
            console.warn(
              `[Oracle ETL] Data inválida recebida para Colisão: ${r.DATA}`
            );
            return null;
          }
          return this.rawColisaoRepo.create({
            metricDate: metricDate,
            sectorName: r.SETOR,
            totalCount: Number(r.TOTAL) || 0,
          });
        })
        .filter((entity) => entity !== null) as RawOracleColisaoEntity[];

      if (entitiesToSave.length === 0) {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${criterionName} para salvar após mapeamento.`
        );
        return 0;
      }

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_colisoes...`
      );
      await this.rawColisaoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${criterionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }

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
      const query = `
            SELECT A.SETOR, TRUNC(A.DATA) AS DATA, SUM(A.TOTAL) AS TOTAL
            FROM (
                SELECT CASE WHEN R.CODIGOGA = 31 THEN 'PARANOÁ' WHEN R.CODIGOGA = 124 THEN 'SANTA MARIA' WHEN R.CODIGOGA = 239 THEN 'SÃO SEBASTIÃO' WHEN R.CODIGOGA = 240 THEN 'GAMA' ELSE 'OUTRAS' END AS SETOR,
                       R.DATARQ AS DATA, ROUND(NVL(I.VALORTOTALITENSMOVTO,0), 2) TOTAL
                FROM EST_REQUISICAO R INNER JOIN EST_MOVTO M ON R.NUMERORQ = M.NUMERORQ
                      INNER JOIN EST_ITENSMOVTO I ON M.DATAMOVTO = I.DATAMOVTO AND I.SEQMOVTO = M.SEQMOVTO
                      INNER JOIN EST_CADMATERIAL J ON I.CODIGOMATINT = J.CODIGOMATINT
                WHERE M.DATAMOVTO >= TO_DATE(:1, 'YYYY-MM-DD') AND M.DATAMOVTO < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND R.CODIGOEMPRESA = 4 AND R.CODIGOGA IN (31, 124, 239, 240)
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

      const entitiesToSave = results
        .map((r) => {
          const metricDate =
            r.DATA instanceof Date ? r.DATA.toISOString().split('T')[0] : null;
          if (!metricDate) {
            console.warn(
              `[Oracle ETL] Data inválida recebida para Peças: ${r.DATA}`
            );
            return null;
          }
          return this.rawEstoqueCustoRepo.create({
            metricDate: metricDate,
            sectorName: r.SETOR,
            criterionName: criterionName,
            totalValue: Number(r.TOTAL) || 0,
          });
        })
        .filter((entity) => entity !== null) as RawOracleEstoqueCustoEntity[];

      if (entitiesToSave.length === 0) {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${criterionName} para salvar após mapeamento.`
        );
        return 0;
      }

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_estoque_custos...`
      );
      await this.rawEstoqueCustoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${criterionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }

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
      const query = `
            SELECT A.SETOR, TRUNC(A.DATA) AS DATA, SUM(A.TOTAL) AS TOTAL
            FROM (
                SELECT CASE WHEN R.CODIGOGA = 31 THEN 'PARANOÁ' WHEN R.CODIGOGA = 124 THEN 'SANTA MARIA' WHEN R.CODIGOGA = 239 THEN 'SÃO SEBASTIÃO' WHEN R.CODIGOGA = 240 THEN 'GAMA' ELSE 'OUTRAS' END AS SETOR,
                       R.DATARQ AS DATA, ROUND(NVL(I.VALORTOTALITENSMOVTO,0), 2) TOTAL
                FROM EST_REQUISICAO R INNER JOIN EST_MOVTO M ON R.NUMERORQ = M.NUMERORQ
                      INNER JOIN EST_ITENSMOVTO I ON M.DATAMOVTO = I.DATAMOVTO AND I.SEQMOVTO = M.SEQMOVTO
                      INNER JOIN EST_CADMATERIAL J ON I.CODIGOMATINT = J.CODIGOMATINT
                WHERE M.DATAMOVTO >= TO_DATE(:1, 'YYYY-MM-DD') AND M.DATAMOVTO < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND R.CODIGOEMPRESA = 4 AND R.CODIGOGA IN (31, 124, 239, 240)
                  AND J.CODDIVISAO IN (5400,5410,5420,5430,5440,5450,5460,5480,5490) -- Filtro Pneus
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

      const entitiesToSave = results
        .map((r) => {
          const metricDate =
            r.DATA instanceof Date ? r.DATA.toISOString().split('T')[0] : null;
          if (!metricDate) {
            console.warn(
              `[Oracle ETL] Data inválida recebida para Pneus: ${r.DATA}`
            );
            return null;
          }
          return this.rawEstoqueCustoRepo.create({
            metricDate: metricDate,
            sectorName: r.SETOR,
            criterionName: criterionName,
            totalValue: Number(r.TOTAL) || 0,
          });
        })
        .filter((entity) => entity !== null) as RawOracleEstoqueCustoEntity[];

      if (entitiesToSave.length === 0) {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${criterionName} para salvar após mapeamento.`
        );
        return 0;
      }

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_estoque_custos...`
      );
      await this.rawEstoqueCustoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${criterionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }

  // Método auxiliar que executa a query base comum para KM/L e Combustível.
  private async extractKmCombustivelBase(
    startDate: string,
    endDate: string
  ): Promise<
    { CODIGOGA: string; DATA_MES_ANO: Date; KM: number; QNTCOMB: number }[]
  > {
    const functionName = 'KM/Combustível Base';
    console.log(
      `[Oracle ETL] Iniciando extração ${functionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    try {
      // Query REESTRUTURADA: Junta as subqueries K (KM) e C (Combustível) diretamente
      const query = `
       SELECT 
    B.CODIGOGA,
    B.DATA_MES_ANO,
    B.KM,
    B.QNTCOMB
FROM (
    SELECT 
        T.CODIGOGA,
        TRUNC(K.DATAVELOC, 'MM') AS DATA_MES_ANO,
        SUM(C.QTDECOMB) AS QNTCOMB,
        SUM(K.KMPERCORRIDOVELOC) AS KM
    FROM 
        VWABA_CONFKMCARRO K
        JOIN FRT_CADVEICULOS V ON V.CODIGOVEIC = K.CODIGOVEIC
        JOIN VWABA_CONSCOMBREPVEIC C ON C.CODIGOVEIC = K.CODIGOVEIC 
            AND K.DATAVELOC = C.DATAABASTCARRO 
            AND C.SEQUENCIAABASTCARRO = K.SEQUENCIAVELOC
        JOIN VWABA_CONFABASTCARRO A ON A.CODIGOVEIC = C.CODIGOVEIC 
            AND A.DATAABASTCARRO = C.DATAABASTCARRO 
            AND A.SEQUENCIAABASTCARRO = C.SEQUENCIAABASTCARRO
        JOIN ABA_CADTANQUE T ON A.TQUCOMB = T.CODIGOTANQUE
    WHERE 
        C.DATAABASTCARRO BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999
        AND V.CODIGOEMPRESA = 4
        AND V.CODIGOGA BETWEEN 31 AND 240
    GROUP BY 
        T.CODIGOGA,
        TRUNC(K.DATAVELOC, 'MM')
) B
ORDER BY 
    B.CODIGOGA, B.DATA_MES_ANO
        `;
      // Usa PARÂMETROS POSICIONAIS :1, :2
      const parameters = [startDate, endDate];
      console.log(`[Oracle ETL] Executando query ${functionName} no Oracle...`);
      const results: any[] = await oracleDataSource.query(query, parameters);
      console.log(
        `[Oracle ETL] Query ${functionName} retornou ${results.length} registros.`
      );
      // Converte e garante tipos aqui
      return results.map((r) => ({
        CODIGOGA: String(r.CODIGOGA),
        DATA_MES_ANO: r.DATA_MES_ANO, // Assume que vem como Date
        KM: Number(r.KM) || 0,
        QNTCOMB: Number(r.QNTCOMB) || 0,
      }));
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao executar query ${functionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return [];
    }
  }

  // O método extractAndLoadFleetPerformance usa o retorno tipado acima (sem mudanças nele)
  async extractAndLoadFleetPerformance(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const functionName = 'Desempenho Frota (KM/L + Litros)';
    const results = await this.extractKmCombustivelBase(startDate, endDate);
    if (results.length === 0) return 0;
    await this.ensurePostgresConnection();
    try {
      const entitiesToSave = results
        .map((r) => {
          const totalKm = r.KM;
          const totalFuelLiters = r.QNTCOMB;
          const avgKmL =
            totalFuelLiters > 0
              ? Number((totalKm / totalFuelLiters).toFixed(4))
              : 0;
          let sectorName = 'OUTRAS';
          if (r.CODIGOGA == '31') sectorName = 'PARANOÁ';
          else if (r.CODIGOGA == '124') sectorName = 'SANTA MARIA';
          else if (r.CODIGOGA == '239') sectorName = 'SÃO SEBASTIÃO';
          else if (r.CODIGOGA == '240') sectorName = 'GAMA';
          const metricMonth =
            r.DATA_MES_ANO instanceof Date
              ? r.DATA_MES_ANO.toISOString().substring(0, 7)
              : null;
          if (!metricMonth) {
            console.warn(
              `[Oracle ETL] Data inválida recebida para Fleet Performance: ${r.DATA_MES_ANO}`
            );
            return null;
          }

          return this.rawFleetPerfRepo.create({
            metricMonth,
            sectorName,
            totalKm,
            totalFuelLiters,
            avgKmL,
          });
        })
        .filter(Boolean); // Simplificação do filter

      // Garantir tipo para o save
      const validEntities =
        entitiesToSave as DeepPartial<RawOracleFleetPerformanceEntity>[];

      if (validEntities.length === 0) {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${functionName} para salvar.`
        );
        return 0;
      }
      console.log(
        `[Oracle ETL] Salvando ${validEntities.length} registros em raw_oracle_fleet_performance...`
      );
      await this.rawFleetPerfRepo.save(validEntities, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${functionName} salvos no Postgres.`
      );
      return validEntities.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao salvar dados de ${functionName}:`,
        error
      );
      return 0;
    }
  }

  async extractAndLoadKmOciosa(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const functionName = 'KM Ociosa (Componentes - Suas Queries Separadas)';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${functionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();

    try {
      const parameters = [startDate, endDate]; // :1 = startDate, :2 = endDate

      // ----- SUA "CONSULTA DO HODOMETRO (KM_HOD)" (Adaptada para Data Mensal) -----
      const queryKmHod = `
            SELECT
                V.CODIGOGA,
                TRUNC(C.DATAVELOC, 'mm') AS DATA_MES_ANO,
                SUM(C.KMPERCORRIDOVELOC) AS VALOR
            FROM VWABA_CONFKMCARRO C
                JOIN FRT_CADVEICULOS V ON V.CODIGOVEIC = C.CODIGOVEIC
                JOIN FRT_TIPODEFROTA F ON V.CODIGOTPFROTA = F.CODIGOTPFROTA
            WHERE C.DATAVELOC >= TO_DATE(:1, 'YYYY-MM-DD')
                AND C.DATAVELOC < TO_DATE(:2, 'YYYY-MM-DD') + 1
                AND TO_TIMESTAMP(TO_CHAR(C.DATAVELOC, 'DD-MON-YYYY') || ' ' || C.HORAVELOC, 'DD-MON-YYYY HH24:MI') >= TO_TIMESTAMP(TO_CHAR(TO_DATE(:1, 'YYYY-MM-DD'), 'DD-MON-YYYY') || ' 04:00', 'DD-MON-YYYY HH24:MI')
                AND V.CODIGOEMPRESA = 4 AND V.CONDICAOVEIC = 'A' AND V.CODIGOGA IN (31, 124, 239, 240)
            GROUP BY V.CODIGOGA, TRUNC(C.DATAVELOC, 'mm')
            ORDER BY V.CODIGOGA, TRUNC(C.DATAVELOC, 'mm')`;
      console.log(`[Oracle ETL] Executando query KM_HOD...`);
      const kmHodResults: KmComponentRaw[] = await oracleDataSource.query(
        queryKmHod,
        parameters
      );
      console.log(
        `[Oracle ETL] Query KM_HOD retornou ${kmHodResults.length} registros.`
      );

      // ----- SUA "CONSULTA KM_ESP" (Adaptada para Data Mensal) -----
      const queryKmEsp = `
            SELECT
                V.CODIGOGA,
                TRUNC(M.DTSAIDA, 'mm') AS DATA_MES_ANO,
                SUM(M.ODOMETROFIN - M.ODOMETROINIC) AS VALOR
            FROM PLT_SAIDARECOLHIDA M
                JOIN PLT_OCORRENCIAS O ON M.CODOCORRPLTSAIDA = O.CODOCORRPLT
                JOIN FRT_CADVEICULOS V ON M.CODIGOVEIC = V.CODIGOVEIC
                JOIN FRT_TIPODEFROTA F ON V.CODIGOTPFROTA = F.CODIGOTPFROTA
            WHERE M.DTSAIDA >= TO_DATE(:1, 'YYYY-MM-DD')
                AND M.DTSAIDA < TO_DATE(:2, 'YYYY-MM-DD') + 1
                AND M.CODOCORRPLTSAIDA BETWEEN 17 AND 26
                AND V.CODIGOEMPRESA = 4 AND V.CONDICAOVEIC = 'A' AND V.CODIGOGA IN (31, 124, 239, 240)
            GROUP BY V.CODIGOGA, TRUNC(M.DTSAIDA, 'mm')
            ORDER BY V.CODIGOGA, TRUNC(M.DTSAIDA, 'mm')`;
      console.log(`[Oracle ETL] Executando query KM_ESP...`);
      const kmEspResults: KmComponentRaw[] = await oracleDataSource.query(
        queryKmEsp,
        parameters
      );
      console.log(
        `[Oracle ETL] Query KM_ESP retornou ${kmEspResults.length} registros.`
      );

      // ----- SUA "CONSULTA KMTOTALINT" (Adaptada para Data Mensal - usando startDate) -----
      const queryKmTotalInt = `
            SELECT
                V.CODIGOGA,
                TRUNC(TO_DATE(:1, 'YYYY-MM-DD'), 'mm') AS DATA_MES_ANO, -- Usa startDate para o mês
                SUM( CASE WHEN V.CODIGOGA IN (31, 239) THEN 0.60 WHEN V.CODIGOTPFROTA IN (11, 9) AND V.CODIGOGA = 240 THEN 0.21 WHEN V.CODIGOTPFROTA IN (3, 12) AND V.CODIGOGA = 240 THEN 0.60 WHEN V.CODIGOTPFROTA = 9 AND V.CODIGOGA = 124 THEN 0.60 WHEN V.CODIGOTPFROTA NOT IN (9) AND V.CODIGOGA = 124 THEN 0.80 ELSE 0 END /* * COUNT(V.PREFIXOVEIC) ??? */ ) AS VALOR
                -- O COUNT(V.PREFIXOVEIC) foi removido da sua query original para KMTOTALINT, se precisar, adicione de volta
            FROM FRT_CADVEICULOS V
                JOIN FRT_TIPODEFROTA F ON V.CODIGOTPFROTA = F.CODIGOTPFROTA
            WHERE V.CODIGOEMPRESA = 4 AND LENGTH(TO_NUMBER(V.PREFIXOVEIC)) > 5 AND V.CONDICAOVEIC = 'A'
                AND V.CODIGOGA NOT IN (4) AND V.CODIGOGA IN (31, 124, 239, 240)
            GROUP BY V.CODIGOGA, TRUNC(TO_DATE(:1, 'YYYY-MM-DD'), 'mm')
            ORDER BY V.CODIGOGA`;
      console.log(`[Oracle ETL] Executando query KMTOTALINT...`);
      const kmTotalIntResults: KmComponentRaw[] = await oracleDataSource.query(
        queryKmTotalInt,
        parameters
      ); // Parâmetros ainda necessários para :1
      console.log(
        `[Oracle ETL] Query KMTOTALINT retornou ${kmTotalIntResults.length} registros.`
      );

      // ----- SUA "CONSULTA KM_OPER" (Adaptada para Data Mensal) -----
      const queryKmOper = `
            SELECT
                GA.CODIGOGA,
                TRUNC(KO_SUB.DATA_BASE_OPER, 'mm') AS DATA_MES_ANO,
                ROUND(SUM(KO_SUB.KM_OPER_DIA), 2) AS VALOR
            FROM
                ( SELECT DISTINCT CODIGOGA FROM FRT_CADVEICULOS WHERE CODIGOGA IN (31, 124, 239, 240) AND CODIGOEMPRESA = 4 ) GA
                LEFT JOIN (
                    SELECT V.CODIGOGA, TRUNC(A.DATABCO) AS DATA_BASE_OPER, SUM(NVL(GLOBUS.FC_ARR_KMBCO(A.IDBCO, 0), 0)) AS KM_OPER_DIA
                    FROM T_ARR_BCO A JOIN T_ARR_BCO_VIAGENS B ON A.IDBCO = B.IDBCO JOIN FRT_CADVEICULOS V ON B.CODIGOVEIC = V.CODIGOVEIC JOIN FRT_TIPODEFROTA F ON V.CODIGOTPFROTA = F.CODIGOTPFROTA
                    WHERE A.DATABCO >= TO_DATE(:1, 'YYYY-MM-DD') AND A.DATABCO < TO_DATE(:2, 'YYYY-MM-DD') + 1
                      AND B.IDBCOVIAGENS = 1 AND A.CODIGOEMPRESA = 4 AND V.CODIGOEMPRESA = 4
                      AND V.CODIGOGA IN (31, 124, 239, 240) AND V.CONDICAOVEIC = 'A'
                    GROUP BY V.CODIGOGA, TRUNC(A.DATABCO)
                ) KO_SUB ON GA.CODIGOGA = KO_SUB.CODIGOGA
            WHERE KO_SUB.DATA_BASE_OPER IS NOT NULL
            GROUP BY GA.CODIGOGA, TRUNC(KO_SUB.DATA_BASE_OPER, 'mm')
            ORDER BY GA.CODIGOGA, TRUNC(KO_SUB.DATA_BASE_OPER, 'mm')`;
      console.log(`[Oracle ETL] Executando query KM_OPER...`);
      const kmOperResults: KmComponentRaw[] = await oracleDataSource.query(
        queryKmOper,
        parameters
      );
      console.log(
        `[Oracle ETL] Query KM_OPER retornou ${kmOperResults.length} registros.`
      );

      // --- Juntar os Resultados ---
      const kmDataMap = new Map<string, Partial<CombinedKmOciosaData>>(); // Chave: CODIGOGA-YYYY-MM

      const processResults = (
        resultsArray: KmComponentRaw[],
        valueField: keyof CombinedKmOciosaData
      ) => {
        resultsArray.forEach((r) => {
          const metricMonthISO = r.DATA_MES_ANO.toISOString().substring(0, 7);
          const key = `${r.CODIGOGA}-${metricMonthISO}`;
          const existing = kmDataMap.get(key) || {
            CODIGOGA: String(r.CODIGOGA),
            DATA_MES_ANO: r.DATA_MES_ANO,
          };
          (existing as any)[valueField] = Number(r.VALOR) || 0;
          kmDataMap.set(key, existing);
        });
      };

      processResults(kmHodResults, 'kmHod');
      processResults(kmEspResults, 'kmEsp');
      // KMTOTALINT é por CODIGOGA, vamos aplicar a todos os meses daquele CODIGOGA
      kmTotalIntResults.forEach((ki_r) => {
        for (const key of kmDataMap.keys()) {
          if (key.startsWith(String(ki_r.CODIGOGA) + '-')) {
            const entry = kmDataMap.get(key);
            if (entry) {
              entry.kmTotalInt = Number(ki_r.VALOR) || 0;
            }
          }
        }
      });
      processResults(kmOperResults, 'kmOper');

      const entitiesToSave: DeepPartial<RawOracleKmOciosaComponentsEntity>[] =
        [];
      for (const item of kmDataMap.values()) {
        if (item.CODIGOGA && item.DATA_MES_ANO) {
          let sectorName = 'OUTRAS';
          if (item.CODIGOGA == '31') sectorName = 'PARANOÁ';
          else if (item.CODIGOGA == '124') sectorName = 'SANTA MARIA';
          else if (item.CODIGOGA == '239') sectorName = 'SÃO SEBASTIÃO';
          else if (item.CODIGOGA == '240') sectorName = 'GAMA';
          const metricMonth = item.DATA_MES_ANO.toISOString().substring(0, 7);

          if (sectorName === 'OUTRAS') {
            console.warn(
              `[Oracle ETL] CODIGOGA ${item.CODIGOGA} não mapeado para KM Ociosa.`
            );
            continue;
          }

          // Calcula KM_HOD2 aqui
          const kmHodometroAjustado =
            (item.kmHod || 0) - (item.kmEsp || 0) - (item.kmTotalInt || 0);

          entitiesToSave.push(
            this.rawKmOciosaComponentsRepo.create({
              metricMonth: metricMonth,
              sectorName: sectorName,
              kmOperacional: item.kmOper || 0,
              kmHodometroAjustado: Number(kmHodometroAjustado.toFixed(2)) || 0, // Arredonda e garante número
            })
          );
        } else {
          console.warn(`[Oracle ETL] Item no kmDataMap incompleto:`, item);
        }
      }

      if (entitiesToSave.length === 0) {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${functionName} para salvar.`
        );
        return 0;
      }
      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_km_ociosa_components...`
      );
      await this.rawKmOciosaComponentsRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${functionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${functionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }
  // MÉTODO  PARA IPK, SALVANDO VALOR CALCULADO
  async extractAndLoadIpkCalculado(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const functionName = 'IPK (Valor Calculado)';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${functionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();

    try {
      const query = `
            SELECT 
    CASE 
        WHEN B.SETOR = 31 THEN 'PARANOÁ'
        WHEN B.SETOR = 124 THEN 'SANTA MARIA'
        WHEN B.SETOR = 239 THEN 'SÃO SEBASTIÃO'
        WHEN B.SETOR = 240 THEN 'GAMA'
        ELSE 'OUTRAS' 
    END AS SETOR_NOME,
    B.DATA,
    ROUND((B.PASSAGEIROS / B.KM), 2) AS TOTAL_IPK
FROM (
    SELECT 
        A.CIDADE AS SETOR,
        'IPK' AS OCORRENCIA,
        SUM(A.PASSAGEIROS) AS PASSAGEIROS,
        CASE 
            WHEN A.CIDADE IN (239, 31) THEN SUM(A.KM_OPERACIONAL)
            ELSE SUM(A.KM_OPERACIONAL) 
        END AS KM,
        A.DATA
    FROM (
        SELECT 
            P.CIDADE,
            CASE 
                WHEN P.CIDADE = 124 AND P.DATA = PV.DATA THEN (P.PASSAGEIROS - PV.PASSAGEIROS)
                WHEN P.CIDADE = 240 AND P.DATA = PV.DATA THEN (P.PASSAGEIROS + PV.PASSAGEIROS)
                ELSE P.PASSAGEIROS 
            END AS PASSAGEIROS,
            K.KM_OPERACIONAL,
            TRUNC(P.DATA, 'mm') AS DATA
        FROM (
            SELECT 
                L.CODIGOGA AS CIDADE,
                SUM(D.QTD_PASSAG_TRANS) AS PASSAGEIROS,
                G.DAT_VIAGEM_GUIA AS DATA
            FROM T_ARR_GUIA G,
                 T_ARR_DETALHE_GUIA D,
                 T_ARR_VIAGENS_GUIA V,
                 BGM_CADLINHAS L
            WHERE D.COD_SEQ_GUIA = V.COD_SEQ_GUIA
              AND D.COD_SEQ_VIAGEM = V.COD_SEQ_VIAGEM
              AND G.COD_SEQ_GUIA = D.COD_SEQ_GUIA
              AND G.DAT_VIAGEM_GUIA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD')
              AND V.COD_INTLINHA = L.CODINTLINHA
              AND L.CODIGOGA IN (31, 124, 239, 240)
              AND L.CODIGOEMPRESA = 4
              AND D.COD_TIPOPAGTARIFA NOT IN (3)
            GROUP BY L.CODIGOGA, G.DAT_VIAGEM_GUIA
        ) P,
        (
            SELECT 
                L.CODIGOGA AS CIDADE,
                SUM(NVL(GLOBUS.FC_ARR_KMBCO_VIAGENS(BC.IDBCO, 0 ,BV.IDBCOVIAGENS), 0)) AS KM_OPERACIONAL,
                BC.DATABCO AS DATA
            FROM T_ARR_BCO BC,
                 T_ARR_BCO_VIAGENS BV,
                 BGM_CADLINHAS L
            WHERE BC.IDBCO = BV.IDBCO
              AND BC.DATABCO BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD')
              AND BC.CODIGOEMPRESA = 4
              AND BV.CODINTLINHA = L.CODINTLINHA
              AND L.CODIGOGA IN (31, 124, 239, 240)
            GROUP BY L.CODIGOGA, BC.DATABCO
        ) K,
        (
            SELECT 
                L.CODIGOGA AS CIDADESAIDA,
                240 AS CIDADEENTRADA,
                SUM(D.QTD_PASSAG_TRANS) AS PASSAGEIROS,
                G.DAT_VIAGEM_GUIA AS DATA
            FROM T_ARR_GUIA G,
                 T_ARR_DETALHE_GUIA D,
                 T_ARR_VIAGENS_GUIA V,
                 BGM_CADLINHAS L,
                 FRT_CADVEICULOS VE
            WHERE D.COD_SEQ_GUIA = V.COD_SEQ_GUIA
              AND D.COD_SEQ_VIAGEM = V.COD_SEQ_VIAGEM
              AND G.COD_SEQ_GUIA = D.COD_SEQ_GUIA
              AND G.DAT_VIAGEM_GUIA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD')
              AND V.COD_INTLINHA = L.CODINTLINHA
              AND L.CODIGOGA IN (124, 240)
              AND L.CODIGOEMPRESA = 4
              AND D.COD_TIPOPAGTARIFA NOT IN (3)
              AND V.COD_VEICULO = VE.CODIGOVEIC
              AND VE.PREFIXOVEIC IN ('0002241','0002243','0002246','0002248')
            GROUP BY L.CODIGOGA, G.DAT_VIAGEM_GUIA
        ) PV
        WHERE P.CIDADE = K.CIDADE
          AND P.DATA = K.DATA
          AND P.DATA = PV.DATA
    ) A
    GROUP BY A.CIDADE, A.DATA
) B
             `;
      const parameters = [startDate, endDate];
      // Ajustar a interface se necessário para bater com os aliases SETOR_NOME, TOTAL_IPK
      const results: { SETOR_NOME: string; DATA: Date; TOTAL_IPK: number }[] =
        await oracleDataSource.query(query, parameters);
      console.log(
        `[Oracle ETL] Query Oracle ${functionName} retornou ${results.length} registros.`
      );

      if (results.length === 0) return 0;

      const entitiesToSave = results
        .map((r) => {
          const ipkValue = Number(r.TOTAL_IPK) || 0;
          const sectorName = r.SETOR_NOME;
          const metricMonth =
            r.DATA instanceof Date
              ? r.DATA.toISOString().substring(0, 7)
              : null;

          if (!metricMonth || sectorName === 'OUTRAS') {
            console.warn(
              `[Oracle ETL] Registro inválido (data ou setor) recebido para IPK:`,
              r
            );
            return null;
          }
          return this.rawIpkCalculadoRepo.create({
            metricMonth,
            sectorName,
            ipkValue,
          });
        })
        .filter(Boolean) as RawOracleIpkCalculadoEntity[];

      if (entitiesToSave.length === 0) {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${functionName} para salvar.`
        );
        return 0;
      }

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_ipk_calculado...`
      );
      await this.rawIpkCalculadoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${functionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${functionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }
} // Fim da Classe
