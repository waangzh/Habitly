import { Module } from '@nestjs/common';
import { AchievementsModule } from '../achievements/achievements.module';
import { UsersModule } from '../users/users.module';
import { MoreController } from './more.controller';
import { MoreService } from './more.service';

@Module({
  imports: [UsersModule, AchievementsModule],
  controllers: [MoreController],
  providers: [MoreService],
})
export class MoreModule {}
