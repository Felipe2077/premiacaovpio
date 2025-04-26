// apps/api/src/entity/user.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity'; // Importaremos RoleEntity

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  nome!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  // Não vamos guardar hash de senha neste MVP inicial focado em seed/display
  // @Column({ type: 'varchar', length: 255, select: false }) // select: false para não retornar por padrão
  // password_hash: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  // Relação com Perfis (Muitos para Muitos) - OPCIONAL para agora, mas bom ter
  @ManyToMany(() => RoleEntity)
  @JoinTable({
    name: 'user_roles', // nome da tabela de junção
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: RoleEntity[]; // Array de perfis associados

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
