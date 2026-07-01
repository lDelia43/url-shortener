import { z } from 'zod';

/**
 * Zod schema for the POST /shorten body. It is the source of truth for runtime
 * validation. `z.string().url()` rejects anything that is not a valid URL => 400.
 */
export const shortenUrlSchema = z.object({
  longUrl: z.string().url('longUrl must be a valid URL'),
});

export type ShortenUrlInput = z.infer<typeof shortenUrlSchema>;
