-- CreateTable
CREATE TABLE "Counter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Url" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "longUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Url_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Url_code_key" ON "Url"("code");

-- Counter seed: a single row (id = 1) starting at 0.
-- This is essential because `prisma migrate deploy` does NOT run seeds, and the
-- `UPDATE "Counter" ... WHERE id = 1 RETURNING value` needs the row to exist.
INSERT INTO "Counter" ("id", "value") VALUES (1, 0);
