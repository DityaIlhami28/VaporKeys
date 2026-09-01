import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'ENCRYPTION_KEY') return 'v7x!A9#zQ2$L1pM8*R5tW0^K4jN6@bY3';
              return null;
            },
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should encrypt and decrypt a Steam key correctly', () => {
    const originalKey = 'X7A9K-92B1M-L03QP';
    const encrypted = service.encrypt(originalKey);

    expect(encrypted).not.toEqual(originalKey);
    expect(encrypted).toContain(':'); // Checks IV:Ciphertext format

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(originalKey);
  });
});