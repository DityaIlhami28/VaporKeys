import { Injectable } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = "aes-256-cbc";
    private readonly key: Buffer;

    constructor(private configService: ConfigService) {
        const secret = this.configService.get<string>('ENCRYPTION_KEY');
        if(!secret || secret.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be exactly 32 characters long.');
        }
        this.key = Buffer.from(secret, 'utf-8');
    }

    encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }

    decrypt(encryptedText: string): string {
        const [ivHex, encryptedHex] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
