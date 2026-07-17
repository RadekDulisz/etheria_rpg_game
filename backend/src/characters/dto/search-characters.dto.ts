import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchCharactersDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name: string;
}
