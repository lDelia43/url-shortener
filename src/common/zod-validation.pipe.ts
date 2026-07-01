import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Generic Zod-based validation pipe. It receives the schema via the constructor and
 * is applied per-route: `@Body(new ZodValidationPipe(schema))`.
 *
 * Typed with generics + `unknown` (never `any`): the input is unknown and the output
 * is typed as `T` inferred from the schema. If validation fails, it translates Zod's
 * errors into a 400 with clear messages.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      throw new BadRequestException(messages);
    }

    return result.data;
  }
}
