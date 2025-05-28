//apps/api/src/entity/criterion.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'criteria' })
export class CriterionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  nome!: string; // Ex: 'ATRASO', 'IPK'

  @Column({ type: 'int', nullable: true, unique: true }) // Pode ser nulo? É único? A DEFINIR.
  index!: number | null; // O código usado na lógica de pontuação

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unidade_medida?: string;

  @Column({ type: 'varchar', length: 10, nullable: true }) // MAIOR ou MENOR
  sentido_melhor?: 'MAIOR' | 'MENOR';

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  // VVV ADICIONE ESTAS LINHAS ABAIXO VVV
  @Column({
    type: 'integer',
    name: 'casas_decimais_padrao',
    nullable: false,
    default: 0,
  })
  casasDecimaisPadrao!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
