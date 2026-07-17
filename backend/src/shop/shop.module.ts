import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [CharactersModule],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
