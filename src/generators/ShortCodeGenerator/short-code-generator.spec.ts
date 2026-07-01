import { encodeBase62 } from './short-code-generator';

describe('encodeBase62', () => {
  // Alphabet: 0->'a'..25->'z', 26->'A'..51->'Z', 52->'0'..61->'9'.
  it('encodes the boundaries of each alphabet range', () => {
    expect(encodeBase62(0n)).toBe('a'); // first symbol
    expect(encodeBase62(1n)).toBe('b');
    expect(encodeBase62(25n)).toBe('z'); // end of lowercase
    expect(encodeBase62(26n)).toBe('A'); // start of uppercase
    expect(encodeBase62(51n)).toBe('Z'); // end of uppercase
    expect(encodeBase62(52n)).toBe('0'); // start of digits
    expect(encodeBase62(61n)).toBe('9'); // last symbol (base - 1)
  });

  it('carries over to the second digit past 61', () => {
    expect(encodeBase62(62n)).toBe('ba'); // 62 = 1*62 + 0 -> 'b''a'
    expect(encodeBase62(63n)).toBe('bb');
    expect(encodeBase62(3843n)).toBe('99'); // 62^2 - 1, max 2-digit value
    expect(encodeBase62(3844n)).toBe('baa'); // 62^2, first 3-digit code
  });

  it('handles large values (beyond 2^53) without losing precision', () => {
    // 62^3 = 238328 -> 'baaa' (a leading 1 followed by zeros in base 62).
    expect(encodeBase62(238328n)).toBe('baaa');
    // Arbitrary large, verifiable value: 9_999_999_999.
    expect(encodeBase62(9_999_999_999n)).toBe('k4U8YJ');
  });

  it('rejects negative values', () => {
    expect(() => encodeBase62(-1n)).toThrow();
  });
});
