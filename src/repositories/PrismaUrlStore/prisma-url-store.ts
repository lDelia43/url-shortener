import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StoredUrl, UrlStore } from '../common/url-store.interface';

/** Real store implementation against Postgres via Prisma. */
@Injectable()
export class PrismaUrlStore implements UrlStore {
  constructor(private readonly prisma: PrismaService) {}

  async nextSequenceValue(): Promise<bigint> {
    // `UPDATE ... RETURNING` is an atomic operation: it takes a row-lock on the
    // counter row, so two concurrent transactions serialize and each one gets a
    // distinct `value`. That is where the no-collision guarantee lives, in Postgres
    // and not in the process memory => it works with N back-end instances.
    const rows = await this.prisma.$queryRaw<{ value: bigint }[]>(
      Prisma.sql`UPDATE "Counter" SET value = value + 1 WHERE id = 1 RETURNING value`,
    );

    if (rows.length === 0) {
      // Should never happen: the counter row is seeded in the initial migration.
      throw new Error('The counter row (Counter id=1) does not exist');
    }
    return rows[0].value;
  }

  async save(code: string, longUrl: string): Promise<StoredUrl> {
    const url = await this.prisma.url.create({ data: { code, longUrl } });
    return { code: url.code, longUrl: url.longUrl };
  }

  async findByCode(code: string): Promise<StoredUrl | null> {
    const url = await this.prisma.url.findUnique({ where: { code } });
    return url ? { code: url.code, longUrl: url.longUrl } : null;
  }
}
