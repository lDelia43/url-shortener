import { encodeBase62 } from '../src/generators/ShortCodeGenerator/short-code-generator';
import { PrismaUrlStore } from '../src/repositories/PrismaUrlStore/prisma-url-store';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * INTEGRATION test against a real Postgres (start it with `docker compose up db`).
 * It validates the design's concurrency decision: the counter lives in the DB and
 * is incremented atomically, so concurrent creations NEVER collide.
 */
describe('PrismaUrlStore (integration)', () => {
  let prisma: PrismaService;
  let store: PrismaUrlStore;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    store = new PrismaUrlStore(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean state between tests: no urls and counter reset to 0.
    await prisma.url.deleteMany();
    await prisma.$executeRaw`UPDATE "Counter" SET value = 0 WHERE id = 1`;
  });

  it('N concurrent creations generate distinct codes, no collision', async () => {
    const concurrency = 50;

    const createOne = async (): Promise<string> => {
      const sequenceValue = await store.nextSequenceValue();
      const code = encodeBase62(sequenceValue);
      await store.save(code, `https://example.com/${code}`);
      return code;
    };

    const codes = await Promise.all(
      Array.from({ length: concurrency }, () => createOne()),
    );

    // All codes are unique...
    expect(new Set(codes).size).toBe(concurrency);
    // ...and every row was persisted (no insert failed on the unique index).
    expect(await prisma.url.count()).toBe(concurrency);
  });

  it('concurrent nextSequenceValue never returns the same value', async () => {
    const concurrency = 100;

    const values = await Promise.all(
      Array.from({ length: concurrency }, () => store.nextSequenceValue()),
    );

    const uniqueValues = new Set(values.map((v) => v.toString()));
    expect(uniqueValues.size).toBe(concurrency);
  });
});
