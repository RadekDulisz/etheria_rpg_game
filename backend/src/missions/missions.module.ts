import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

@Module({
  imports: [CharactersModule],
  controllers: [MissionsController],
  providers: [MissionsService],
})
export class MissionsModule {}

