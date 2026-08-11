import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { BlacksmithController } from './blacksmith.controller';
import { BlacksmithService } from './blacksmith.service';

@Module({
  imports: [CharactersModule],
  controllers: [BlacksmithController],
  providers: [BlacksmithService],
})
export class BlacksmithModule {}
