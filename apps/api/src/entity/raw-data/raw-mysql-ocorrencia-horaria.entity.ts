// apps/api/src/entity/raw-data/raw-mysql-ocorrencia-horaria.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_mysql_ocorrencias_horarias' }) // Tabela de staging para dados da PI_OH
@Index(['metricDate', 'sectorName', 'criterionName'])
export class RawMySqlOcorrenciaHorariaEntity {
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
    comment: 'Nome do critério (ATRASO, FURO POR ATRASO, FURO DE VIAGEM)',
  })
  criterionName!: string; // 'ATRASO', 'FURO POR ATRASO', ou 'FURO DE VIAGEM'

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Nome original da ocorrência da tabela MySQL (opcional)',
  })
  originalOccurrenceName?: string; // Campo A.OCORRENCIA da query original

  @Column({ type: 'int', comment: 'Contagem de ocorrências no dia' })
  totalCount!: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Quando este registro foi carregado pelo ETL',
  })
  etlTimestamp!: Date;
}
