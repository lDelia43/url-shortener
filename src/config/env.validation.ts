import { z } from 'zod';

/**
 * Zod schema for the environment variables. It is the source of truth for config:
 * if a variable is missing or invalid, the app fails fast at startup instead of
 * blowing up later at runtime with an obscure error.
 */
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // The .env brings strings; coerce to number and provide a sane default.
  PORT: z.coerce.number().int().positive().default(3000),
  BASE_URL: z.string().url('BASE_URL must be a valid URL'),
});

/** Validated, typed config injected via ConfigService. */
export type AppConfig = z.infer<typeof envSchema>;

/**
 * `validate` function consumed by `ConfigModule.forRoot`. Nest passes the raw env
 * object (all values are strings, like `process.env`); we return the parsed one
 * (with PORT already coerced to a number). On failure we throw an error with Zod's
 * detail so startup shows exactly which variable is wrong.
 */
export function validateEnv(
  config: Record<string, string | undefined>,
): AppConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
}
