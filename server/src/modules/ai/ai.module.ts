import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiCallLogEntity } from '../../database/entities/ai-call-log.entity';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiCallLogEntity])],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
