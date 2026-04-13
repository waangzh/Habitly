import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private readonly fallbackStore = new Map<string, { value: string; expiresAt: number | null }>();
  private available = false;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      socket: {
        host: this.configService.getOrThrow<string>('redis.host'),
        port: this.configService.getOrThrow<number>('redis.port'),
      },
      password: this.configService.get<string>('redis.password') || undefined,
      database: this.configService.getOrThrow<number>('redis.db'),
    });

    this.client.on('error', (error) => {
      this.logger.error(error instanceof Error ? error.message : String(error));
    });
  }

  async onModuleInit(): Promise<void> {
    if (this.client.isOpen) {
      this.available = true;
      return;
    }

    try {
      await this.client.connect();
      this.available = true;
    } catch (error) {
      if (this.configService.getOrThrow<string>('app.nodeEnv') === 'development') {
        this.logger.warn('Redis 未连接，当前退回到开发态内存缓存。');
        this.available = false;
        return;
      }
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.available) {
      this.cleanupExpired(key);
      return this.fallbackStore.get(key)?.value || null;
    }
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.available) {
      this.fallbackStore.set(key, { value, expiresAt: null });
      return;
    }
    await this.client.set(key, value);
  }

  async setWithTtl(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (!this.available) {
      this.fallbackStore.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return;
    }
    await this.client.set(key, value, { EX: ttlSeconds });
  }

  async setNxWithTtl(key: string, ttlSeconds: number, value: string): Promise<boolean> {
    if (!this.available) {
      this.cleanupExpired(key);
      if (this.fallbackStore.has(key)) {
        return false;
      }
      this.fallbackStore.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return true;
    }
    const result = await this.client.set(key, value, { EX: ttlSeconds, NX: true });
    return result === 'OK';
  }

  async del(key: string): Promise<void> {
    if (!this.available) {
      this.fallbackStore.delete(key);
      return;
    }
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    if (!this.available) {
      this.cleanupExpired(key);
      const current = Number(this.fallbackStore.get(key)?.value || 0) + 1;
      const expiresAt = this.fallbackStore.get(key)?.expiresAt || null;
      this.fallbackStore.set(key, { value: String(current), expiresAt });
      return current;
    }
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.available) {
      const current = this.fallbackStore.get(key);
      if (!current) {
        return;
      }
      this.fallbackStore.set(key, {
        value: current.value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return;
    }
    await this.client.expire(key, ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async setJsonWithTtl(key: string, ttlSeconds: number, value: unknown): Promise<void> {
    await this.setWithTtl(key, ttlSeconds, JSON.stringify(value));
  }

  async ping(): Promise<string> {
    if (!this.available) {
      return 'MEMORY';
    }
    return this.client.ping();
  }

  private cleanupExpired(key: string): void {
    const current = this.fallbackStore.get(key);
    if (!current?.expiresAt) {
      return;
    }

    if (current.expiresAt <= Date.now()) {
      this.fallbackStore.delete(key);
    }
  }
}
