import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class InsertGemDto {
  @IsUUID()
  ownedItemId: string;

  @IsInt()
  @Min(0)
  position: number;

  @IsUUID()
  gemDefinitionId: string;

  @IsOptional()
  @IsBoolean()
  replaceExisting: boolean = false;
}
