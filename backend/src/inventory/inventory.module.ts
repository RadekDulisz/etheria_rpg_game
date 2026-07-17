import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [CharactersModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
