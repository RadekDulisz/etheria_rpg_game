import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { TavernModule } from '../tavern/tavern.module';
import { TestAccountGuard } from './test-account.guard';
import { TestToolsController } from './test-tools.controller';
import { TestToolsService } from './test-tools.service';

@Module({
  imports: [CharactersModule, TavernModule],
  controllers: [TestToolsController],
  providers: [TestToolsService, TestAccountGuard],
})
export class TestToolsModule {}
