import { z } from 'zod';

/**
 * Zod schema for the `:code` path param of GET /:code. Base62 characters only.
 * An invalid format short-circuits with 400 before touching the store; a code with
 * a valid format but that does not exist resolves to 404 in the service.
 */
export const codeParamSchema = z
  .string()
  .regex(/^[0-9A-Za-z]+$/, 'The code may only contain Base62 characters');

export type CodeParam = z.infer<typeof codeParamSchema>;
