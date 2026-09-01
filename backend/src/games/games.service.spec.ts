import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { GamesService } from './games.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/security/encryption/encryption.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('GamesService', () => {
  let service: GamesService;
  let prismaService: PrismaService;
  let encryptionService: EncryptionService;
  let httpService: HttpService;

  // Mock RAWG API Response payload
  const mockRawgResponse: AxiosResponse = {
    data: {
      results: [
        {
          id: 1091500,
          name: 'Cyberpunk 2077',
          background_image: 'https://example.com/cyberpunk.jpg',
        },
      ],
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} as any },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn().mockReturnValue(of(mockRawgResponse)),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RAWG_API_KEY') return 'mock_rawg_key';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            game: {
              upsert: jest.fn().mockResolvedValue({
                id: 'game-uuid-123',
                steamAppId: 1091500,
                title: 'Cyberpunk 2077',
                price: 29.99,
                headerImage: 'https://example.com/cyberpunk.jpg',
              }),
              findMany: jest.fn().mockResolvedValue([
                {
                  id: 'game-uuid-123',
                  title: 'Cyberpunk 2077',
                  _count: { keys: 10 },
                },
              ]),
            },
            gameKey: {
              count: jest.fn().mockResolvedValue(0),
              createMany: jest.fn().mockResolvedValue({ count: 10 }),
            },
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn().mockReturnValue('mock_iv:mock_encrypted_code'),
          },
        },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncCatalogFromRAWG', () => {
    it('should fetch games from RAWG, upsert into DB, and seed mock keys', async () => {
      const result = await service.syncCatalogFromRAWG();

      // 1. Verify HTTP request called RAWG URL
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.rawg.io/api/games?key=mock_rawg_key&page_size=10',
      );

      // 2. Verify Game was upserted in Prisma
      expect(prismaService.game.upsert).toHaveBeenCalledWith({
        where: { steamAppId: 1091500 },
        update: {
          title: 'Cyberpunk 2077',
          headerImage: 'https://example.com/cyberpunk.jpg',
        },
        create: {
          title: 'Cyberpunk 2077',
          steamAppId: 1091500,
          price: 29.99,
          headerImage: 'https://example.com/cyberpunk.jpg',
          createdAt: expect.any(Date),
        },
      });

      // 3. Verify EncryptionService was called 10 times for mock keys
      expect(encryptionService.encrypt).toHaveBeenCalledTimes(10);

      // 4. Verify batch creation of 10 keys in Prisma
      expect(prismaService.gameKey.createMany).toHaveBeenCalledTimes(1);

      // 5. Verify final output message
      expect(result).toEqual({ message: 'Catalog synced', total: 1 });
    });
  });

  describe('getAllGames', () => {
    it('should return all games with available key counts', async () => {
      const games = await service.getAllGames();

      expect(prismaService.game.findMany).toHaveBeenCalledWith({
        include: {
          _count: { select: { keys: { where: { isSold: false } } } },
        },
      });

      expect(games).toHaveLength(1);
      expect(games[0].title).toBe('Cyberpunk 2077');
    });
  });
});