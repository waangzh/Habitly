import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { AiCallLogEntity } from './entities/ai-call-log.entity';
import { HabitCheckinEntity } from './entities/habit-checkin.entity';
import { HabitProjectEntity } from './entities/habit-project.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { UserEntity } from './entities/user.entity';
import { InitialSchema1713024000000 } from './migrations/1713024000000-InitialSchema';

export const DATABASE_ENTITIES = [
  UserEntity,
  UserProfileEntity,
  HabitProjectEntity,
  HabitCheckinEntity,
  RefreshTokenEntity,
  AiCallLogEntity,
];

export const DATABASE_MIGRATIONS = [InitialSchema1713024000000];

export function createTypeOrmOptions(configService: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: configService.getOrThrow<string>('mysql.host'),
    port: configService.getOrThrow<number>('mysql.port'),
    username: configService.getOrThrow<string>('mysql.username'),
    password: configService.getOrThrow<string>('mysql.password'),
    database: configService.getOrThrow<string>('mysql.database'),
    charset: 'utf8mb4',
    timezone: 'Z',
    entities: DATABASE_ENTITIES,
    migrations: DATABASE_MIGRATIONS,
    synchronize: false,
    logging: false,
  };
}

export function createTypeOrmDataSourceOptions(env: NodeJS.ProcessEnv): DataSourceOptions {
  return {
    type: 'mysql',
    host: env.MYSQL_HOST || '127.0.0.1',
    port: Number(env.MYSQL_PORT || 3306),
    username: env.MYSQL_USERNAME || 'root',
    password: env.MYSQL_PASSWORD || '',
    database: env.MYSQL_DATABASE || 'habit_todo',
    charset: 'utf8mb4',
    timezone: 'Z',
    entities: DATABASE_ENTITIES,
    migrations: DATABASE_MIGRATIONS,
    synchronize: false,
    logging: false,
  };
}
