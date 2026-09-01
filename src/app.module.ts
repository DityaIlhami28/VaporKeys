import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { EncryptionService } from './security/encryption/encryption.service';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, EncryptionService],
})
export class AppModule {}
