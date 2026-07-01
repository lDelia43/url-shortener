import { StoredUrl, UrlStore } from '../common/url-store.interface';

/**
 * In-memory store implementation. Used ONLY in tests (unit and e2e) so we do not
 * depend on a real DB. It is not truly concurrency-safe, but it does not need to be:
 * Node is single-threaded and real concurrency is validated against Postgres in the
 * PrismaUrlStore integration test.
 */
export class InMemoryUrlStore implements UrlStore {
  private counter = 0n;
  private readonly urls = new Map<string, StoredUrl>();

  nextSequenceValue(): Promise<bigint> {
    this.counter += 1n;
    return Promise.resolve(this.counter);
  }

  save(code: string, longUrl: string): Promise<StoredUrl> {
    const stored: StoredUrl = { code, longUrl };
    this.urls.set(code, stored);
    return Promise.resolve(stored);
  }

  findByCode(code: string): Promise<StoredUrl | null> {
    return Promise.resolve(this.urls.get(code) ?? null);
  }
}
