import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { EncryptionModule } from 'src/security/encryption/encryption.module';

@Module({
  imports: [HttpModule, EncryptionModule],
  providers: [GamesService],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule {}