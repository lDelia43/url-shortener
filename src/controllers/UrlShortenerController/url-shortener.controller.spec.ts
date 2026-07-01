import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UrlShortenerService } from '../../services/UrlShortenerService/url-shortener.service';
import { UrlShortenerController } from './url-shortener.controller';

describe('UrlShortenerController', () => {
  let controller: UrlShortenerController;
  // Minimal typed mock of the service (no `any`): only the two methods used.
  const service = {
    shorten: jest.fn<Promise<string>, [string]>(),
    resolve: jest.fn<Promise<string>, [string]>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [UrlShortenerController],
      providers: [{ provide: UrlShortenerService, useValue: service }],
    }).compile();
    controller = moduleRef.get(UrlShortenerController);
  });

  it('shorten delegates to the service and wraps the result in { shortUrl }', async () => {
    service.shorten.mockResolvedValue('http://localhost:3000/b');

    const result = await controller.shorten({ longUrl: 'https://example.com' });

    expect(service.shorten).toHaveBeenCalledWith('https://example.com');
    expect(result).toEqual({ shortUrl: 'http://localhost:3000/b' });
  });

  it('redirect returns a 301 redirect object to the resolved longUrl', async () => {
    service.resolve.mockResolvedValue('https://example.com/dest');

    const result = await controller.redirect('b');

    expect(service.resolve).toHaveBeenCalledWith('b');
    expect(result).toEqual({
      url: 'https://example.com/dest',
      statusCode: HttpStatus.MOVED_PERMANENTLY,
    });
  });
});
