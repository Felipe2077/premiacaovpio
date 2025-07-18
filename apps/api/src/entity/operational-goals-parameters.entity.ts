// apps/api/src/entity/operational-goals-parameters.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'operational_goals_parameters' })
@Index(['parameterName'], { unique: true }) // Garantir que cada parâmetro existe apenas uma vez
export class OperationalGoalsParametersEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: 'Nome único do parâmetro (ex: FATOR_REDUCAO_COMBUSTIVEL)',
  })
  parameterName!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    comment: 'Valor numérico do parâmetro (ex: 0.015 para 1.5%)',
  })
  value!: number;

  @Column({
    type: 'text',
    comment: 'Descrição do parâmetro e seu uso',
  })
  description!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PERCENTAGE',
    comment: 'Tipo do parâmetro: PERCENTAGE, DECIMAL, INTEGER',
  })
  valueType!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: 'Valor mínimo permitido para validação',
  })
  minValue?: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: 'Valor máximo permitido para validação',
  })
  maxValue?: number | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Justificativa da última alteração',
  })
  changeJustification?: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: 'Valor anterior (para auditoria)',
  })
  previousValue?: number | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do usuário que fez a última alteração',
  })
  updatedByUserId?: number | null;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Se o parâmetro está ativo/sendo usado',
  })
  isActive!: boolean;

  // === RELACIONAMENTOS ===
  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedByUserId' })
  updatedBy?: UserEntity | null;

  // === AUDITORIA ===
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // === MÉTODOS HELPER ===

  /**
   * Valida se um valor está dentro da faixa permitida
   */
  isValidValue(newValue: number): boolean {
    if (this.minValue !== null && newValue < this.minValue!) {
      return false;
    }
    if (this.maxValue !== null && newValue > this.maxValue!) {
      return false;
    }
    return true;
  }

  /**
   * Retorna o valor formatado conforme o tipo
   */
  getFormattedValue(): string {
    switch (this.valueType) {
      case 'PERCENTAGE':
        return `${(this.value * 100).toFixed(2)}%`;
      case 'DECIMAL':
        return this.value.toFixed(6);
      case 'INTEGER':
        return Math.round(this.value).toString();
      default:
        return this.value.toString();
    }
  }

  /**
   * Converte valor de entrada para formato do banco
   */
  static parseValue(input: string | number, type: string): number {
    const numValue = typeof input === 'string' ? parseFloat(input) : input;

    switch (type) {
      case 'PERCENTAGE':
        // Se o usuário digitou 1.5 querendo dizer 1.5%, converter para 0.015
        return numValue > 1 ? numValue / 100 : numValue;
      default:
        return numValue;
    }
  }

  /**
   * Retorna range de valores permitidos como string
   */
  getValidRange(): string {
    if (this.minValue !== null && this.maxValue !== null) {
      return `${this.minValue} - ${this.maxValue}`;
    } else if (this.minValue !== null) {
      return `≥ ${this.minValue}`;
    } else if (this.maxValue !== null) {
      return `≤ ${this.maxValue}`;
    }
    return 'Sem limite';
  }
}
