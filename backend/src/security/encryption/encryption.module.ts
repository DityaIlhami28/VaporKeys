import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Module({
  providers: [EncryptionService],
  exports: [EncryptionService], // 👈 Allows other modules to use EncryptionService
})
export class EncryptionModule {}