import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CharactersService } from './characters.service';
import { toCharacterResponse, CharacterResponse } from './characters.mapper';
import { AddExperienceDto } from './dto/add-experience.dto';
import { AllocateStatsDto } from './dto/allocate-stats.dto';
import { CreateCharacterDto } from './dto/create-character.dto';
import { SearchCharactersDto } from './dto/search-characters.dto';

@UseGuards(JwtAuthGuard)
@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCharacterDto,
  ): Promise<CharacterResponse> {
    const character = await this.charactersService.createCharacter(user.sub, dto.name);
    return toCharacterResponse(character);
  }

  @Get('me')
  async getMine(@CurrentUser() user: JwtPayload): Promise<CharacterResponse> {
    const character = await this.charactersService.getByUserId(user.sub);
    return toCharacterResponse(character);
  }

  // Do wyszukania przeciwnika przed walka PvP (etap 7) - celowo zwraca
  // tylko id/name/level, bez statow ani zlota.
  @Get('search')
  search(@Query() dto: SearchCharactersDto) {
    return this.charactersService.searchByName(dto.name);
  }

  @Patch('me/stats')
  async allocateStats(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AllocateStatsDto,
  ): Promise<CharacterResponse> {
    const character = await this.charactersService.allocateStatPoints(user.sub, dto);
    return toCharacterResponse(character);
  }

  // Docelowo wywolywane przez silnik walki (etap 6). Na razie tylko admin,
  // do testow rozwojowych i balansowania gry.
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post(':id/experience')
  async addExperience(
    @Param('id') id: string,
    @Body() dto: AddExperienceDto,
  ): Promise<CharacterResponse> {
    const character = await this.charactersService.addExperience(id, dto.amount);
    return toCharacterResponse(character);
  }
}
