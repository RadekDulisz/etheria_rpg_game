import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';

@Module({
  imports: [CharactersModule],
  controllers: [GuildsController],
  providers: [GuildsService],
})
export class GuildsModule {}
