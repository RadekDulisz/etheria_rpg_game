import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBotDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  expReward?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  goldReward?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  strength?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  agility?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  endurance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  intelligence?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  parryRating?: number;
}

export class UpdateBotDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  expReward?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  goldReward?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  strength?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  agility?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  endurance?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  intelligence?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  parryRating?: number;
}
