import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CharactersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
