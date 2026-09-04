import { Controller, Get, Post, Query } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  async getGames() {
    return this.gamesService.getAllGames();
  }

  @Post('sync')
  async syncCatalog() {
    return this.gamesService.syncCatalogFromRAWG();
  }

  @Get('search')
  async searchGames(@Query('query') query: string) {
    return this.gamesService.searchGames(query);
  }
}