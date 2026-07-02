import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/env.validation';
import { InMemoryUrlCache } from '../../repositories/InMemoryUrlCache/in-memory-url-cache';
import { InMemoryUrlStore } from '../../repositories/InMemoryUrlStore/in-memory-url-store';
import { UrlShortenerService } from './url-shortener.service';

describe('UrlShortenerService', () => {
  let store: InMemoryUrlStore;
  let cache: InMemoryUrlCache;
  let service: UrlShortenerService;

  beforeEach(() => {
    store = new InMemoryUrlStore();
    cache = new InMemoryUrlCache();
    const configService = new ConfigService<AppConfig, true>({
      DATABASE_URL: 'postgresql://test',
      PORT: 3000,
      BASE_URL: 'http://localhost:3000',
    });
    service = new UrlShortenerService(store, cache, configService);
  });

  it('shorten builds the shortUrl from BASE_URL + Base62 code', async () => {
    // First counter value = 1 => encodeBase62(1n) = 'b'.
    const shortUrl = await service.shorten('https://example.com/a');
    expect(shortUrl).toBe('http://localhost:3000/b');
  });

  it('cache-aside MISS: queries the store and populates the cache', async () => {
    await service.shorten('https://example.com/a'); // creates code 'b'
    const findSpy = jest.spyOn(store, 'findByCode');
    const setSpy = jest.spyOn(cache, 'set');

    const longUrl = await service.resolve('b');

    expect(longUrl).toBe('https://example.com/a');
    expect(findSpy).toHaveBeenCalledTimes(1); // went to the store
    expect(setSpy).toHaveBeenCalledWith('b', 'https://example.com/a'); // populated the cache
  });

  it('cache-aside HIT: does not touch the store again', async () => {
    await service.shorten('https://example.com/a'); // code 'b'
    await service.resolve('b'); // first resolve => populates the cache
    const findSpy = jest.spyOn(store, 'findByCode');

    const longUrl = await service.resolve('b'); // second resolve => HIT

    expect(longUrl).toBe('https://example.com/a');
    expect(findSpy).not.toHaveBeenCalled(); // the store is not touched on a HIT
  });

  it('resolve throws NotFound when the code does not exist', async () => {
    await expect(service.resolve('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
