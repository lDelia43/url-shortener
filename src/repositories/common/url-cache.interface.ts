/**
 * Injection token for the UrlCache port (see url-store.interface.ts for why the
 * token is needed alongside the interface).
 */
export const URL_CACHE = Symbol('URL_CACHE');

/**
 * Cache port for the cache-aside pattern on reads.
 * The methods are async on purpose: if the in-memory cache is later replaced by
 * Redis (to share it across back-end instances), the service does not change.
 */
export interface UrlCache {
  /** Returns the cached longUrl for `code`, or null if it is not present. */
  get(code: string): Promise<string | null>;

  /** Stores the longUrl associated with `code`. */
  set(code: string, longUrl: string): Promise<void>;
}
