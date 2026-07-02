import { Injectable } from '@nestjs/common';
import { UrlCache } from '../common/url-cache.interface';

/**
 * In-memory cache (one Map per process). Enough for this scope: the redirect is
 * read-heavy and the code->longUrl mapping is immutable, so there is no
 * invalidation. At scale, with multiple back-end instances, it would be replaced by
 * Redis to share the cache (see DESIGN.md). The UrlCache port would not change.
 */
@Injectable()
export class InMemoryUrlCache implements UrlCache {
  private readonly entries = new Map<string, string>();

  get(code: string): Promise<string | null> {
    return Promise.resolve(this.entries.get(code) ?? null);
  }

  set(code: string, longUrl: string): Promise<void> {
    this.entries.set(code, longUrl);
    return Promise.resolve();
  }
}
