// apps/api/src/modules/etl/oracle-etl.service.ts (VERSÃO REALMENTE INTEGRAL FINALÍSSIMA - SEM NADA COMENTADO)
import { AppDataSource, OracleDataSource } from '@/database/data-source';
import { RawOracleAusenciaEntity } from '@/entity/raw-data/raw-oracle-ausencia.entity';
import { RawOracleColisaoEntity } from '@/entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '@/entity/raw-data/raw-oracle-estoque-custo.entity';
import { RawOracleFleetPerformanceEntity } from '@/entity/raw-data/raw-oracle-fleet-performance.entity';
import { RawOracleIpkCalculadoEntity } from '@/entity/raw-data/raw-oracle-ipk-calculado.entity';
import { RawOracleKmOciosaComponentsEntity } from '@/entity/raw-data/raw-oracle-km-ociosa.entity';

import 'reflect-metadata';
import { DataSource, DeepPartial, Repository, FindOptionsWhere, In } from 'typeorm';

interface CombinedKmOciosaDataNew {
  CODIGOGA: string;
  DATA_MES_ANO: Date;
  kmOper?: number; // Nova fonte (escalas)
  kmHod?: number; // Hodômetro bruto (sem abatimentos)
}
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
      H.DTHIST >= TO_DATE(:1, 'YYYY-MM-DD') AND
      H.DTHIST < TO_DATE(:2, 'YYYY-MM-DD') + 1 AND
      F.DESCFUNCAO NOT LIKE '%JOVEM%' AND
      (F.CODAREA IN (1131, 1132, 1148) OR F.CODAREA BETWEEN 1141 AND 1144)) A
WHERE A.SETOR IS NOT NULL
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
      H.DTHIST >= TO_DATE(:1, 'YYYY-MM-DD') AND
      H.DTHIST < TO_DATE(:2, 'YYYY-MM-DD') + 1 AND
      F.DESCFUNCAO NOT LIKE '%JOVEM%' AND
      (F.CODAREA IN (1131, 1132, 1148) OR F.CODAREA BETWEEN 1141 AND 1144)) A
WHERE A.SETOR IS NOT NULL
GROUP BY A.SETOR,
         A.OCORRENCIA,
         A.DATA

ORDER BY SETOR, OCORRENCIA
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

  private getYesterday(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    const result = date.toISOString().split('T')[0];

    if (!result) {
      throw new Error(`Erro ao calcular data anterior para: ${dateStr}`);
    }

    return result;
  }

  // Função extractAndLoadKmOciosa atualizada para nova regra de negócio
  // Quebra a consulta única em 2 queries: KM Operacional + KM Hodômetro

  async extractAndLoadKmOciosa(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const functionName = 'KM Ociosa (Nova Regra - 2 Queries)';

    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${functionName} para ${startDate} a ${endDate}`
    );
    console.log(
      `[Oracle ETL] 📅 Nova regra: KM Operacional (escalas) + KM Hodômetro (bruto)`
    );

    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();

    try {
      // Preparar parâmetros para as queries
      // Para escalas: usar endDate - 1 (mesmo período do Oracle direto)
      const prevDay = new Date(endDate);
      prevDay.setDate(prevDay.getDate() - 1);
      const endDateMinus1 = prevDay.toISOString().split('T')[0];
      const normalParameters = [startDate, endDateMinus1];

      // Para query hodômetro: endDate já vem como "ontem", usar ele + 03:59
      // DIA_OPERACIONAL usa endDate - 1 (mesmo que escalas)
      const endDatePlus03h59 = `${endDate} 03:59`;
      const hodometroParameters = [
        startDate,
        endDatePlus03h59,
        startDate,
        endDateMinus1,
      ];

      // ----- QUERY 1: KM OPERACIONAL (Nova Fonte - Escalas + Linhas) -----
      const queryKmOperacional = `
      SELECT 
          L.CODIGOGA,
          TRUNC(EV.DAT_ESCALA, 'MM') AS DATA_MES_ANO,
          SUM(
              CASE WHEN EV.FLG_SENTIDO IN ('I', 'C') THEN 
                   (EV.QTD_VIAGENS * NVL(KV.QTD_KMPROD_IDA, 0))
                   ELSE (EV.QTD_VIAGENS * NVL(KV.QTD_KMPROD_VOLTA, 0))
              END
          ) AS VALOR
      FROM (
          SELECT 
              CASE WHEN H.CODINTLINHA IS NOT NULL THEN H.CODINTLINHA
                   ELSE D.COD_INTLINHA 
              END AS CODINTLINHA,
              H.FLG_SENTIDO,
              H.DAT_ESCALA,
              COUNT(*) AS QTD_VIAGENS
          FROM T_ESC_ESCALADIARIA D
          JOIN T_ESC_HORARIODIARIA H ON D.COD_INTESCALA = H.COD_INTESCALA 
                                     AND D.DAT_ESCALA = H.DAT_ESCALA
          JOIN T_ESC_SERVICODIARIA S ON D.COD_INTESCALA = S.COD_INTESCALA 
                                     AND D.DAT_ESCALA = S.DAT_ESCALA
                                     AND H.COD_INTSERVDIARIA = S.COD_SERVDIARIA
          JOIN T_ESC_ESCALAPADRAO P ON D.COD_INTESCALA = P.COD_INTESCALA
          WHERE H.COD_ATIVIDADE = 2
            AND P.FLG_ATIVA = 'S'
            AND H.DAT_ESCALA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') 
                                 AND TO_DATE(:2, 'YYYY-MM-DD')
          GROUP BY 
              CASE WHEN H.CODINTLINHA IS NOT NULL THEN H.CODINTLINHA
                   ELSE D.COD_INTLINHA 
              END,
              H.FLG_SENTIDO,
              H.DAT_ESCALA
      ) EV
      JOIN BGM_CADLINHAS L ON EV.CODINTLINHA = L.CODINTLINHA
      LEFT JOIN (
          SELECT 
              V.CODINTLINHA,
              V.QTD_KMPROD_IDA,
              V.QTD_KMPROD_VOLTA
          FROM (
              SELECT 
                  K.CODINTLINHA,
                  K.QTD_KMPROD_IDA,
                  K.QTD_KMPROD_VOLTA,
                  ROW_NUMBER() OVER (
                      PARTITION BY K.CODINTLINHA 
                      ORDER BY K.DAT_VIGENCIA DESC
                  ) as rn
              FROM T_TRF_LINHA_KM_VIGENCIA K
          ) V
          JOIN T_TRF_PARAMETROS_LINHA P ON V.CODINTLINHA = P.CODINTLINHA
          WHERE V.rn = 1
            AND P.FLG_LINHA_DISPONIVEL = 'S'
      ) KV ON EV.CODINTLINHA = KV.CODINTLINHA
      WHERE L.CODIGOEMPRESA = 4
        AND L.CODIGOGA IN (31, 124, 239, 240)
      GROUP BY L.CODIGOGA, TRUNC(EV.DAT_ESCALA, 'MM')
      ORDER BY L.CODIGOGA, TRUNC(EV.DAT_ESCALA, 'MM')`;

      console.log(`[Oracle ETL] Executando query KM_OPERACIONAL (escalas)...`);
      const kmOperResults: KmComponentRaw[] = await oracleDataSource.query(
        queryKmOperacional,
        normalParameters
      );
      console.log(
        `[Oracle ETL] Query KM_OPERACIONAL retornou ${kmOperResults.length} registros.`
      );

      // ----- QUERY 2: KM HODÔMETRO (Bruto - Sem Abatimentos) -----
      const queryKmHodometro = `
      SELECT 
          A.CODIGOGA,
          TRUNC(A.DIA_OPERACIONAL, 'MM') AS DATA_MES_ANO,
          SUM(A.KMPERCORRIDOVELOC) AS VALOR
      FROM (
          SELECT 
              C.KMPERCORRIDOVELOC,
              V.CODIGOGA,
              C.DATAVELOC,
              C.HORAVELOC,
              CASE 
                  WHEN TO_DATE(C.HORAVELOC, 'HH24:MI') < TO_DATE('04:00', 'HH24:MI') 
                  THEN C.DATAVELOC - 1
                  ELSE C.DATAVELOC
              END AS DIA_OPERACIONAL
          FROM VWABA_CONFKMCARRO C
          JOIN FRT_CADVEICULOS V ON V.CODIGOVEIC = C.CODIGOVEIC
          JOIN FRT_TIPODEFROTA F ON V.CODIGOTPFROTA = F.CODIGOTPFROTA
          WHERE C.DATAVELOC BETWEEN TO_DATE(:1, 'YYYY-MM-DD') 
                                AND TO_DATE(:2, 'YYYY-MM-DD HH24:MI')
            AND V.CODIGOEMPRESA = 4
            AND V.CODIGOTPFROTA = F.CODIGOTPFROTA
            AND V.CODIGOGA IN (31, 124, 239, 240)
            AND V.CONDICAOVEIC = 'A'
      ) A
      WHERE A.DIA_OPERACIONAL BETWEEN TO_DATE(:3, 'YYYY-MM-DD') 
                                  AND TO_DATE(:4, 'YYYY-MM-DD')
      GROUP BY A.CODIGOGA, TRUNC(A.DIA_OPERACIONAL, 'MM')
      ORDER BY A.CODIGOGA, TRUNC(A.DIA_OPERACIONAL, 'MM')`;

      console.log(
        `[Oracle ETL] Executando query KM_HODÔMETRO (até ${endDatePlus03h59})...`
      );
      console.log(`[Oracle ETL] Parâmetros hodômetro:`, hodometroParameters);
      const kmHodResults: KmComponentRaw[] = await oracleDataSource.query(
        queryKmHodometro,
        hodometroParameters
      );
      console.log(
        `[Oracle ETL] Query KM_HODÔMETRO retornou ${kmHodResults.length} registros.`
      );

      // ----- COMBINAR RESULTADOS NO MAP -----
      const kmDataMap = new Map<string, Partial<CombinedKmOciosaDataNew>>();

      // Processar resultados KM Operacional
      kmOperResults.forEach((r) => {
        const metricMonthISO = r.DATA_MES_ANO.toISOString().substring(0, 7);
        const key = `${r.CODIGOGA}-${metricMonthISO}`;
        const existing = kmDataMap.get(key) || {
          CODIGOGA: String(r.CODIGOGA),
          DATA_MES_ANO: r.DATA_MES_ANO,
        };
        existing.kmOper = Number(r.VALOR) || 0;
        kmDataMap.set(key, existing);
      });

      // Processar resultados KM Hodômetro
      kmHodResults.forEach((r) => {
        const metricMonthISO = r.DATA_MES_ANO.toISOString().substring(0, 7);
        const key = `${r.CODIGOGA}-${metricMonthISO}`;
        const existing = kmDataMap.get(key) || {
          CODIGOGA: String(r.CODIGOGA),
          DATA_MES_ANO: r.DATA_MES_ANO,
        };
        existing.kmHod = Number(r.VALOR) || 0;
        kmDataMap.set(key, existing);
      });

      console.log(`[Oracle ETL] 🔍 DEBUG: Primeiras 3 entradas do Map:`);
      Array.from(kmDataMap.entries())
        .slice(0, 3)
        .forEach(([key, value]) => {
          console.log(
            `  ${key}: KM_OPER=${value.kmOper}, KM_HOD=${value.kmHod}`
          );
        });

      // ----- CRIAR ENTIDADES PARA SALVAR -----
      const entitiesToSave: DeepPartial<RawOracleKmOciosaComponentsEntity>[] =
        [];

      for (const item of kmDataMap.values()) {
        if (item.CODIGOGA && item.DATA_MES_ANO) {
          // Mapeamento CODIGOGA → Nome do Setor
          let sectorName = 'OUTRAS';
          if (item.CODIGOGA == '31') sectorName = 'PARANOÁ';
          else if (item.CODIGOGA == '124') sectorName = 'SANTA MARIA';
          else if (item.CODIGOGA == '239') sectorName = 'SÃO SEBASTIÃO';
          else if (item.CODIGOGA == '240') sectorName = 'GAMA';

          // Garante que o nome do setor está em maiúsculas e sem espaços extras
          sectorName = sectorName.toUpperCase().trim();

          const metricMonth = item.DATA_MES_ANO.toISOString().substring(0, 7);

          if (sectorName === 'OUTRAS') {
            console.warn(
              `[Oracle ETL] CODIGOGA ${item.CODIGOGA} não mapeado para KM Ociosa.`
            );
            continue;
          }

          // Nova regra: KM Hodômetro é BRUTO (sem abatimentos)
          const kmHodometroBruto = item.kmHod || 0;
          const kmOperacionalNovo = item.kmOper || 0;

          entitiesToSave.push(
            this.rawKmOciosaComponentsRepo.create({
              metricMonth: metricMonth,
              sectorName: sectorName,
              kmOperacional: kmOperacionalNovo,
              kmHodometroAjustado: Number(kmHodometroBruto.toFixed(2)) || 0, // Agora é bruto
            })
          );
        } else {
          console.warn(`[Oracle ETL] Item no kmDataMap incompleto:`, item);
        }
      }

      // ----- SALVAR NO POSTGRES -----
      if (entitiesToSave.length === 0) {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${functionName} para salvar.`
        );
        return 0;
      }

      // ----- SALVAR NO POSTGRES DENTRO DE UMA TRANSAÇÃO -----
      if (entitiesToSave.length > 0) {
        await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
          console.log(`[Oracle ETL] Iniciando transação para salvar ${entitiesToSave.length} registros em raw_oracle_km_ociosa_components...`);

          const uniqueMonthSectorKeys = new Set<string>();
          entitiesToSave.forEach(entity => {
              if (entity.metricMonth && entity.sectorName) {
                  uniqueMonthSectorKeys.add(`${entity.metricMonth}-${entity.sectorName}`);
              }
          });

          // Deletar registros existentes dentro da transação
          const uniqueMetricMonths = Array.from(new Set(entitiesToSave.map(entity => entity.metricMonth)));

          if (uniqueMetricMonths.length > 0) {
              console.log(`[Oracle ETL] Deletando todos os registros existentes para os meses: ${uniqueMetricMonths.join(', ')}...`);
              const deleteResult = await transactionalEntityManager.delete(RawOracleKmOciosaComponentsEntity, {
                  metricMonth: In(uniqueMetricMonths)
              });
              console.log(`[Oracle ETL] Registros existentes deletados: ${deleteResult.affected || 0} linhas afetadas.`);
          } else {
              console.log(`[Oracle ETL] Nenhum mês para deletar.`);
          }
          console.log(`[Oracle ETL] Registros existentes deletados dentro da transação.`);

          // Salvar novos registros dentro da transação
          await transactionalEntityManager.save(RawOracleKmOciosaComponentsEntity, entitiesToSave, { chunk: 100 });
          console.log(`[Oracle ETL] Novos registros salvos dentro da transação.`);
        });
        console.log(`[Oracle ETL] Transação concluída. Registros de ${functionName} salvos no Postgres.`);
      } else {
        console.log(
          `[Oracle ETL] Nenhum registro válido de ${functionName} para salvar.`
        );
        return 0;
      }

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
