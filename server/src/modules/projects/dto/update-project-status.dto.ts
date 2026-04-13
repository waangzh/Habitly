import { IsIn } from 'class-validator';

export class UpdateProjectStatusDto {
  @IsIn(['active', 'paused', 'archived'])
  status: 'active' | 'paused' | 'archived';
}
