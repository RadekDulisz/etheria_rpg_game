import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CombineGemsDto {
  @IsUUID()
  gemDefinitionId: string;

  @IsInt()
  @Min(1)
  @Max(999)
  count: number;
}
