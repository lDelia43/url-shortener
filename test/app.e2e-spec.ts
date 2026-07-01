import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { URL_STORE } from '../src/repositories/common/url-store.interface';
import { InMemoryUrlStore } from '../src/repositories/InMemoryUrlStore/in-memory-url-store';

/**
 * End-to-end test of the full HTTP flow. Thanks to the ports, we override the real
 * store (Prisma) with the in-memory one: the e2e does NOT depend on an external DB
 * and still exercises the controller, the Zod pipe, cache-aside and the redirect.
 * The real integration with Postgres is covered in
 * prisma-url-store.integration.spec.ts.
 */
describe('URL Shortener (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(URL_STORE)
      .useClass(InMemoryUrlStore)
      // Empty stub: with no real Prisma store, we do not want it to try to connect to the DB.
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /shorten -> GET /:code redirects 301 to the original', async () => {
    const longUrl = 'https://example.com/some/very/long/path?with=query';

    const created = await request(app.getHttpServer())
      .post('/shorten')
      .send({ longUrl })
      .expect(201);

    expect(created.body.shortUrl).toMatch(
      /^http:\/\/localhost:3000\/[0-9A-Za-z]+$/,
    );

    const code = String(created.body.shortUrl).split('/').pop();

    const redirect = await request(app.getHttpServer())
      .get(`/${code}`)
      .expect(301);

    expect(redirect.headers.location).toBe(longUrl);
  });

  it('GET /:code that does not exist -> 404', async () => {
    await request(app.getHttpServer()).get('/doesNotExist').expect(404);
  });

  it('POST /shorten with an invalid longUrl -> 400 (Zod message)', async () => {
    const res = await request(app.getHttpServer())
      .post('/shorten')
      .send({ longUrl: 'not-a-valid-url' })
      .expect(400);

    expect(JSON.stringify(res.body.message)).toContain('valid URL');
  });
});
