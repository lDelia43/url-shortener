import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InMemoryUrlCache } from './InMemoryUrlCache/in-memory-url-cache';
import { PrismaUrlStore } from './PrismaUrlStore/prisma-url-store';
import { URL_CACHE } from './common/url-cache.interface';
import { URL_STORE } from './common/url-store.interface';

/**
 * Persistence layer module. Binds each port to its adapter and exports ONLY the
 * tokens, so PrismaService stays encapsulated here (its natural layer) instead of
 * leaking into the controllers module. To add a store/cache, register + export it.
 */
@Module({
  providers: [
    PrismaService,
    { provide: URL_STORE, useClass: PrismaUrlStore },
    { provide: URL_CACHE, useClass: InMemoryUrlCache },
  ],
  exports: [URL_STORE, URL_CACHE],
})
export class RepositoriesModule {}
