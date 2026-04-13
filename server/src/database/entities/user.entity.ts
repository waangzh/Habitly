import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AiCallLogEntity } from './ai-call-log.entity';
import { HabitCheckinEntity } from './habit-checkin.entity';
import { HabitProjectEntity } from './habit-project.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { UserProfileEntity } from './user-profile.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'openid', type: 'varchar', length: 64, unique: true })
  openid: string;

  @Column({ name: 'unionid', type: 'varchar', length: 64, nullable: true })
  unionid: string | null;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @OneToOne(() => UserProfileEntity, (profile) => profile.user)
  profile: UserProfileEntity;

  @OneToMany(() => HabitProjectEntity, (project) => project.user)
  projects: HabitProjectEntity[];

  @OneToMany(() => HabitCheckinEntity, (checkin) => checkin.user)
  checkins: HabitCheckinEntity[];

  @OneToMany(() => RefreshTokenEntity, (token) => token.user)
  refreshTokens: RefreshTokenEntity[];

  @OneToMany(() => AiCallLogEntity, (log) => log.user)
  aiCallLogs: AiCallLogEntity[];
}
