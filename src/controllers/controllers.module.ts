import { Module } from '@nestjs/common';
import { ServicesModule } from '../services/services.module';
import { UrlShortenerController } from './UrlShortenerController/url-shortener.controller';

/**
 * HTTP layer module (the one app.module imports). Declares every controller and
 * imports the services they need. It does NOT know about PrismaService or the
 * adapters — those stay encapsulated in RepositoriesModule. Add a controller here
 * and it is wired into the app.
 */
@Module({
  imports: [ServicesModule],
  controllers: [UrlShortenerController],
})
export class ControllersModule {}
