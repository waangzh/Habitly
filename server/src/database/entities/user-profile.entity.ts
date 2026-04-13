import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_profiles')
export class UserProfileEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: 'Habitly 用户' })
  nickname: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, default: '' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  bio: string;

  @Column({ name: 'cover_theme', type: 'varchar', length: 32, default: 'sky' })
  coverTheme: string;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Shanghai' })
  timezone: string;

  @Column({ type: 'varchar', length: 32, default: 'zh-CN' })
  locale: string;

  @Column({ name: 'vip_status', type: 'varchar', length: 16, default: 'free' })
  vipStatus: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @OneToOne(() => UserEntity, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
