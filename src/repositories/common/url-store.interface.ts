/**
 * Injection token for the UrlStore port. TypeScript interfaces do not exist at
 * runtime, so Nest needs this token to resolve which implementation to inject
 * (wired in repositories.module.ts).
 */
export const URL_STORE = Symbol('URL_STORE');

/** A shortened link as persisted by the store. */
export interface StoredUrl {
  code: string;
  longUrl: string;
}

/**
 * Persistence port. The service depends on this interface, not on a concrete
 * implementation (Prisma or in-memory are injected by token).
 */
export interface UrlStore {
  /**
   * Returns the next value of the global counter atomically.
   * The real implementation (Postgres) guarantees that two concurrent calls never
   * receive the same number => no code collisions.
   */
  nextSequenceValue(): Promise<bigint>;

  /** Persists a new link. `code` is unique. */
  save(code: string, longUrl: string): Promise<StoredUrl>;

  /** Looks up a link by its code. Returns null if it does not exist. */
  findByCode(code: string): Promise<StoredUrl | null>;
}
