import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/env.validation';
import { encodeBase62 } from '../../generators/ShortCodeGenerator/short-code-generator';
import {
  URL_CACHE,
  UrlCache,
} from '../../repositories/common/url-cache.interface';
import {
  URL_STORE,
  UrlStore,
} from '../../repositories/common/url-store.interface';

/**
 * Orchestrates the business logic: generates codes (counter + Base62) and resolves
 * redirects with cache-aside. Depends on the UrlStore/UrlCache ports by token, so
 * it does not know the concrete implementations (Prisma, in-memory, Redis...).
 */
@Injectable()
export class UrlShortenerService {
  private readonly logger = new Logger(UrlShortenerService.name);
  private readonly baseUrl: string;

  constructor(
    @Inject(URL_STORE) private readonly store: UrlStore,
    @Inject(URL_CACHE) private readonly cache: UrlCache,
    configService: ConfigService<AppConfig, true>,
  ) {
    this.baseUrl = configService.get('BASE_URL', { infer: true });
  }

  /**
   * Creates a short link.
   */
  async shorten(longUrl: string): Promise<string> {
    const sequenceValue = await this.store.nextSequenceValue();
    const code = encodeBase62(sequenceValue);
    await this.store.save(code, longUrl);

    this.logger.log(`Link created: ${code} -> ${longUrl}`);
    return `${this.baseUrl}/${code}`;
  }

  /**
   * Resolves a code to its longUrl with cache-aside: cache first; if it is not
   * there, go to the store, populate the cache and respond.
   */
  async resolve(code: string): Promise<string> {
    const cached = await this.cache.get(code);
    if (cached !== null) {
      return cached;
    }

    const url = await this.store.findByCode(code);
    if (url === null) {
      this.logger.warn(`Code not found: ${code}`);
      throw new NotFoundException(`No URL found for code "${code}"`);
    }

    await this.cache.set(code, url.longUrl);
    return url.longUrl;
  }
}
