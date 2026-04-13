import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ProjectDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  prompt: string;
}
