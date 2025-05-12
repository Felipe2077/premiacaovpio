// apps/api/src/entity/raw-data/raw-oracle-ipk-calculado.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_oracle_ipk_calculado' })
@Index(['metricMonth', 'sectorName'], { unique: true }) // Mês/Setor deve ser único
export class RawOracleIpkCalculadoEntity {
  @PrimaryGeneratedColumn() id!: number;

  @Column({ type: 'varchar', length: 7, comment: 'Mês da métrica (YYYY-MM)' })
  metricMonth!: string;

  @Column({ type: 'varchar', length: 100, comment: 'Nome do setor mapeado' })
  sectorName!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    comment: 'Valor do IPK calculado pela query Oracle',
  })
  ipkValue!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  etlTimestamp!: Date;
}
