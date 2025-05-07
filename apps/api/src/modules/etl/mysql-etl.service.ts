// apps/api/src/modules/etl/mysql-etl.service.ts (VERSÃO COMPLETA PARA COLAR)
import { AppDataSource, MySqlDataSource } from '@/database/data-source'; // Precisa de ambos
import { RawMySqlQuebraDefeitoEntity } from '@/entity/raw-data/raw-mysql-quebra-defeito.entity'; // Entidade Raw Data
import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';

// Interface para o resultado da Query MySQL
interface QuebraDefeitoRawFromQuery {
  SETOR: string;
  OCORRENCIA: string; // 'QUEBRA' ou 'DEFEITO'
  TOTAL: number; // COUNT - já convertido para número
  DIA: Date; // DATE(A.DATA)
}

export class MySqlEtlService {
  // Repositório da tabela RAW no POSTGRES
  private rawQuebraDefeitoRepo: Repository<RawMySqlQuebraDefeitoEntity>;

  constructor() {
    // Pega o repo do AppDataSource (Postgres) onde vamos salvar
    this.rawQuebraDefeitoRepo = AppDataSource.getRepository(
      RawMySqlQuebraDefeitoEntity
    );
    console.log(
      '[MySqlEtlService] Instanciado e repositório RawQuebraDefeito configurado.'
    );
  }

  // Método para garantir que a conexão MySQL está ativa
  private async ensureMySqlConnection(): Promise<DataSource> {
    const dataSource = MySqlDataSource; // Usa a instância exportada
    if (!dataSource.isInitialized) {
      console.log('[MySQL ETL] Inicializando MySqlDataSource...');
      await dataSource.initialize();
      console.log('[MySQL ETL] MySqlDataSource inicializado.');
    } else {
      // console.log('[MySQL ETL] MySqlDataSource já estava inicializado.'); // Log opcional
    }
    return dataSource;
  }

  /**
   * Extrai dados de Quebra e Defeito do MySQL e SALVA na tabela raw correspondente no Postgres.
   * @param startDate Data de início (formato YYYY-MM-DD)
   * @param endDate Data de fim (formato YYYY-MM-DD)
   * @returns Promise<number> Número de registros processados/salvos.
   */
  async extractAndLoadQuebraDefeito(
    startDate: string,
    endDate: string
  ): Promise<number> {
    console.log(
      `[MySQL ETL] Iniciando extração/carga de Quebra/Defeito para ${startDate} a ${endDate}`
    );
    const mysqlDataSource = await this.ensureMySqlConnection(); // Garante conexão MySQL

    // Garante conexão Postgres também, pois vamos salvar lá
    if (!AppDataSource.isInitialized) {
      try {
        console.log(
          '[MySQL ETL] Inicializando AppDataSource (Postgres) para salvar dados raw...'
        );
        await AppDataSource.initialize();
        console.log('[MySQL ETL] AppDataSource (Postgres) inicializado.');
      } catch (error) {
        console.error(
          '[MySQL ETL] ERRO ao inicializar AppDataSource (Postgres):',
          error
        );
        return 0; // Não podemos salvar se o Postgres falhar
      }
    }

    try {
      // Query baseada na Consulta 2 do PBI, adaptada e parametrizada
      const query = `
                SELECT
                    S.SETOR,
                    A.OCORRENCIA,
                    COUNT(A.OCORRENCIA) AS TOTAL,
                    DATE(A.DATA) as DIA
                FROM negocioperfeito.quebrasedefeitos A
                INNER JOIN negocioperfeito.setores AS S ON S.CODSETOR = A.SETORLINHA
                WHERE
                    A.CODOCORRENCIA IN (1, 2) /* 1=Quebra, 2=Defeito (confirmar) */
                    AND A.DATA BETWEEN ? AND ? /* Parâmetros de Data */
                GROUP BY S.SETOR, A.OCORRENCIA, DATE(A.DATA)
                ORDER BY S.SETOR, DIA, A.OCORRENCIA;
            `;
      const parameters = [startDate, endDate];

      console.log('[MySQL ETL] Executando query de Quebra/Defeito no MySQL...');
      const results: any[] = await mysqlDataSource.query(query, parameters); // Vem como any[]
      console.log(
        `[MySQL ETL] Query MySQL retornou ${results.length} registros.`
      );

      if (results.length === 0) {
        console.log(
          '[MySQL ETL] Nenhum registro de Quebra/Defeito encontrado no MySQL para o período.'
        );
        return 0;
      }

      // Mapeia os resultados para o formato da nossa entidade RawMySqlQuebraDefeitoEntity
      const entitiesToSave = results.map((r) =>
        this.rawQuebraDefeitoRepo.create({
          metricDate:
            r.DIA instanceof Date
              ? r.DIA.toISOString().split('T')[0]
              : String(r.DIA), // Formata data YYYY-MM-DD
          sectorName: r.SETOR,
          occurrenceType: r.OCORRENCIA, // Vem 'QUEBRA' ou 'DEFEITO'
          totalCount: Number(r.TOTAL) || 0, // Garante número
          // etlTimestamp é gerado automaticamente pelo @CreateDateColumn
        })
      );

      // Antes de salvar, talvez seja bom limpar dados antigos para este período/tipo?
      // Por enquanto, apenas adiciona. Em um ETL real, faríamos upsert ou delete/insert.
      // Ex: await this.rawQuebraDefeitoRepo.delete({ metricDate: Between(startDate, endDate) });

      // Salva os dados mapeados na tabela raw do Postgres
      console.log(
        `[MySQL ETL] Salvando ${entitiesToSave.length} registros na tabela raw_mysql_quebras_defeitos...`
      );
      await this.rawQuebraDefeitoRepo.save(entitiesToSave, { chunk: 100 }); // Salva em lotes de 100
      console.log(
        `[MySQL ETL] Registros de Quebra/Defeito salvos no Postgres.`
      );

      return entitiesToSave.length; // Retorna quantos registros foram processados
    } catch (error) {
      console.error(
        '[MySQL ETL] ERRO durante extração/carga de Quebra/Defeito:',
        error
      );
      return 0; // Retorna 0 em caso de erro
    }
    // Deixamos as conexões abertas, o script de teste ou o orquestrador ETL vai fechá-las.
  }

  // --- Futuros Métodos para Atraso, Furo por Atraso, Furo de Viagem, Falta Frota ---
  // (Serão adicionados aqui)
} // Fim da Classe
