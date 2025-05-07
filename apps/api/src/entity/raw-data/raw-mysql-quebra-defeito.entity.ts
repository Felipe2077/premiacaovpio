// apps/api/src/entity/raw-data/raw-mysql-quebra-defeito.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_mysql_quebras_defeitos' }) // Nome da tabela de staging
@Index(['metricDate', 'sectorName', 'occurrenceType']) // Índices para consulta
export class RawMySqlQuebraDefeitoEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date', comment: 'Dia da ocorrência agregada' })
  metricDate!: string; // Ou Date

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Nome do setor (GAMA, PARANOA, etc.)',
  })
  sectorName!: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Tipo da ocorrência (QUEBRA ou DEFEITO)',
  })
  occurrenceType!: string; // O valor que vem da coluna A.OCORRENCIA

  @Column({ type: 'int', comment: 'Contagem de ocorrências no dia' })
  totalCount!: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Quando este registro foi carregado pelo ETL',
  })
  etlTimestamp!: Date;
}
