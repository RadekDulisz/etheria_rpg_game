import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGuildDto {
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;
}
