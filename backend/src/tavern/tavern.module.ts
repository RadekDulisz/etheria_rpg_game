import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { TavernController } from './tavern.controller';
import { TavernService } from './tavern.service';

@Module({
  imports: [CharactersModule],
  controllers: [TavernController],
  providers: [TavernService],
  exports: [TavernService],
})
export class TavernModule {}
