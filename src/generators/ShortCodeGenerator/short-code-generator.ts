/**
 * Base62 encoding of the counter value into the short code.
 *
 * We chose counter + Base62 (instead of hash + truncation) because a counter that
 * never repeats a value never produces collisions: each number maps to a unique
 * code. The trade-off is that it needs a centralized point that generates the next
 * value (see Counter in the store).
 *
 * Alphabet (62 symbols): index 0->'a'..25->'z', 26->'A'..51->'Z', 52->'0'..61->'9'.
 */
const ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE = BigInt(ALPHABET.length); // 62n

/**
 * Converts a non-negative value to its Base62 representation.
 * Uses `bigint` because the counter can grow beyond Number.MAX_SAFE_INTEGER
 * (capacity 62^n) without losing precision.
 */
export function encodeBase62(value: bigint): string {
  if (value < 0n) {
    throw new Error('encodeBase62 requires a non-negative value');
  }
  if (value === 0n) {
    return ALPHABET[0];
  }

  let remaining = value;
  let code = '';
  while (remaining > 0n) {
    const index = Number(remaining % BASE);
    code = ALPHABET[index] + code;
    remaining = remaining / BASE;
  }
  return code;
}
