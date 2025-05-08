// apps/api/src/entity/raw-data/raw-oracle-km-ociosa.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_oracle_km_ociosa' })
@Index(['metricMonth', 'sectorName'])
export class RawOracleKmOciosaEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 7, comment: 'Mês da métrica (YYYY-MM)' })
  metricMonth!: string; // Ou Date se TRUNC retornar Date? Verificar query.
  @Column({ type: 'varchar', length: 100 }) sectorName!: string;
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    comment: 'Percentual Final KM Ociosa (da query PI_KMOCIOSA)',
  })
  ociosaPercent!: number;
  // Opcional: Armazenar componentes do cálculo se a query os retornar facilmente
  // @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true }) kmOperacionalBase?: number;
  // @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true }) kmHodometroAjustado?: number;
  @CreateDateColumn({ type: 'timestamp with time zone' }) etlTimestamp!: Date;
}
