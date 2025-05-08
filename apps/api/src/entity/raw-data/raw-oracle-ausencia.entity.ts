// apps/api/src/entity/raw-data/raw-oracle-ausencia.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_oracle_ausencias' }) // Nome da tabela de staging no Postgres
@Index(['metricDate', 'sectorName', 'occurrenceType'])
export class RawOracleAusenciaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date', comment: 'Dia da ocorrência agregada' })
  metricDate!: string; // Formato YYYY-MM-DD

  @Column({ type: 'varchar', length: 100, comment: 'Nome do setor mapeado' })
  sectorName!: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Tipo da ocorrência (FALTA FUNC ou ATESTADO FUNC)',
  })
  occurrenceType!: 'FALTA FUNC' | 'ATESTADO FUNC';

  @Column({ type: 'int', comment: 'Contagem de funcionários distintos no dia' })
  employeeCount!: number; // O COUNT(DISTINCT A.CODFUNC) da query

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Quando este registro foi carregado pelo ETL',
  })
  etlTimestamp!: Date;
}
