import { Module } from '@nestjs/common';
import { UrlShortenerController } from '../controllers/UrlShortenerController/url-shortener.controller';
import { PrismaService } from '../prisma/prisma.service';
import { InMemoryUrlCache } from '../persistence/InMemoryUrlCache/in-memory-url-cache';
import { PrismaUrlStore } from '../persistence/PrismaUrlStore/prisma-url-store';
import { URL_CACHE } from '../persistence/common/url-cache.interface';
import { URL_STORE } from '../persistence/common/url-store.interface';
import { UrlShortenerService } from '../services/UrlShortenerService/url-shortener.service';

/**
 * Feature module: bundles everything for the URL shortener — controller, service,
 * and the port bindings (plus the Prisma client). `app.module` imports only this.
 * Idiomatic Nest: one module per feature, not per technical layer.
 * - URL_STORE -> PrismaUrlStore (real Postgres)
 * - URL_CACHE -> InMemoryUrlCache
 * The e2e tests override URL_STORE / PrismaService with `.overrideProvider(...)`.
 */
@Module({
  controllers: [UrlShortenerController],
  providers: [
    UrlShortenerService,
    PrismaService,
    { provide: URL_STORE, useClass: PrismaUrlStore },
    { provide: URL_CACHE, useClass: InMemoryUrlCache },
  ],
})
export class UrlShortenerModule {}
