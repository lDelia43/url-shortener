import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Redirect,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { codeParamSchema } from '../../common/dto/code-param.schema';
import {
  ShortenUrlDto,
  ShortenUrlResponseDto,
} from '../../common/dto/shorten-url.dto';
import {
  shortenUrlSchema,
  ShortenUrlInput,
} from '../../common/dto/shorten-url.schema';
import { UrlShortenerService } from '../../services/UrlShortenerService/url-shortener.service';

@ApiTags('url-shortener')
@Controller()
export class UrlShortenerController {
  constructor(private readonly service: UrlShortenerService) {}

  @Post('shorten')
  @ApiOperation({ summary: 'Shortens a long URL' })
  @ApiBody({ type: ShortenUrlDto })
  @ApiCreatedResponse({
    description: 'URL shortened successfully',
    type: ShortenUrlResponseDto,
  })
  @ApiBadRequestResponse({ description: 'longUrl is not a valid URL' })
  async shorten(
    @Body(new ZodValidationPipe(shortenUrlSchema)) body: ShortenUrlInput,
  ): Promise<ShortenUrlResponseDto> {
    const shortUrl = await this.service.shorten(body.longUrl);
    return { shortUrl };
  }

  @Get(':code')
  // @Redirect() with no fixed URL: the handler returns a dynamic { url, statusCode }.
  @Redirect()
  @ApiOperation({ summary: 'Redirects the short code to the original URL' })
  @ApiParam({ name: 'code', example: 'b', description: 'Base62 code' })
  @ApiResponse({
    status: 301,
    description:
      'Permanent redirect (301) to the original URL. It is permanent because we ' +
      'do not track clicks: the browser can cache it and skip the server.',
  })
  @ApiNotFoundResponse({ description: 'The code does not exist' })
  @ApiBadRequestResponse({ description: 'The code has an invalid format' })
  async redirect(
    @Param('code', new ZodValidationPipe(codeParamSchema)) code: string,
  ): Promise<{ url: string; statusCode: number }> {
    const longUrl = await this.service.resolve(code);
    return { url: longUrl, statusCode: HttpStatus.MOVED_PERMANENTLY };
  }
}
