// apps/api/src/modules/etl/mysql-etl.service.ts (VERSÃO ATUALIZADA E COMPLETA)
import { MySqlDataSource } from '@/database/data-source';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Interface para o resultado da query de Quebra/Defeito
interface QuebraDefeitoRaw {
  SETOR: string;
  OCORRENCIA: string;
  TOTAL: number;
  DIA: Date;
}

// Interface para o resultado da query da tabela ocorrenciashorarias (PI_OH)
interface OcorrenciaHorariaRaw {
  SETOR: string;
  OCORRENCIA: 'ATRASO' | 'FURO POR ATRASO' | 'FURO DE VIAGEM'; // Nomes dos nossos critérios
  DATA: Date; // TRUNC(A.DATA) ou DATE(A.DATA)
  TOTAL: number; // COUNT(A.CODOCORRENCIA)
}

export class MySqlEtlService {
  constructor() {
    console.log('[MySqlEtlService] Instanciado.');
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

  async extractQuebraDefeitoFromMySQL(
    startDate: string,
    endDate: string
  ): Promise<QuebraDefeitoRaw[]> {
    console.log(
      `[MySQL ETL] Iniciando extração de Quebra/Defeito para ${startDate} a ${endDate}`
    );
    const dataSource = await this.ensureMySqlConnection();
    try {
      const query = `
                SELECT S.SETOR, A.OCORRENCIA, COUNT(A.OCORRENCIA) AS TOTAL, DATE(A.DATA) as DIA
                FROM negocioperfeito.quebrasedefeitos A
                INNER JOIN negocioperfeito.setores AS S ON S.CODSETOR = A.SETORLINHA
                WHERE A.EXCLUIR = 'NÃO' AND A.CODOCORRENCIA IN (1, 2) /* 1=Quebra, 2=Defeito */
                  AND A.DATA BETWEEN ? AND ?
                GROUP BY S.SETOR, A.OCORRENCIA, DATE(A.DATA)
                ORDER BY S.SETOR, DIA, A.OCORRENCIA;
            `;
      const parameters = [startDate, endDate];
      const results: any[] = await dataSource.query(query, parameters);
      console.log(
        `[MySQL ETL] Query Quebra/Defeito retornou ${results.length} registros.`
      );
      return results.map((r) => ({
        SETOR: r.SETOR,
        OCORRENCIA: r.OCORRENCIA,
        TOTAL: Number(r.TOTAL) || 0,
        DIA: r.DIA,
      }));
    } catch (error) {
      console.error(
        '[MySQL ETL] ERRO ao executar query de Quebra/Defeito:',
        error
      );
      return [];
    }
  }

  // --- MÉTODOS NOVOS BASEADOS NA QUERY PI_OH (Consulta 12) ---

  private async extractFromOcorrenciasHorarias(
    startDate: string,
    endDate: string,
    codOcorrencia: number, // 2 para ATRASO, 3 para FURO POR ATRASO, 4 para FURO DE VIAGEM
    criterionName: 'ATRASO' | 'FURO POR ATRASO' | 'FURO DE VIAGEM'
  ): Promise<OcorrenciaHorariaRaw[]> {
    console.log(
      `[MySQL ETL] Iniciando extração de ${criterionName} (cod ${codOcorrencia}) para ${startDate} a ${endDate}`
    );
    const dataSource = await this.ensureMySqlConnection();
    try {
      // Query base da PI_OH, adaptada para filtrar por um CODOCORRENCIA específico
      // e assumindo que DATE(A.DATA) é o correto para MySQL em vez de TRUNC
      const query = `
                SELECT
                    S.SETOR,
                    ? AS OCORRENCIA_CRITERIO, -- Usaremos o nome do nosso critério aqui
                    DATE(A.DATA) as DATA,    -- Agrupando por dia
                    COUNT(A.CODOCORRENCIA) AS TOTAL
                FROM negocioperfeito.ocorrenciashorarias AS A
                INNER JOIN negocioperfeito.setores S ON S.CODSETOR = A.SETORLINHA
                WHERE
                    A.CODOCORRENCIA = ?       -- Filtro pelo código específico do critério
                    AND A.CODMOTIVO NOT IN (1, 5, 6, 33, 37, 42, 43, 73, 79, 35, 81) -- Filtros da PI_OH
                    AND A.DATA BETWEEN ? AND ?  -- Período
                    AND (
                            (A.TEMPO > '00:03:00') OR
                            (A.CODOCORRENCIA = 4 AND A.CODMOTIVO NOT IN (40)) -- Condição específica da PI_OH
                        )
                GROUP BY S.SETOR, DATE(A.DATA) -- Agrupa por SETOR e DIA
                ORDER BY S.SETOR, DATA;
            `;
      // Parâmetros: Nome do Critério, CODOCORRENCIA, startDate, endDate
      const parameters = [criterionName, codOcorrencia, startDate, endDate];

      console.log(
        `[MySQL ETL] Executando query para ${criterionName} (cod ${codOcorrencia}) no MySQL... Query: ${query.substring(0, 200)}... Params:`,
        parameters
      );
      const results: any[] = await dataSource.query(query, parameters);
      console.log(
        `[MySQL ETL] Query ${criterionName} (cod ${codOcorrencia}) retornou ${results.length} registros.`
      );

      return results.map((r) => ({
        SETOR: r.SETOR,
        OCORRENCIA: r.OCORRENCIA_CRITERIO as
          | 'ATRASO'
          | 'FURO POR ATRASO'
          | 'FURO DE VIAGEM', // Pega o nome do critério que passamos
        DATA: r.DATA, // Espera-se que seja Date
        TOTAL: Number(r.TOTAL) || 0,
      }));
    } catch (error) {
      console.error(
        `[MySQL ETL] ERRO ao executar query de ${criterionName} (cod ${codOcorrencia}):`,
        error
      );
      return [];
    }
  }

  async extractAtrasoFromMySql(
    startDate: string,
    endDate: string
  ): Promise<OcorrenciaHorariaRaw[]> {
    return this.extractFromOcorrenciasHorarias(startDate, endDate, 2, 'ATRASO');
  }

  async extractFuroPorAtrasoFromMySql(
    startDate: string,
    endDate: string
  ): Promise<OcorrenciaHorariaRaw[]> {
    return this.extractFromOcorrenciasHorarias(
      startDate,
      endDate,
      3,
      'FURO POR ATRASO'
    );
  }

  async extractFuroDeViagemFromMySql(
    startDate: string,
    endDate: string
  ): Promise<OcorrenciaHorariaRaw[]> {
    return this.extractFromOcorrenciasHorarias(
      startDate,
      endDate,
      4,
      'FURO DE VIAGEM'
    );
  }

  // --- Futuro Método para Falta Frota ---
  // async extractFaltaFrotaFromMySql(startDate: string, endDate: string): Promise<any[]> { /* ... */ }
} // Fim da Classe
