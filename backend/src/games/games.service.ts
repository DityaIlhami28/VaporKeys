import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/security/encryption/encryption.service';
import { firstValueFrom } from 'rxjs';
import { Prisma, Game } from '@prisma/client';

@Injectable()
export class GamesService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly encryptionService: EncryptionService
    ) {}

    async syncCatalogFromRAWG() {
        const apiKey = this.configService.get<string>('RAWG_API_KEY');
        const url = `https://api.rawg.io/api/games?key=${apiKey}&page_size=10`;

        const { data } = await firstValueFrom(this.httpService.get(url));

        const syncedGames: Game[] = [];

        for (const item of data.results) {
            const game = await this.prisma.game.upsert({
                where: { steamAppId: item.id},
                update: {
                    title: item.name,
                    headerImage: item.background_image || '',
                },
                create: {
                    title: item.name,
                    steamAppId: item.id,
                    price: 29.99,
                    headerImage: item.background_image || '',
                    createdAt: new Date(),
                }
            });

            const keyCount = await this.prisma.gameKey.count({ where: { gameId: game.id }});
            if (keyCount === 0) {
                await this.seedMockKeysForGame(game.id, 10);
            }
            syncedGames.push(game)
        }
        return { message: 'Catalog synced', total: syncedGames.length };
    }

    async getAllGames() {
        return this.prisma.game.findMany({
            include: {
                _count: { select: {keys: {where: { isSold: false} } } }
            }
        });
    }

    private async seedMockKeysForGame( gameId: string, count: number ) {
        const keysData: Prisma.GameKeyCreateManyInput[] = [];
        for (let i = 0; i < count; i++) {
            const rawKey = this.generateSteamKeyFormat();
            keysData.push({
                encryptedCode: this.encryptionService.encrypt(rawKey),
                gameId
            })
        }

        await this.prisma.gameKey.createMany({ data: keysData });
    }

    private generateSteamKeyFormat(): string {
    const seg = () => Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${seg()}-${seg()}-${seg()}`;
  }
}
