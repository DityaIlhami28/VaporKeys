import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/security/encryption/encryption.service';
import { firstValueFrom } from 'rxjs';
import { Prisma, Game } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class GamesService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async syncCatalogFromRAWG() {
    const apiKey = this.configService.get<string>('RAWG_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('RAWG_API_KEY configuration missing');
    }

    const url = `https://api.rawg.io/api/games?key=${apiKey}&page_size=10`;

    let data: any;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      data = response.data;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch catalog from RAWG API');
    }

    const syncedGames: Game[] = [];

    for (const item of data.results) {
      const game = await this.prisma.game.upsert({
        where: { steamAppId: item.id },
        update: {
          title: item.name,
          headerImage: item.background_image || '',
        },
        create: {
          title: item.name,
          steamAppId: item.id,
          price: 29.99,
          headerImage: item.background_image || '',
        },
      });

      const keyCount = await this.prisma.gameKey.count({
        where: { gameId: game.id },
      });

      if (keyCount === 0) {
        await this.seedMockKeysForGame(game.id, 10);
      }

      syncedGames.push(game);
    }

    return { message: 'Catalog synced', total: syncedGames.length };
  }

  async getAllGames() {
    return this.prisma.game.findMany({
      include: {
        _count: {
          select: { keys: { where: { isSold: false } } },
        },
      },
    });
  }

  private async seedMockKeysForGame(gameId: string, count: number) {
    const keysData: Prisma.GameKeyCreateManyInput[] = Array.from({ length: count }, () => ({
      encryptedCode: this.encryptionService.encrypt(this.generateSteamKeyFormat()),
      gameId,
    }));

    await this.prisma.gameKey.createMany({ data: keysData });
  }

  private generateSteamKeyFormat(): string {
    const seg = () => randomBytes(3).toString('hex').substring(0, 5).toUpperCase();
    return `${seg()}-${seg()}-${seg()}`;
  }

  async searchGames(query: string) {
    if (!query || query.trim() === '') {
      return [];
    }

    return this.prisma.game.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: 20
    });
  }
}