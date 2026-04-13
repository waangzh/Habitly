import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async check() {
    await this.dataSource.query('SELECT 1');
    const redis = await this.redisService.ping();

    return {
      status: 'ok',
      mysql: 'up',
      redis: redis.toLowerCase() === 'pong' ? 'up' : 'unknown',
    };
  }
}
