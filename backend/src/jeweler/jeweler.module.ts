import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { JewelerController } from './jeweler.controller';
import { JewelerService } from './jeweler.service';

@Module({
  imports: [CharactersModule],
  controllers: [JewelerController],
  providers: [JewelerService],
})
export class JewelerModule {}
