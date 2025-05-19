// apps/api/src/entity/criterion-calculation-settings.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CriterionEntity } from './criterion.entity';

@Entity('criterion_calculation_settings')
export class CriterionCalculationSettingsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'criterion_id' })
  criterionId: number;

  @Column({ name: 'calculation_method', length: 20 })
  calculationMethod: string;

  @Column({
    name: 'adjustment_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  adjustmentPercentage: number | null;

  @Column({ name: 'requires_rounding', default: true })
  requiresRounding: boolean;

  @Column({
    name: 'rounding_method',
    type: 'varchar', // Especificar explicitamente o tipo como varchar
    length: 10,
    nullable: true,
    default: 'nearest',
  })
  roundingMethod: string | null; // Remover o tipo Object

  @Column({ name: 'rounding_decimal_places', default: 0 })
  roundingDecimalPlaces: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CriterionEntity)
  @JoinColumn({ name: 'criterion_id' })
  criterion: CriterionEntity;
}
