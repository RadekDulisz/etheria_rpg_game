import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BuyPropertyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}
