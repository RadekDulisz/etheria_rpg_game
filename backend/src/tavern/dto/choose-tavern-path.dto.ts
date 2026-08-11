import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChooseTavernPathDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  choiceId: string;
}
