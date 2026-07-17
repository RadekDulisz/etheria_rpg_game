import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { ItemGrade } from '@prisma/client';

export enum CatalogSection {
  WEAPONS = 'WEAPONS',
  ARMOR = 'ARMOR',
  JEWELRY = 'JEWELRY',
  SPECIAL = 'SPECIAL',
}

export class CatalogQueryDto {
  @IsEnum(CatalogSection)
  section: CatalogSection;

  @IsEnum(ItemGrade)
  grade: ItemGrade;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(24)
  pageSize: number = 12;
}
