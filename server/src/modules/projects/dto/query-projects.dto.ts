import { IsIn, IsOptional } from 'class-validator';

export class QueryProjectsDto {
  @IsOptional()
  @IsIn(['active', 'paused', 'archived'])
  status?: 'active' | 'paused' | 'archived';
}
