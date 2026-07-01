import { ApiProperty } from '@nestjs/swagger';

/**
 * "Mirror" classes used ONLY to document Swagger. The real runtime validation is
 * done by Zod (shorten-url.schema.ts); these classes exist because @nestjs/swagger
 * generates the OpenAPI schema from @ApiProperty decorators, and we chose not to
 * couple the docs to the Zod schema with extra libraries (see DESIGN.md).
 */
export class ShortenUrlDto {
  @ApiProperty({
    example: 'https://www.example.com/some/very/long/path?with=query',
    description: 'Long URL to shorten. Must be a valid URL.',
  })
  longUrl!: string;
}

export class ShortenUrlResponseDto {
  @ApiProperty({
    example: 'http://localhost:3000/b',
    description: 'Resulting short URL (BASE_URL + Base62 code).',
  })
  shortUrl!: string;
}
