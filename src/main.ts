import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Graceful shutdown (SIGTERM in Docker) => Prisma releases the pool via onModuleDestroy.
  app.enableShutdownHooks();

  // Swagger at /api. It is registered BEFORE app.listen(): the Swagger routes are
  // mounted before the controller's GET /:code wildcard, so a request to /api shows
  // the UI and does not fall into the redirect.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('URL Shortener')
    .setDescription(
      'Shortens URLs and redirects (301) to the original. Counter + Base62.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
}

void bootstrap();
