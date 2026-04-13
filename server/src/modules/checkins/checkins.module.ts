import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitCheckinEntity } from '../../database/entities/habit-checkin.entity';
import { ProjectsModule } from '../projects/projects.module';
import { CheckinsController } from './checkins.controller';
import { CheckinsService } from './checkins.service';

@Module({
  imports: [TypeOrmModule.forFeature([HabitCheckinEntity]), ProjectsModule],
  controllers: [CheckinsController],
  providers: [CheckinsService],
  exports: [CheckinsService],
})
export class CheckinsModule {}
