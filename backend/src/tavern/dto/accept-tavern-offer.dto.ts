import { TavernProvisionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, Max, Min, ValidateNested } from 'class-validator';

export class TavernLoadoutEntryDto {
  @IsEnum(TavernProvisionType)
  type: TavernProvisionType;

  @IsInt()
  @Min(1)
  @Max(3)
  quantity: number;
}

export class AcceptTavernOfferDto {
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => TavernLoadoutEntryDto)
  provisions: TavernLoadoutEntryDto[] = [];
}
