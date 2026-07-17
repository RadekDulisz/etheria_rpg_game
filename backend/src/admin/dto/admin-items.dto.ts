import { ItemCategory, ItemGrade, ItemRarity, SlotGroup, WeaponType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsEnum(ItemCategory)
  category: ItemCategory;

  @IsOptional()
  @IsEnum(ItemRarity)
  rarity?: ItemRarity;

  @IsOptional()
  @IsEnum(ItemGrade)
  grade?: ItemGrade;

  @IsOptional()
  @IsEnum(SlotGroup)
  slotGroup?: SlotGroup | null;

  @IsOptional()
  @IsEnum(WeaponType)
  weaponType?: WeaponType | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStack?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  iconUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minLevel?: number;

  @IsOptional()
  @IsInt()
  strengthBonus?: number;

  @IsOptional()
  @IsInt()
  agilityBonus?: number;

  @IsOptional()
  @IsInt()
  enduranceBonus?: number;

  @IsOptional()
  @IsInt()
  intelligenceBonus?: number;

  @IsOptional()
  @IsInt()
  attackPower?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  damageMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  damageMax?: number;

  @IsOptional()
  @IsInt()
  defensePower?: number;

  @IsOptional()
  @IsInt()
  parryBonus?: number;

  @IsOptional()
  @IsInt()
  maxHpBonus?: number;

  @IsOptional()
  @IsInt()
  criticalChanceBonus?: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;

  @IsOptional()
  @IsEnum(ItemRarity)
  rarity?: ItemRarity;

  @IsOptional()
  @IsEnum(ItemGrade)
  grade?: ItemGrade;

  @IsOptional()
  @IsEnum(SlotGroup)
  slotGroup?: SlotGroup | null;

  @IsOptional()
  @IsEnum(WeaponType)
  weaponType?: WeaponType | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStack?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  iconUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  minLevel?: number;

  @IsOptional()
  @IsInt()
  strengthBonus?: number;

  @IsOptional()
  @IsInt()
  agilityBonus?: number;

  @IsOptional()
  @IsInt()
  enduranceBonus?: number;

  @IsOptional()
  @IsInt()
  intelligenceBonus?: number;

  @IsOptional()
  @IsInt()
  attackPower?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  damageMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  damageMax?: number;

  @IsOptional()
  @IsInt()
  defensePower?: number;

  @IsOptional()
  @IsInt()
  parryBonus?: number;

  @IsOptional()
  @IsInt()
  maxHpBonus?: number;

  @IsOptional()
  @IsInt()
  criticalChanceBonus?: number;
}
