import { IsInt, IsUUID, Min } from 'class-validator';

export class ExtractGemDto {
  @IsUUID()
  ownedItemId: string;

  @IsInt()
  @Min(0)
  position: number;
}
