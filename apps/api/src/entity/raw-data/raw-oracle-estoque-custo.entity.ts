// apps/api/src/entity/raw-data/raw-oracle-estoque-custo.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_oracle_estoque_custos' })
@Index(['metricDate', 'sectorName', 'criterionName'])
export class RawOracleEstoqueCustoEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'date' }) metricDate!: string; // Dia da requisição/movimento (DATARQ?)
  @Column({ type: 'varchar', length: 100 }) sectorName!: string; // Nome do setor mapeado
  @Column({ type: 'varchar', length: 100 }) criterionName!: 'PEÇAS' | 'PNEUS'; // Identifica se é Peça ou Pneu
  @Column({ type: 'decimal', precision: 18, scale: 2 }) totalValue!: number; // Soma de VALORTOTALITENSMOVTO
  @CreateDateColumn({ type: 'timestamp with time zone' }) etlTimestamp!: Date;
}
