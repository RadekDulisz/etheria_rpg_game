import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { BattlesController } from './battles.controller';
import { BattlesService } from './battles.service';

@Module({
  imports: [CharactersModule],
  controllers: [BattlesController],
  providers: [BattlesService],
})
export class BattlesModule {}
