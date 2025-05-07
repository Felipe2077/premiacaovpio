// apps/api/src/modules/etl/mysql-etl.service.ts (VERSÃO INICIAL COMPLETA)
import { MySqlDataSource } from '@/database/data-source'; // Importa o DataSource do MySQL
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Interface para o resultado da query de Quebra/Defeito
interface QuebraDefeitoRaw {
  SETOR: string;
  OCORRENCIA: string; // Poderia ser 'QUEBRA' | 'DEFEITO' se soubermos os CODOCORRENCIA
  TOTAL: number; // Já convertido para número
  DIA: Date; // DATE(A.DATA) deve vir como objeto Date
}

export class MySqlEtlService {
  constructor() {
    console.log('MySqlEtlService instanciado.');
  }

  private async ensureMySqlConnection(): Promise<DataSource> {
    const dataSource = MySqlDataSource;
    if (!dataSource.isInitialized) {
      console.log('[MySQL ETL] Inicializando MySqlDataSource...');
      await dataSource.initialize();
      console.log('[MySQL ETL] MySqlDataSource inicializado.');
    } else {
      // console.log('[MySQL ETL] MySqlDataSource já estava inicializado.');
    }
    return dataSource;
  }

  /**
   * Extrai dados de Quebra e Defeito do banco de dados MySQL legado para um período.
   * @param startDate Data de início (formato YYYY-MM-DD)
   * @param endDate Data de fim (formato YYYY-MM-DD)
   * @returns Promise<QuebraDefeitoRaw[]> Array com os dados brutos ou array vazio em caso de erro.
   */
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
                SELECT
                    S.SETOR,
                    A.OCORRENCIA,
                    COUNT(A.OCORRENCIA) AS TOTAL,
                    DATE(A.DATA) as DIA
                FROM negocioperfeito.quebrasedefeitos A
                INNER JOIN negocioperfeito.setores AS S ON S.CODSETOR = A.SETORLINHA
                WHERE
                    A.EXCLUIR = 'NÃO'
                    AND A.CODOCORRENCIA IN (1, 2) /* Assumindo 1=Quebra, 2=Defeito */
                    AND A.DATA BETWEEN ? AND ? /* Parâmetros de Data */
                GROUP BY S.SETOR, A.OCORRENCIA, DATE(A.DATA)
                ORDER BY S.SETOR, DIA, A.OCORRENCIA;
            `;
      const parameters = [startDate, endDate];

      console.log('[MySQL ETL] Executando query de Quebra/Defeito no MySQL...');
      const results: any[] = await dataSource.query(query, parameters);
      console.log(
        `[MySQL ETL] Query Quebra/Defeito retornou ${results.length} registros.`
      );

      return results.map((r) => ({
        SETOR: r.SETOR,
        OCORRENCIA: r.OCORRENCIA,
        TOTAL: Number(r.TOTAL) || 0, // Garante que TOTAL seja número
        DIA: r.DIA, // Espera-se que seja Date
      }));
    } catch (error) {
      console.error(
        '[MySQL ETL] ERRO ao executar query de Quebra/Defeito:',
        error
      );
      return [];
    }
  }

  // --- Futuros Métodos para Atraso, Furo por Atraso, Furo de Viagem, Falta Frota ---
  // (Baseados na query PI_OH)
  // async extractAtrasoFromMySql(startDate: string, endDate: string): Promise<any[]> { ... }
  // ... outros ...
} // Fim da Classe
