import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { UrlShortenerModule } from './modules/url-shortener.module';

@Module({
  imports: [
    // Validates the .env with Zod at startup (fail-fast). isGlobal => ConfigService
    // is available across the whole app without re-importing.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    UrlShortenerModule,
  ],
})
export class AppModule {}
