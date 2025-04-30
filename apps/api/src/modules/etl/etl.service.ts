// apps/api/src/modules/etl/etl.service.ts (VERSÃO INICIAL COMPLETA)
import { AppDataSource, MySqlDataSource } from '@/database/data-source'; // Importa os dois DataSources
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import 'reflect-metadata'; // Importante para TypeORM em alguns contextos
// Importar outras entidades ou tipos necessários depois

// Interface para o resultado da query MySQL (opcional, mas ajuda na clareza)
interface QuebraDefeitoRaw {
  SETOR: string; // Nome do Setor vindo do join
  OCORRENCIA: string; // 'QUEBRA' ou 'DEFEITO' (presumido)
  TOTAL: string | number; // COUNT() pode vir como string do driver mysql2
  DIA: string | Date; // Data formatada ou objeto Date
}
export class EtlService {
  // Instancia repositório do Postgres onde vamos CARREGAR os dados depois
  private performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);

  constructor() {
    // O constructor pode inicializar conexões se necessário, mas faremos no método por enquanto
    console.log('EtlService instanciado.');
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
      `[ETL Service] Iniciando extração de Quebra/Defeito do MySQL para ${startDate} a ${endDate}`
    );

    // Garante que a conexão MySQL esteja inicializada
    if (!MySqlDataSource.isInitialized) {
      try {
        console.log('[ETL Service] Inicializando MySqlDataSource...');
        await MySqlDataSource.initialize();
        console.log('[ETL Service] MySqlDataSource inicializado.');
      } catch (error) {
        console.error(
          '[ETL Service] ERRO ao inicializar MySqlDataSource:',
          error
        );
        return []; // Retorna vazio se não conectar
      }
    } else {
      console.log('[ETL Service] MySqlDataSource já estava inicializado.');
    }

    try {
      // Query baseada na Consulta 2 do Power BI, adaptada e parametrizada
      const query = `
                SELECT
                    S.SETOR,
                    A.OCORRENCIA,
                    COUNT(A.OCORRENCIA) AS TOTAL,
                    DATE(A.DATA) as DIA /* Agrupa por dia */
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

      console.log('[ETL Service] Executando query no MySQL...');
      // Usar query com parâmetros para segurança
      const results: QuebraDefeitoRaw[] = await MySqlDataSource.query(
        query,
        parameters
      );
      console.log(
        `[ETL Service] Query MySQL retornou ${results.length} registros.`
      );

      // Aqui podemos fazer uma transformação inicial se necessário, ou retornar bruto
      // Ex: Converter TOTAL para número
      // const transformedResults = results.map(r => ({...r, TOTAL: Number(r.TOTAL) }));
      // return transformedResults;

      return results;
    } catch (error) {
      console.error('[ETL Service] ERRO ao executar query no MySQL:', error);
      return []; // Retorna vazio em caso de erro na query
    }
    // Não fechamos a conexão aqui, pois o serviço pode ser usado mais vezes.
    // A gestão da conexão (abrir/fechar) pode ser feita fora ou no fim do processo ETL completo.
  }

  // --- Futuros Métodos ---
  // async extractAbsenceFromOracle(startDate: string, endDate: string) { ... }
  // async extractCollisionFromOracle(startDate: string, endDate: string) { ... }
  // ... etc ...
  // async loadDataToPostgres(data: PerformanceDataInput[]) { ... }
  // async runFullEtlForPeriod(period: string) { ... }
} // Fim da Classe
